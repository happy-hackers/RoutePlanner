from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from ortools.constraint_solver import pywrapcp, routing_enums_pb2
import requests
from pydantic import BaseModel
from typing import Optional, List
from dotenv import load_dotenv
import os
from datetime import datetime

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


load_dotenv()
google_api_key = os.getenv("GOOGLE_API_KEY")

class Point(BaseModel):
    lat: float
    lng: float


class WayPoint(BaseModel):
    lat: float
    lng: float
    open: Optional[str] = None
    close: Optional[str] = None


class RouteInput(BaseModel):
    startPoint: Point
    waypoints: List[WayPoint]
    endPoint: Point



def get_time_matrix_routes_api(locations, api_key):
    url = "https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix"
    headers = {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": api_key,
        "X-Goog-FieldMask": "originIndex,destinationIndex,duration,distanceMeters,condition",
    }

    origins = [
        {"waypoint": {"location": {"latLng": {"latitude": lat, "longitude": lng}}}}
        for lat, lng in locations
    ]
    destinations = origins

    body = {"origins": origins, "destinations": destinations, "travelMode": "DRIVE"}

    resp = requests.post(url, headers=headers, json=body)
    if resp.status_code != 200:
        raise ValueError(resp.text)
    return resp.json()

def build_time_and_distance_matrices(elements, n):
    # n = number of locations
    INF = 999999
    time_matrix = [[INF] * n for _ in range(n)]
    distance_matrix = [[INF] * n for _ in range(n)]
    print("time_matrix", len(time_matrix))
    for el in elements:
        i = el["originIndex"]
        j = el["destinationIndex"]
        if el.get("condition") == "ROUTE_EXISTS":
            # for example "2230s", trim the 's'
            time_matrix[i][j] = int(el["duration"].replace("s", ""))
            distance_matrix[i][j] = el.get("distanceMeters", 0)

    return time_matrix, distance_matrix

def time_to_seconds(t: str) -> int:
    if not t:
        return 0
    dt = datetime.strptime(t, "%H:%M:%S")
    return dt.hour * 3600 + dt.minute * 60 + dt.second

def get_current_time_in_seconds():
    now = datetime.now()
    return now.hour * 3600 + now.minute * 60 + now.second

@app.post("/optimize-route")
async def time_consider_route(data: RouteInput):
    all_points = [(data.startPoint.lat, data.startPoint.lng)]  # First add start point
    time_windows = [(0, 24 * 60 * 60)]  # Start point open all day
    for wp in data.waypoints:
        all_points.append((wp.lat, wp.lng))
        open_sec = time_to_seconds(wp.open)
        close_sec = time_to_seconds(wp.close)
        print("(open_sec, close_sec)", (open_sec, close_sec))
        time_windows.append((open_sec, close_sec))
    all_points.append((data.endPoint.lat, data.endPoint.lng))
    time_windows.append((0, 24 * 60 * 60))  # End point open all day
    matrix = get_time_matrix_routes_api(all_points, google_api_key)
    num_points = 2 + len(data.waypoints)
    time_matrix, distance_matrix = build_time_and_distance_matrices(matrix, num_points)
    data = {
        "time_matrix": time_matrix,
        "num_vehicles": 1,
        "starts": [0],
        "ends": [len(time_matrix) - 1],
    }
    manager = pywrapcp.RoutingIndexManager(
        len(data["time_matrix"]), data["num_vehicles"], data["starts"], data["ends"]
    )
    routing = pywrapcp.RoutingModel(manager)

    def time_callback(from_index, to_index):
        from_node = manager.IndexToNode(from_index)
        to_node = manager.IndexToNode(to_index)
        return data["time_matrix"][from_node][to_node]

    transit_callback_index = routing.RegisterTransitCallback(
        time_callback
    )  # OR‑Tools stores the function and assigns it an internal ID number
    routing.SetArcCostEvaluatorOfAllVehicles(
        transit_callback_index
    )  # use this callback function as the cost evaluator
    
    routing.AddDimension(
        transit_callback_index,  # Travel time function
        120,  # Maximum waiting time allowed at stops (120s)
        24 * 60 * 60,  # Maximum total time per vehicle (the whole day)
        False,  # If True, forces the start time = 0; False: OR-Tools might choose to delay departure (or start earlier) if that helps it meet all time windows
        "Time",  # 	Name of the new dimension
    )
    time_dimension = routing.GetDimensionOrDie("Time")

    for location_idx, (open_time, close_time) in enumerate(time_windows):
        # Skip setting time windows for the end node
        if location_idx in data["ends"]:
            continue
        index = manager.NodeToIndex(location_idx)
        time_dimension.CumulVar(index).SetRange(open_time, close_time)
    start_index = routing.Start(0)
    time_dimension.CumulVar(start_index).SetValue(get_current_time_in_seconds()) # Set the set off time
    search_parameters = (
        pywrapcp.DefaultRoutingSearchParameters()
    )  # creates a configuration object that controls how the solver works
    search_parameters.first_solution_strategy = (
        routing_enums_pb2.FirstSolutionStrategy.PATH_CHEAPEST_ARC
    )  # solver constructs a First Solution (a basic route)
    search_parameters.local_search_metaheuristic = (
        routing_enums_pb2.LocalSearchMetaheuristic.GUIDED_LOCAL_SEARCH
    )  # Improves that route iteratively
    search_parameters.time_limit.FromSeconds(
        5
    )  # search for at most 10 seconds improving routes

    solution = routing.SolveWithParameters(search_parameters)
    if not solution:
        return {"error": "No feasible solution found within the opening time of these customers. Please select other ways"}
    route, segment_times, total_time = [], [], 0
    index = routing.Start(0)  # get the starting routing index for vehicle 0
    while not routing.IsEnd(index): # this will make "route" variable not contain the the index of the end node
        route.append(manager.IndexToNode(index))
        previous_index = index
        index = solution.Value(routing.NextVar(index))  # get the next node index
        travel_time = routing.GetArcCostForVehicle(
            previous_index, index, 0
        )  # get the travel time between current and next node
        segment_times.append(round(travel_time / 60))
        total_time += travel_time
    # Now route has start point but not end point
    route.pop(0)
    index = [x - 1 for x in route]
    total_time = round(total_time / 60)
    # Return the order of waypoints, the estimated time between each waypoints and the total time of the route
    return { "order": index, "segment_times": segment_times, "total_time": total_time }

@app.get("/")
async def root():
    return {"message": "hello"}

