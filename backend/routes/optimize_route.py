from fastapi import APIRouter
from ortools.constraint_solver import pywrapcp, routing_enums_pb2
from services.matrices import build_matrices, time_to_seconds
from datetime import datetime, timezone
from pydantic import BaseModel
from typing import Optional, List


class CoordInput(BaseModel):
    lat: float
    lng: float
    address: Optional[str] = None


class CoordinateList(BaseModel):
    coords: List[CoordInput]


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
    startTime: Optional[str] = None


router = APIRouter(prefix="/optimize-route")


@router.post("")
async def optimize(mode: str, data: RouteInput):
    if not data.startTime:
        return {"error": "Missing start time"}
    # Parse to datetime
    dt_local = datetime.fromisoformat(data.startTime)

    # Local time (with no date)
    local_time_only = dt_local.time().isoformat()

    # Convert to UTC datetime
    dt_utc = dt_local.astimezone(timezone.utc)

    start_seconds = time_to_seconds(local_time_only)
    all_points = [(data.startPoint.lat, data.startPoint.lng)]  # Firstly add start point
    for wp in data.waypoints:
        all_points.append((wp.lat, wp.lng))
    all_points.append((data.endPoint.lat, data.endPoint.lng))  # Lastly add end point
    time_matrix, distance_matrix = build_matrices(all_points, dt_utc)
    print("final_time_matrix", time_matrix)
    routing_data = {
        "time_matrix": time_matrix,
        "num_vehicles": 1,
        "starts": [0],
        "ends": [len(time_matrix) - 1],
    }
    manager = pywrapcp.RoutingIndexManager(
        len(routing_data["time_matrix"]),
        routing_data["num_vehicles"],
        routing_data["starts"],
        routing_data["ends"],
    )
    routing = pywrapcp.RoutingModel(manager)

    def time_callback(from_index, to_index):
        from_node = manager.IndexToNode(from_index)
        to_node = manager.IndexToNode(to_index)
        return routing_data["time_matrix"][from_node][to_node]

    transit_callback_index = routing.RegisterTransitCallback(
        time_callback
    )  # OR‑Tools stores the function and assigns it an internal ID number
    routing.SetArcCostEvaluatorOfAllVehicles(
        transit_callback_index
    )  # use this callback function as the cost evaluator

    if mode == "normal":
        print("Running NORMAL mode: ignoring time windows")
    if mode == "time":
        print("Running TIME-SENSITIVE mode: applying time windows")
        time_windows = [(0, 24 * 60 * 60)]  # Start point open all day
        for wp in data.waypoints:
            open_sec = time_to_seconds(wp.open)
            close_sec = time_to_seconds(wp.close)
            print("(open_sec, close_sec)", (open_sec, close_sec))
            time_windows.append((open_sec, close_sec))
        time_windows.append((0, 24 * 60 * 60))  # End point open all day

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
            if location_idx in routing_data["ends"]:
                continue
            index = manager.NodeToIndex(location_idx)
            time_dimension.CumulVar(index).SetRange(open_time, close_time)
        start_index = routing.Start(0)
        time_dimension.CumulVar(start_index).SetValue(
            start_seconds
        )  # Set the set off time
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
        return {
            "error": "No feasible solution found within the opening time of these customers. Please select other ways"
        }
    route, segment_times, total_time, total_distance = [], [], 0, 0
    index = routing.Start(0)  # get the starting routing index for vehicle 0
    while not routing.IsEnd(
        index
    ):  # this will make "route" variable not contain the the index of the end node
        route.append(manager.IndexToNode(index))
        previous_index = index
        index = solution.Value(routing.NextVar(index))  # get the next node index
        travel_time = routing.GetArcCostForVehicle(
            previous_index, index, 0
        )  # get the travel time between current and next node
        from_node = manager.IndexToNode(previous_index)
        to_node = manager.IndexToNode(index)
        travel_distance = distance_matrix[from_node][to_node]
        total_distance += travel_distance
        segment_times.append(round(travel_time / 60))
        total_time += travel_time
    # Now route has start point but not end point
    print("segment_times", segment_times)
    route.pop(0)
    index = [x - 1 for x in route]
    total_time = round(total_time / 60)
    # Return the order of waypoints, the estimated time between each waypoints and the total time of the route
    return {
        "order": index,
        "segmentTimes": segment_times,
        "totalTime": total_time,
        "totalDistance": total_distance,
    }
