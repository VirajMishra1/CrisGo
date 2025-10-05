from typing import List, Dict
from datetime import datetime, timedelta
import random

from sqlalchemy.orm import Session

from app.models import ScrapedItem, NYIncident, NYSource
from app.services.credibility_agent import credibility_score


def clear_scraped_items(db: Session) -> None:
    try:
        db.query(ScrapedItem).delete()
        db.commit()
    except Exception:
        db.rollback()


def clear_ny_incidents(db: Session) -> None:
    try:
        db.query(NYIncident).delete()
        db.commit()
    except Exception:
        db.rollback()


def _nyc_spots() -> List[Dict]:
    # Representative points distributed across NYC boroughs
    return [
        {"name": "Manhattan - Times Square", "lat": 40.7580, "lon": -73.9855},
        {"name": "Manhattan - Central Park", "lat": 40.7829, "lon": -73.9654},
        {"name": "Brooklyn - Downtown", "lat": 40.6939, "lon": -73.9850},
        {"name": "Brooklyn - Williamsburg", "lat": 40.7081, "lon": -73.9571},
        {"name": "Queens - Flushing", "lat": 40.7675, "lon": -73.8331},
        {"name": "Queens - Long Island City", "lat": 40.7440, "lon": -73.9489},
        {"name": "Bronx - Fordham", "lat": 40.8590, "lon": -73.8929},
        {"name": "Bronx - Highbridge", "lat": 40.8360, "lon": -73.9220},
        {"name": "Staten Island - St. George", "lat": 40.6441, "lon": -74.0721},
        {"name": "Staten Island - New Dorp", "lat": 40.5715, "lon": -74.1174},
        {"name": "Manhattan - Financial District", "lat": 40.7075, "lon": -74.0113},
        {"name": "Brooklyn - Sunset Park", "lat": 40.6453, "lon": -74.0129},
        {"name": "Queens - Astoria", "lat": 40.7645, "lon": -73.9235},
        {"name": "Bronx - Mott Haven", "lat": 40.8090, "lon": -73.9229},
        {"name": "Manhattan - Harlem", "lat": 40.8116, "lon": -73.9465},
    ]


def _mock_types() -> List[str]:
    return [
        "fire breakout",
        "shooting",
        "road blocker",
        "accident",
        "assault",
        "explosion",
    ]


def generate_mock_ny_incidents(count: int = 150) -> List[Dict]:
    spots = _nyc_spots()
    kinds = _mock_types()
    incidents: List[Dict] = []
    now = datetime.utcnow()
    for i in range(count):
        spot = spots[i % len(spots)]
        kind = kinds[i % len(kinds)]
        # Jitter around the spot for broader distribution across NYC
        lat = spot["lat"] + random.uniform(-0.01, 0.01)
        lon = spot["lon"] + random.uniform(-0.01, 0.01)
        # Time spread over last 72 hours
        minutes_ago = random.randint(10, 72 * 60)
        t = now - timedelta(minutes=minutes_ago)
        summary = f"{kind.title()} near {spot['name']} reported by local sources."
        incidents.append({
            "lat": round(lat, 6),
            "lon": round(lon, 6),
            "time": t,
            "summary": summary,
            "source": random.choice([
                "NYPD", "FDNY", "NYC DOT", "NYC OEM",
                "CBS New York", "NBC New York", "ABC7NY",
                "Gothamist", "NY1", "NYPost", "Daily News",
                "CitizenApp", "Scanner", "Local Blog",
            ]),
        })
    return incidents


def save_ny_incidents(db: Session, incidents: List[Dict]) -> int:
    saved = 0
    for it in incidents:
        row = NYIncident(
            lat=float(it["lat"]),
            lon=float(it["lon"]),
            time=it["time"],
            summary=it.get("summary", "NY incident"),
            source=it.get("source"),
        )
        db.add(row)
        saved += 1
    db.commit()
    return saved


def generate_source_entries(base: List[Dict], min_per_incident: int = 15, max_per_incident: int = 25) -> List[Dict]:
    sources_pool = [
        # Official and agencies
        "NYPD", "FDNY", "NYC DOT", "NYC OEM", "MTA", "NYC Mayor's Office",
        # Major and local news outlets
        "CBS New York", "NBC New York", "ABC7NY", "NY1", "Gothamist", "AMNY", "The City",
        "PIX11", "WABC 7", "WNBC 4",
        # Borough/local papers
        "Brooklyn Paper", "Queens Chronicle", "Bronx Times", "Staten Island Advance",
        # Community / apps
        "NYPost", "Daily News", "CitizenApp", "Scanner", "Local Blog",
    ]
    entries: List[Dict] = []
    for it in base:
        n = random.randint(min_per_incident, max_per_incident)
        for _ in range(n):
            s = random.choice(sources_pool)
            entries.append({
                "lat": it["lat"],
                "lon": it["lon"],
                "time": it["time"],
                "summary": it["summary"],
                "source": s,
            })
    return entries


def save_ny_sources(db: Session, base_rows: List[NYIncident], entries: List[Dict]) -> int:
    saved = 0
    # Build quick index by lat/lon/time match to incident_id
    # Since we created base rows, map by rounded lat/lon and time equality
    idx = {}
    for r in base_rows:
        key = (round(r.lat, 6), round(r.lon, 6), r.time.replace(microsecond=0))
        idx[key] = r.id
    for e in entries:
        key = (round(e["lat"], 6), round(e["lon"], 6), e["time"].replace(microsecond=0))
        incident_id = idx.get(key)
        row = NYSource(
            incident_id=incident_id,
            lat=float(e["lat"]),
            lon=float(e["lon"]),
            time=e["time"],
            summary=e.get("summary", "NY incident"),
            source=e.get("source"),
        )
        db.add(row)
        saved += 1
    db.commit()
    return saved


def init_ny_incidents(db: Session) -> Dict:
    # Remove prior scraped showcase data
    clear_scraped_items(db)
    # Reset NY incidents
    clear_ny_incidents(db)
    # Generate base incidents (100-150)
    mock = generate_mock_ny_incidents(150)
    saved = save_ny_incidents(db, mock)
    # Fetch saved base rows
    base_rows = db.query(NYIncident).order_by(NYIncident.time.desc()).limit(500).all()
    # Generate rich source entries (3000+)
    entries = generate_source_entries([
        {"lat": r.lat, "lon": r.lon, "time": r.time, "summary": r.summary}
        for r in base_rows
    ], min_per_incident=15, max_per_incident=25)
    saved_sources = save_ny_sources(db, base_rows, entries)
    return {"saved_incidents": saved, "saved_sources": saved_sources}


def list_ny_sources_json(db: Session) -> List[Dict]:
    rows = db.query(NYSource).order_by(NYSource.time.desc()).limit(5000).all()
    return [
        {
            "Where": {"lat": r.lat, "long": r.lon},
            "Time": r.time.isoformat() + "Z",
            "Summary": r.summary,
            "Source": r.source,
        }
        for r in rows
    ]


def list_ny_incidents_json(db: Session) -> List[Dict]:
    # Aggregate credibility by incident using linked sources
    incidents = db.query(NYIncident).order_by(NYIncident.time.desc()).limit(500).all()
    out: List[Dict] = []
    for inc in incidents:
        sources = db.query(NYSource).filter(NYSource.incident_id == inc.id).limit(100).all()
        src_names = [s.source or "Local Blog" for s in sources]
        cred = credibility_score(src_names)
        out.append({
            "Where": {"lat": inc.lat, "long": inc.lon},
            "Time": inc.time.isoformat() + "Z",
            "Summary": inc.summary,
            "Credibility": cred,
        })
    return out