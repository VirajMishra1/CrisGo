from typing import Optional, Tuple
import httpx


async def geocode_query(query: str) -> Optional[Tuple[float, float]]:
    url = "https://nominatim.openstreetmap.org/search"
    params = {"format": "json", "q": query, "limit": 1}
    headers = {"User-Agent": "DisasterSafetyDemo/1.0"}
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(url, params=params, headers=headers)
            resp.raise_for_status()
            data = resp.json()
            if data:
                lat = float(data[0]["lat"])
                lon = float(data[0]["lon"])
                return (lat, lon)
            return None
    except Exception:
        return None