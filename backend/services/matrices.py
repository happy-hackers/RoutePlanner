from core.supabase_client import supabase
from services.google_service import get_matrix_from_google_batched
from datetime import datetime, timedelta

INF = 9999999


def build_time_and_distance_matrices(elements, n):
    # n = number of locations
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


def build_matrices_from_supabase(points, target_time_str):
    """
    Build time & distance matrices by fetching paths from Supabase 'path_calculations'.
    Each record: (start_lat, start_lng, end_lat, end_lng, duration, distance).
    """
    print("Fetching travel data from Supabase...")
    # Transfer the UTC string to time seconds
    start_seconds = time_to_seconds(target_time_str)

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
            # Choose the record whose target_utc_time is closest to current start time
            best = min(
                recs,
                key=lambda r: abs(
                    time_to_seconds(str(r["target_utc_time"])) - start_seconds
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


def store_matrix_into_DB(time_matrix, distance_matrix, locations, target_time_str):
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
                    "target_utc_time": target_time_str,
                }
            )

    # upsert into Supabase
    if upsert_rows:
        resp = (
            supabase.table("path_calculations")
            .upsert(
                upsert_rows,
                on_conflict=("start_lat,start_lng,end_lat,end_lng,target_utc_time"),
            )
            .execute()
        )
        count = len(upsert_rows)
        print(f"Upserted {count} rows for time {target_time_str}")


def build_matrices(points, departure_dt):
    print("Build matrices...")
    utc_time_str = departure_dt.time().isoformat()
    time_matrix, distance_matrix = build_matrices_from_supabase(points, utc_time_str)
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
        # Add 1 minute to departure_dt to avoid Google API error "Timestamp must be set to a future time"
        departure_dt_future = departure_dt + timedelta(minutes=1)
        google_matrix = get_matrix_from_google_batched(
            unique_points,
            departure_time=departure_dt_future.isoformat(),
        )
        google_time_matrix, google_distance_matrix = build_time_and_distance_matrices(
            google_matrix, len(unique_points)
        )
        print("google_time_matrix", google_time_matrix)

        store_matrix_into_DB(
            google_time_matrix, google_distance_matrix, unique_points, utc_time_str
        )

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
