"""
Real data ingestion from free public APIs — no API keys required.

Sources:
  1. USGS Earthquake API — real-time seismic data worldwide
  2. NWS Weather Alerts — NOAA severe weather for US states
  3. NYC 311 Open Data (SODA API) — complaints, hazards, infrastructure
  4. GDACS — Global Disaster Alerts (RSS/XML feed)
"""

import asyncio
import hashlib
import re
import xml.etree.ElementTree as ET
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime, timedelta
import httpx
import feedparser

from app.services.geocoding import geocode_query


HEADERS = {"User-Agent": "CrisGo-CrisisNav/1.0 (viraj.mishra.81@gmail.com)"}
TIMEOUT = httpx.Timeout(15.0)


async def fetch_usgs_earthquakes(
    min_magnitude: float = 1.0,
    period: str = "day",
) -> List[Dict[str, Any]]:
    """Fetch real earthquake data from USGS. Free, no auth."""
    url = f"https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_{period}.geojson"
    try:
        async with httpx.AsyncClient(timeout=TIMEOUT, headers=HEADERS) as client:
            resp = await client.get(url)
            resp.raise_for_status()
            data = resp.json()

        incidents = []
        for feature in data.get("features", []):
            props = feature.get("properties", {})
            geom = feature.get("geometry", {})
            coords = geom.get("coordinates", [0, 0, 0])
            mag = props.get("mag", 0) or 0

            if mag < min_magnitude:
                continue

            incidents.append({
                "id": f"usgs_{feature.get('id', '')}",
                "type": "earthquake",
                "title": props.get("title", f"M{mag} Earthquake"),
                "description": f"Magnitude {mag} earthquake. {props.get('place', '')}. Depth: {coords[2]:.1f}km.",
                "lat": coords[1],
                "lng": coords[0],
                "severity": "high" if mag >= 4.5 else "medium" if mag >= 3.0 else "low",
                "source": "USGS",
                "source_type": "official",
                "source_url": props.get("url", ""),
                "timestamp": datetime.utcfromtimestamp(
                    (props.get("time", 0) or 0) / 1000
                ).isoformat() + "Z",
                "raw_magnitude": mag,
            })

        return incidents
    except Exception as e:
        print(f"[ingest] USGS fetch error: {e}")
        return []


async def fetch_nws_alerts(state: str = "NY") -> List[Dict[str, Any]]:
    """Fetch real weather alerts from National Weather Service. Free, no auth."""
    url = f"https://api.weather.gov/alerts/active?area={state}"
    try:
        nws_headers = {**HEADERS, "Accept": "application/geo+json"}
        async with httpx.AsyncClient(timeout=TIMEOUT, headers=nws_headers) as client:
            resp = await client.get(url)
            resp.raise_for_status()
            data = resp.json()

        incidents = []
        for feature in data.get("features", []):
            props = feature.get("properties", {})
            geom = feature.get("geometry")

            # Extract centroid from geometry if available
            lat, lng = 40.7128, -74.0060  # NYC default
            if geom and geom.get("coordinates"):
                coords = geom["coordinates"]
                if geom["type"] == "Point":
                    lng, lat = coords[0], coords[1]
                elif geom["type"] == "Polygon" and coords:
                    ring = coords[0]
                    lat = sum(c[1] for c in ring) / len(ring)
                    lng = sum(c[0] for c in ring) / len(ring)

            severity_map = {
                "Extreme": "high",
                "Severe": "high",
                "Moderate": "medium",
                "Minor": "low",
                "Unknown": "low",
            }
            nws_severity = props.get("severity", "Unknown")

            event = props.get("event", "Weather Alert")
            type_map = {
                "Flood": "flooding",
                "Flash Flood": "flooding",
                "Tornado": "hazard",
                "Severe Thunderstorm": "hazard",
                "Winter Storm": "hazard",
                "Blizzard": "hazard",
                "Hurricane": "hazard",
                "Fire Weather": "fire",
                "Red Flag": "fire",
                "Heat": "hazard",
                "Wind": "hazard",
            }
            incident_type = "hazard"
            for key, val in type_map.items():
                if key.lower() in event.lower():
                    incident_type = val
                    break

            incidents.append({
                "id": f"nws_{props.get('id', '')}",
                "type": incident_type,
                "title": f"{event} — {props.get('areaDesc', '')[:80]}",
                "description": (props.get("headline", "") or props.get("description", ""))[:500],
                "lat": lat,
                "lng": lng,
                "severity": severity_map.get(nws_severity, "low"),
                "source": "National Weather Service",
                "source_type": "official",
                "source_url": "https://alerts.weather.gov",
                "timestamp": props.get("onset") or props.get("sent") or datetime.utcnow().isoformat() + "Z",
            })

        return incidents
    except Exception as e:
        print(f"[ingest] NWS fetch error: {e}")
        return []


async def fetch_nyc_311(limit: int = 200) -> List[Dict[str, Any]]:
    """Fetch real 311 complaints from NYC Open Data (SODA API). Free, no auth."""
    since = (datetime.utcnow() - timedelta(days=7)).strftime("%Y-%m-%dT00:00:00")
    url = (
        f"https://data.cityofnewyork.us/resource/erm2-nwe9.json"
        f"?$where=created_date>'{since}' AND latitude IS NOT NULL"
        f"&$order=created_date DESC"
        f"&$limit={limit}"
    )
    try:
        async with httpx.AsyncClient(timeout=TIMEOUT, headers=HEADERS) as client:
            resp = await client.get(url)
            resp.raise_for_status()
            data = resp.json()

        type_map = {
            "noise": "traffic",
            "blocked driveway": "road_closure",
            "street condition": "hazard",
            "water system": "flooding",
            "sewer": "flooding",
            "pothole": "hazard",
            "traffic signal": "traffic",
            "street light": "power_outage",
            "fire": "fire",
            "gas": "gas_leak",
            "building": "building_collapse",
            "scaffolding": "hazard",
            "sidewalk": "hazard",
            "tree": "hazard",
            "electric": "power_outage",
        }

        incidents = []
        for item in data:
            complaint = (item.get("complaint_type") or "").lower()
            descriptor = (item.get("descriptor") or "").lower()
            combined = f"{complaint} {descriptor}"

            incident_type = "hazard"
            for key, val in type_map.items():
                if key in combined:
                    incident_type = val
                    break

            lat = float(item.get("latitude", 0))
            lng = float(item.get("longitude", 0))
            if lat == 0 or lng == 0:
                continue

            borough = item.get("borough", "")
            street = item.get("street_name") or item.get("incident_address") or ""

            incidents.append({
                "id": f"nyc311_{item.get('unique_key', '')}",
                "type": incident_type,
                "title": f"{item.get('complaint_type', 'Complaint')} — {street}, {borough}",
                "description": f"{item.get('complaint_type', '')}: {item.get('descriptor', '')}. Status: {item.get('status', 'Open')}.",
                "lat": lat,
                "lng": lng,
                "severity": "medium" if item.get("status") == "Open" else "low",
                "source": "NYC 311 Open Data",
                "source_type": "official",
                "source_url": "https://data.cityofnewyork.us",
                "timestamp": item.get("created_date", datetime.utcnow().isoformat() + "Z"),
            })

        return incidents
    except Exception as e:
        print(f"[ingest] NYC 311 fetch error: {e}")
        return []


async def fetch_gdacs_disasters() -> List[Dict[str, Any]]:
    """Fetch real global disaster alerts from GDACS RSS feed. Free, no auth."""
    url = "https://www.gdacs.org/xml/rss.xml"
    try:
        async with httpx.AsyncClient(timeout=TIMEOUT, headers=HEADERS, follow_redirects=True) as client:
            resp = await client.get(url)
            resp.raise_for_status()

        root = ET.fromstring(resp.text)
        ns = {"gdacs": "http://www.gdacs.org", "geo": "http://www.w3.org/2003/01/geo/wgs84_pos#"}

        incidents = []
        for item in root.findall(".//item"):
            title = item.findtext("title", "")
            desc = item.findtext("description", "")
            link = item.findtext("link", "")
            pub_date = item.findtext("pubDate", "")

            lat_el = item.find("geo:lat", ns)
            lng_el = item.find("geo:long", ns)

            lat = float(lat_el.text) if lat_el is not None and lat_el.text else None
            lng = float(lng_el.text) if lng_el is not None and lng_el.text else None

            if lat is None or lng is None:
                continue

            alert_level = (item.findtext("gdacs:alertlevel", "", ns) or "").lower()
            severity_map = {"red": "high", "orange": "high", "green": "low"}
            severity = severity_map.get(alert_level, "medium")

            title_lower = title.lower()
            if "earthquake" in title_lower:
                inc_type = "earthquake"
            elif "flood" in title_lower:
                inc_type = "flooding"
            elif any(w in title_lower for w in ("cyclone", "hurricane", "typhoon")):
                inc_type = "hazard"
            elif "volcano" in title_lower:
                inc_type = "fire"
            else:
                inc_type = "hazard"

            incidents.append({
                "id": f"gdacs_{hash(link) % 100000}",
                "type": inc_type,
                "title": title[:120],
                "description": desc[:500] if desc else title,
                "lat": lat,
                "lng": lng,
                "severity": severity,
                "source": "GDACS",
                "source_type": "official",
                "source_url": link,
                "timestamp": pub_date or datetime.utcnow().isoformat() + "Z",
            })

        return incidents
    except Exception as e:
        print(f"[ingest] GDACS fetch error: {e}")
        return []


CRISIS_KEYWORDS = [
    "fire", "flood", "shooting", "accident", "crash", "explosion",
    "gas leak", "power outage", "collapse", "emergency", "evacuation",
]

KEYWORD_TYPE_MAP = {
    "fire": "fire",
    "flood": "flooding",
    "shooting": "shooting",
    "accident": "accident",
    "crash": "accident",
    "explosion": "explosion",
    "gas leak": "gas_leak",
    "power outage": "power_outage",
    "collapse": "building_collapse",
    "emergency": "hazard",
    "evacuation": "hazard",
}

_NYC_LOCATION_PATTERNS = re.compile(
    r"(?:in|at|near|on|around)\s+([\w\s]+(?:street|st|avenue|ave|blvd|boulevard|road|rd|bridge|tunnel|park|square|heights|village|harlem|bronx|brooklyn|queens|manhattan|staten island|midtown|downtown|uptown|soho|tribeca|astoria|flushing|williamsburg|bushwick|bed-stuy|east village|west village|lower east side|upper east side|upper west side|chelsea|hells kitchen|financial district|chinatown|little italy|long island city))",
    re.IGNORECASE,
)


def _extract_location(text: str) -> Optional[str]:
    match = _NYC_LOCATION_PATTERNS.search(text)
    if match:
        return match.group(1).strip() + ", NYC"
    return None


def _match_crisis_keyword(text: str) -> Optional[str]:
    text_lower = text.lower()
    for kw in CRISIS_KEYWORDS:
        if kw in text_lower:
            return kw
    return None


async def fetch_reddit_nyc(limit: int = 50) -> List[Dict[str, Any]]:
    """Fetch crisis-related posts from r/nyc and r/newyorkcity. Free, no auth."""
    subreddits = ["nyc", "newyorkcity"]
    reddit_headers = {**HEADERS, "User-Agent": "CrisGo-CrisisNav/1.0"}
    incidents: List[Dict[str, Any]] = []

    try:
        async with httpx.AsyncClient(timeout=TIMEOUT, headers=reddit_headers) as client:
            for sub in subreddits:
                url = f"https://www.reddit.com/r/{sub}/new.json?limit={limit}"
                resp = await client.get(url)
                resp.raise_for_status()
                data = resp.json()

                for child in data.get("data", {}).get("children", []):
                    post = child.get("data", {})
                    title = post.get("title", "")
                    selftext = post.get("selftext", "")
                    combined = f"{title} {selftext}"

                    keyword = _match_crisis_keyword(combined)
                    if not keyword:
                        continue

                    incident_type = KEYWORD_TYPE_MAP.get(keyword, "hazard")

                    lat, lng = 0.0, 0.0
                    location_hint = _extract_location(combined)
                    if location_hint:
                        coords = await geocode_query(location_hint)
                        if coords:
                            lat, lng = coords

                    created_utc = post.get("created_utc", 0)
                    timestamp = datetime.utcfromtimestamp(created_utc).isoformat() + "Z" if created_utc else datetime.utcnow().isoformat() + "Z"

                    incidents.append({
                        "id": f"reddit_{post.get('id', '')}",
                        "type": incident_type,
                        "title": title[:120],
                        "description": (selftext[:500] if selftext else title),
                        "lat": lat,
                        "lng": lng,
                        "severity": "high" if keyword in ("shooting", "explosion", "collapse") else "medium",
                        "source": "Reddit",
                        "source_type": "social",
                        "source_url": f"https://www.reddit.com{post.get('permalink', '')}",
                        "timestamp": timestamp,
                    })

                # Respect Reddit rate limit: 1 req/sec
                await asyncio.sleep(1.0)

        return incidents
    except Exception as e:
        print(f"[ingest] Reddit fetch error: {e}")
        return []


async def fetch_google_news_nyc() -> List[Dict[str, Any]]:
    """Fetch NYC crisis news from Google News RSS. Free, no auth."""
    url = "https://news.google.com/rss/search?q=NYC+emergency+OR+incident+OR+fire+OR+flood&hl=en-US&gl=US&ceid=US:en"
    try:
        async with httpx.AsyncClient(timeout=TIMEOUT, headers=HEADERS, follow_redirects=True) as client:
            resp = await client.get(url)
            resp.raise_for_status()

        feed = feedparser.parse(resp.text)
        incidents: List[Dict[str, Any]] = []

        for entry in feed.entries:
            title = getattr(entry, "title", "")
            link = getattr(entry, "link", "")
            published = getattr(entry, "published", "")
            description = getattr(entry, "summary", title)

            # Determine incident type from title
            keyword = _match_crisis_keyword(title)
            incident_type = KEYWORD_TYPE_MAP.get(keyword, "hazard") if keyword else "hazard"

            # Try to parse published date to ISO
            timestamp = datetime.utcnow().isoformat() + "Z"
            if published:
                try:
                    from email.utils import parsedate_to_datetime
                    dt = parsedate_to_datetime(published)
                    timestamp = dt.isoformat() + "Z"
                except Exception:
                    pass

            lat, lng = 0.0, 0.0
            location_hint = _extract_location(title)
            if location_hint:
                coords = await geocode_query(location_hint)
                if coords:
                    lat, lng = coords

            entry_id = hashlib.md5(link.encode()).hexdigest()[:12]

            incidents.append({
                "id": f"gnews_{entry_id}",
                "type": incident_type,
                "title": title[:120],
                "description": description[:500] if description else title,
                "lat": lat,
                "lng": lng,
                "severity": "medium",
                "source": "Google News",
                "source_type": "news",
                "source_url": link,
                "timestamp": timestamp,
            })

        return incidents
    except Exception as e:
        print(f"[ingest] Google News fetch error: {e}")
        return []


async def fetch_all_incidents(
    nyc_only: bool = False,
    include_global: bool = True,
) -> List[Dict[str, Any]]:
    """Aggregate incidents from all free data sources concurrently."""
    tasks = [
        fetch_nws_alerts("NY"),
        fetch_nyc_311(200),
        fetch_usgs_earthquakes(min_magnitude=1.0, period="day"),
        fetch_reddit_nyc(),
        fetch_google_news_nyc(),
    ]
    if include_global:
        tasks.append(fetch_gdacs_disasters())

    results = await asyncio.gather(*tasks, return_exceptions=True)

    all_incidents: List[Dict[str, Any]] = []
    for result in results:
        if isinstance(result, list):
            all_incidents.extend(result)
        elif isinstance(result, Exception):
            print(f"[ingest] Source failed: {result}")

    # Deduplicate by ID
    seen = set()
    deduped = []
    for inc in all_incidents:
        if inc["id"] not in seen:
            seen.add(inc["id"])
            deduped.append(inc)

    print(f"[ingest] Fetched {len(deduped)} total incidents from {len(tasks)} sources")
    return deduped


# Legacy compat aliases used in routes.py
async def run_ingestion(*args, **kwargs):
    return await fetch_all_incidents()

async def ingest_items(*args, **kwargs):
    return await fetch_all_incidents()

async def fetch_noaa_nws_alerts(*args, **kwargs):
    return await fetch_nws_alerts()

async def fetch_usgs_quakes(*args, **kwargs):
    return await fetch_usgs_earthquakes()

async def fetch_reddit_incidents(*args, **kwargs):
    return await fetch_reddit_nyc()

async def fetch_tavily_news(*args, **kwargs):
    return []

async def run_scrape_and_summarize(*args, **kwargs):
    return await fetch_all_incidents()

def list_scraped_items(*args, **kwargs):
    return []

def get_scraped_item(*args, **kwargs):
    return None
