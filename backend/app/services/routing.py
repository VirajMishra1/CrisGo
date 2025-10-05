from typing import List, Tuple, Dict, Any
import httpx
import math

from app.config import settings
from app.services.opik_logging import log_route_decision


def haversine_m(lat1, lon1, lat2, lon2):
    R = 6371_000
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c


async def osrm_routes(origin: Tuple[float, float], destination: Tuple[float, float], alternatives: bool = True) -> List[Dict[str, Any]]:
    # OSRM expects lon,lat
    o_lat, o_lon = origin
    d_lat, d_lon = destination
    url = (
        f"{settings.osrm_base_url}/route/v1/driving/{o_lon},{o_lat};{d_lon},{d_lat}"
        f"?alternatives={'true' if alternatives else 'false'}&overview=full&geometries=geojson"
    )
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.get(url)
        resp.raise_for_status()
        data = resp.json()
        return data.get("routes", [])


def safety_penalty_for_route(route_coords: List[Tuple[float, float]], incidents: List[Dict[str, float]]) -> float:
    radius = settings.danger_radius_m
    penalty = 0.0
    for lat, lon in route_coords:
        for inc in incidents:
            dist_m = haversine_m(lat, lon, inc["lat"], inc["lon"])
            if dist_m <= radius:
                penalty += (inc["credibility"] * inc["severity"])  # simple additive penalty
    return penalty


async def choose_safest_route(origin: Tuple[float, float], destination: Tuple[float, float], incidents: List[Dict[str, float]]):
    routes = await osrm_routes(origin, destination, alternatives=True)
    if not routes:
        return []
    scored = []
    for r in routes:
        coords = [(lat, lon) for lon, lat in r["geometry"]["coordinates"]]
        penalty = safety_penalty_for_route(coords, incidents)
        scored.append({
            "coordinates": coords,
            "distance_m": r.get("distance", 0.0),
            "duration_s": r.get("duration", 0.0),
            "safety_penalty": penalty,
        })
    # Choose route with smallest (distance + penalty * 1000) to strongly prefer safety
    best_index = min(range(len(scored)), key=lambda i: scored[i]["distance_m"] + scored[i]["safety_penalty"] * 1000)
    reason = "Chosen route minimizes distance while avoiding nearby incidents"
    try:
        log_route_decision(origin, destination, incidents, best_index, reason, scored)
    except Exception:
        pass
    return best_index, reason, scored