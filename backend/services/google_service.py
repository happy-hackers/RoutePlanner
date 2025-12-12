import time
import requests
from core.config import GOOGLE_API_KEY


def get_matrix_from_google_batched(locations, departure_time: str = None):
    """
    Calls Google Routes Distance Matrix API in batches (max 100 elements = 10*10)
    so it can handle larger address lists.
    Returns a single combined JSON list compatible with build_time_and_distance_matrices().
    """
    url = "https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix"
    headers = {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": GOOGLE_API_KEY,
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
