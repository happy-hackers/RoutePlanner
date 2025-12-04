from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from ortools.constraint_solver import pywrapcp, routing_enums_pb2
import requests
from pydantic import BaseModel
from typing import Optional, List
from dotenv import load_dotenv
import os
from datetime import datetime
from supabase import create_client, Client
import time
from datetime import datetime, timezone, timedelta

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

INF = 9999999
load_dotenv()
google_api_key = os.getenv("GOOGLE_API_KEY")
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)


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


def get_matrix_from_google_batched(locations, api_key, departure_time: str = None):
    """
    Calls Google Routes Distance Matrix API in batches (max 100 elements = 10*10)
    so it can handle larger address lists.
    Returns a single combined JSON list compatible with build_time_and_distance_matrices().
    """
    url = "https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix"
    headers = {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": api_key,
        "X-Goog-FieldMask": "originIndex,destinationIndex,duration,distanceMeters,condition",
    }

    batch_size = 10
    all_elements = []
    n = len(locations)

    for i in range(0, n, batch_size):
        origin_batch = locations[i : i + batch_size]
        for j in range(0, n, batch_size):
            destination_batch = locations[j : j + batch_size]

            origins = [
                {
                    "waypoint": {
                        "location": {"latLng": {"latitude": lat, "longitude": lng}}
                    }
                }
                for lat, lng in origin_batch
            ]
            destinations = [
                {
                    "waypoint": {
                        "location": {"latLng": {"latitude": lat, "longitude": lng}}
                    }
                }
                for lat, lng in destination_batch
            ]

            body = {
                "origins": origins,
                "destinations": destinations,
                "travelMode": "DRIVE",
                "routingPreference": "TRAFFIC_AWARE_OPTIMAL",
            }
            if departure_time:
                body["departureTime"] = departure_time

            resp = requests.post(url, headers=headers, json=body)
            if resp.status_code != 200:
                print("Google API error:", resp.text)
                continue

            sub_matrix = resp.json()

            # Each element from Google gives originIndex, destinationIndex,
            # offset those by batch positions so they merge correctly.
            for el in sub_matrix:
                el["originIndex"] += i
                el["destinationIndex"] += j
                all_elements.append(el)

            # To match QPS
            time.sleep(0.2)

    return all_elements


def build_time_and_distance_matrices(elements, n):
    # n = number of locations
    INF = 999999
    google_time_matrix = [[INF] * n for _ in range(n)]
    google_distance_matrix = [[INF] * n for _ in range(n)]
    print("time_matrix", len(google_time_matrix))
    for el in elements:
        i = el["originIndex"]
        j = el["destinationIndex"]
        if el.get("condition") == "ROUTE_EXISTS":
            # for example "2230s", trim the 's'
            google_time_matrix[i][j] = int(el["duration"].replace("s", ""))
            google_distance_matrix[i][j] = el.get("distanceMeters", 0)

    return google_time_matrix, google_distance_matrix


def build_matrices_from_supabase(points, start_seconds):
    """
    Build time & distance matrices by fetching paths from Supabase 'path_calculations'.
    Each record: (start_lat, start_lng, end_lat, end_lng, duration, distance).
    """
    print("Fetching travel data from Supabase...")
    n = len(points)
    time_matrix = [[INF] * n for _ in range(n)]
    distance_matrix = [[INF] * n for _ in range(n)]

    # Create a lookup-friendly version of points (rounded for numeric precision)
    def coord_key(lat, lng):
        return (round(float(lat), 6), round(float(lng), 6))

    key_points = [coord_key(lat, lng) for lat, lng in points]

    # Fetch all rows from Supabase (or you can later optimize filtering)
    response = supabase.table("path_calculations").select("*").execute()
    if hasattr(response, "data"):
        records = response.data
    else:
        records = response  # in case it's returned as plain list

    # Group records by coordinate pair
    grouped = {}
    for r in records:
        start = coord_key(r["start_lat"], r["start_lng"])
        end = coord_key(r["end_lat"], r["end_lng"])
        pair = (start, end)
        grouped.setdefault(pair, []).append(r)

    # Pick the record closest in time to start_time for each pair
    for (start, end), recs in grouped.items():
        if start in key_points and end in key_points:
            i = key_points.index(start)
            j = key_points.index(end)
            # Choose the record whose target_time is closest to current start time
            best = min(
                recs,
                key=lambda r: abs(
                    time_to_seconds(str(r["target_time"])) - start_seconds
                ),
            )
            time_matrix[i][j] = int(best.get("duration", INF))
            distance_matrix[i][j] = float(best.get("distance", INF))

    # Make same points' time and distance 0
    # If there are identical points, make their time and distance 0 (such as same start and end address)
    for i in range(n):
        for j in range(n):
            if i == j or key_points[i] == key_points[j]:
                time_matrix[i][j] = 0
                distance_matrix[i][j] = 0

    # For each set of duplicates, copy all row/column values from the first to the rest
    coord_indices = {}
    for idx, coord in enumerate(key_points):
        coord_indices.setdefault(coord, []).append(idx)

    for coord, indices in coord_indices.items():
        if len(indices) > 1:
            base = indices[0]  # first occurrence
            for dup in indices[1:]:
                # Copy entire row
                for j in range(n):
                    time_matrix[dup][j] = time_matrix[base][j]
                    distance_matrix[dup][j] = distance_matrix[base][j]
                # Copy entire column
                for i in range(n):
                    time_matrix[i][dup] = time_matrix[i][base]
                    distance_matrix[i][dup] = distance_matrix[i][base]

    print("matrices_from_supabase", time_matrix)
    return time_matrix, distance_matrix


def build_matrices(points, start_seconds):
    print("Build matrices...")
    time_matrix, distance_matrix = build_matrices_from_supabase(points, start_seconds)
    missing_pairs = []
    for i, (start_lat, start_lng) in enumerate(points):
        for j, (end_lat, end_lng) in enumerate(points):
            if i == j:
                continue
            if (
                time_matrix[i][j] == INF
            ):  # Use time_matrix (or distance_matrix) to check if there are missing pairs
                missing_pairs.append(((start_lat, start_lng), (end_lat, end_lng)))
    print("missing_pairs", missing_pairs)
    # If there is missing pair in Supabase, use google map api to get their matrix
    if missing_pairs:
        print(f"Fetching {len(missing_pairs)} missing pairs from Google API...")
        # Build unique list of all coordinates involved
        unique_points = list({p for pair in missing_pairs for p in pair})
        google_matrix = get_matrix_from_google_batched(unique_points, google_api_key)
        google_time_matrix, google_distance_matrix = build_time_and_distance_matrices(
            google_matrix, len(unique_points)
        )
        print("google_time_matrix", google_time_matrix)
        index_map = {p: idx for idx, p in enumerate(unique_points)}
        for start, end in missing_pairs:
            i_main = points.index(start)
            j_main = points.index(end)
            i_sub = index_map[start]
            j_sub = index_map[end]

            time_matrix[i_main][j_main] = google_time_matrix[i_sub][j_sub]
            distance_matrix[i_main][j_main] = google_distance_matrix[i_sub][j_sub]

        print("time_matrix", time_matrix)

        # For each set of duplicates, copy all row/column values from the first to the rest
        n = len(points)
        coord_indices = {}
        for idx, coord in enumerate(points):
            coord_indices.setdefault(coord, []).append(idx)

        for coord, ids in coord_indices.items():
            if len(ids) > 1:
                base = ids[0]
                for dup in ids[1:]:
                    for j in range(n):
                        time_matrix[dup][j] = time_matrix[base][j]
                        distance_matrix[dup][j] = distance_matrix[base][j]
                    for i in range(n):
                        time_matrix[i][dup] = time_matrix[i][base]
                        distance_matrix[i][dup] = distance_matrix[i][base]
    return time_matrix, distance_matrix


def time_to_seconds(t: str) -> int:
    if not t:
        return 0
    try:
        dt = datetime.strptime(t, "%H:%M:%S")
    except ValueError:
        try:
            dt = datetime.strptime(t, "%H:%M")
        except ValueError:
            print(f"Warning: Could not parse time string '{t}'. Assuming 0 seconds.")
            return 0
    return dt.hour * 3600 + dt.minute * 60 + dt.second


def get_current_time_in_seconds():
    now = datetime.now()
    return now.hour * 3600 + now.minute * 60 + now.second


@app.post("/upload-path")
async def upload_addresses(data: CoordinateList):
    coords = data.coords
    if len(coords) < 2:
        return {"success": False, "error": "Need at least 2 coordinates"}

    locations = [(c.lat, c.lng) for c in coords]

    print(f"Received {len(locations)} coordinates")

    # Use the start of tomorrow's day (UTC) as base time.
    base_time = (datetime.now(timezone.utc) + timedelta(days=1)).replace(
        hour=0, minute=0, second=0, microsecond=0
    )
    total_rows = 0

    # ---- STEP 2: Loop through each hour (00–23) ----
    for hour in range(24):
        target_time = f"{hour:02d}:00:00"
        print(f"Processing hour {target_time}...")

        # generate the RFC3339 timestamp for this hour
        departure_time = base_time.replace(hour=hour)
        departure_iso = departure_time.isoformat()

        # fetch new data from Google (hour‑specific)
        elements = get_matrix_from_google_batched(
            locations, google_api_key, departure_time=departure_iso
        )

        time_matrix, distance_matrix = build_time_and_distance_matrices(
            elements, len(locations)
        )

        # prepare batch upserts
        upsert_rows = []
        for i, (start_lat, start_lng) in enumerate(locations):
            for j, (end_lat, end_lng) in enumerate(locations):
                if i == j:
                    continue
                duration = int(time_matrix[i][j])
                if duration == INF or duration <= 0:
                    continue
                distance = round(float(distance_matrix[i][j]), 2)
                upsert_rows.append(
                    {
                        "start_lat": round(start_lat, 6),
                        "start_lng": round(start_lng, 6),
                        "end_lat": round(end_lat, 6),
                        "end_lng": round(end_lng, 6),
                        "distance": distance,
                        "duration": duration,
                        "target_time": target_time,
                    }
                )

        # upsert into Supabase for this hour
        if upsert_rows:
            resp = (
                supabase.table("path_calculations")
                .upsert(
                    upsert_rows,
                    on_conflict=("start_lat,start_lng,end_lat,end_lng,target_time"),
                )
                .execute()
            )
            count = len(upsert_rows)
            total_rows += count
            print(f"Upserted {count} rows for hour {target_time}")

    return {
        "success": True,
        "message": f"Stored 24-hour path matrices for {len(coords)} addresses.",
        "rows_inserted": total_rows,
        "count": len(coords),
        "coords": coords,
    }


@app.post("/optimize-route")
async def route_calculation(mode: str, data: RouteInput):
    if data.startTime:
        start_seconds = time_to_seconds(data.startTime)
    else:
        start_seconds = get_current_time_in_seconds()
    all_points = [(data.startPoint.lat, data.startPoint.lng)]  # Firstly add start point
    for wp in data.waypoints:
        all_points.append((wp.lat, wp.lng))
    all_points.append((data.endPoint.lat, data.endPoint.lng))  # Lastly add end point
    time_matrix, distance_matrix = build_matrices(all_points, start_seconds)
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


@app.get("/")
async def root():
    return {"message": "hello"}
