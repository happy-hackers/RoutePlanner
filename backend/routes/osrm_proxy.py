import pandas as pd
import numpy as np
from fastapi import APIRouter, HTTPException
import httpx

router = APIRouter()


@router.post("/osrm-polyline")
async def fetch_osrm_polyline(payload: dict):
    all_coords = (
        [payload["start_coord"]] + payload["ordered_waypoints"] + [payload["end_coord"]]
    )

    coord_str = ";".join([f"{c['lng']},{c['lat']}" for c in all_coords])
    osrm_url = f"https://router.project-osrm.org/route/v1/driving/{coord_str}?overview=full&geometries=geojson"

    async with httpx.AsyncClient() as client:
        resp = await client.get(osrm_url)
        try:
            resp.raise_for_status()
            data = resp.json()
        except httpx.HTTPStatusError as e:
            raise HTTPException(status_code=resp.status_code, detail=f"OSRM error: {e}")
        except ValueError as e:
            raise HTTPException(
                status_code=500, detail=f"OSRM returned invalid JSON: {resp.text}"
            )

    coords = data["routes"][0]["geometry"]["coordinates"]
    df = pd.DataFrame(coords, columns=["lng", "lat"])
    df = df[["lat", "lng"]]

    return df.to_dict(orient="records")
