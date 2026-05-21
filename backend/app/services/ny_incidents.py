"""
Real NYC incident data — powered by ingest.py's free public APIs.
No more mock data generation.
"""

from typing import List, Dict
from datetime import datetime

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


SOURCE_WEIGHTS = {
    "USGS": 1.0,
    "National Weather Service": 1.0,
    "GDACS": 0.95,
    "NYC 311 Open Data": 0.85,
}


def save_live_incidents(db: Session, incidents: List[Dict]) -> int:
    """Save real incidents from ingest.py into the DB."""
    clear_ny_incidents(db)
    saved = 0
    for inc in incidents:
        lat = inc.get("lat", 0)
        lng = inc.get("lng", 0)
        if lat == 0 or lng == 0:
            continue

        timestamp = inc.get("timestamp", "")
        try:
            if isinstance(timestamp, str) and timestamp:
                t = datetime.fromisoformat(timestamp.replace("Z", "+00:00"))
            else:
                t = datetime.utcnow()
        except Exception:
            t = datetime.utcnow()

        row = NYIncident(
            lat=float(lat),
            lon=float(lng),
            time=t,
            summary=inc.get("title", inc.get("description", "Incident")),
            source=inc.get("source", "Unknown"),
        )
        db.add(row)
        saved += 1
    db.commit()
    return saved


def init_ny_incidents(db: Session) -> Dict:
    """Initialize DB with real live data from free APIs."""
    import asyncio
    from app.services.ingest import fetch_all_incidents

    clear_scraped_items(db)
    clear_ny_incidents(db)

    try:
        loop = asyncio.new_event_loop()
        incidents = loop.run_until_complete(fetch_all_incidents(include_global=True))
        loop.close()
    except Exception as e:
        print(f"[ny_incidents] Failed to fetch live data: {e}")
        incidents = []

    saved = save_live_incidents(db, incidents)
    print(f"[ny_incidents] Saved {saved} real incidents to DB")
    return {"saved_incidents": saved, "saved_sources": 0}


def list_ny_incidents_json(db: Session) -> List[Dict]:
    """Return incidents with credibility scores."""
    incidents = db.query(NYIncident).order_by(NYIncident.time.desc()).limit(500).all()
    out: List[Dict] = []
    for inc in incidents:
        src_name = inc.source or "Unknown"
        weight = SOURCE_WEIGHTS.get(src_name, 0.7)
        cred_score = round(1.0 + weight * 4.0, 2)

        out.append({
            "Where": {"lat": inc.lat, "long": inc.lon},
            "Time": inc.time.isoformat() + "Z" if inc.time else "",
            "Summary": inc.summary,
            "Source": src_name,
            "Credibility": min(5.0, cred_score),
        })
    return out


def list_ny_sources_json(db: Session) -> List[Dict]:
    rows = db.query(NYSource).order_by(NYSource.time.desc()).limit(5000).all()
    return [
        {
            "Where": {"lat": r.lat, "long": r.lon},
            "Time": r.time.isoformat() + "Z" if r.time else "",
            "Summary": r.summary,
            "Source": r.source,
        }
        for r in rows
    ]
