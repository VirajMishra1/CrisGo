from typing import List, Optional
from datetime import datetime, timedelta
import math

from sqlalchemy.orm import Session
from app.models import Signal, Incident
from app.config import settings
from app.services.opik_logging import log_credibility_decision


DISASTER_KEYWORDS = {
    "fire": ["fire", "smoke", "flames"],
    "flood": ["flood", "water rising", "flash flood"],
    "accident": ["accident", "crash", "collision"],
    "shooting": ["shooting", "gunshots"],
    "blackout": ["blackout", "power outage", "no power"],
}


def simple_credibility_score(text: str, severity: int = 1, corroborations: int = 0) -> float:
    base = 0.2
    text_lower = text.lower()
    keyword_bonus = 0.0
    for _, kws in DISASTER_KEYWORDS.items():
        if any(k in text_lower for k in kws):
            keyword_bonus = 0.3
            break
    severity_bonus = min(0.2, 0.04 * max(1, min(severity, 5)))
    corroboration_bonus = min(0.5, 0.2 * corroborations)
    score = base + keyword_bonus + severity_bonus + corroboration_bonus
    return max(0.0, min(1.0, score))


def haversine_m(lat1, lon1, lat2, lon2):
    R = 6371_000
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c


def find_near_duplicates(db: Session, incident: Incident, within_minutes: int = 30, within_meters: float = 200.0) -> List[Incident]:
    window_start = (incident.start_time or incident.created_at or datetime.utcnow()) - timedelta(minutes=within_minutes)
    candidates = (
        db.query(Incident)
        .filter(Incident.type == incident.type)
        .filter(Incident.created_at >= window_start)
        .all()
    )
    dupes = []
    for cand in candidates:
        dist_m = haversine_m(incident.lat, incident.lon, cand.lat, cand.lon)
        if dist_m <= within_meters:
            dupes.append(cand)
    return dupes


def merge_incident(db: Session, incident: Incident) -> Incident:
    dupes = find_near_duplicates(db, incident)
    if not dupes:
        db.add(incident)
        db.commit()
        db.refresh(incident)
        try:
            log_credibility_decision(
                signal={"id": incident.signal_id},
                extracted={"type": incident.type, "severity": incident.severity, "location": [incident.lat, incident.lon]},
                corroborations=[],
                score=incident.credibility,
                decision=incident.status,
            )
        except Exception:
            pass
        return incident

    # Merge: pick highest severity/credibility, keep earliest start_time, average location
    all_incidents = [incident] + dupes
    best_severity = max(i.severity for i in all_incidents)
    best_cred = max(i.credibility for i in all_incidents)
    avg_lat = sum(i.lat for i in all_incidents) / len(all_incidents)
    avg_lon = sum(i.lon for i in all_incidents) / len(all_incidents)
    start_times = [i.start_time for i in all_incidents if i.start_time]
    merged_start = min(start_times) if start_times else None

    # Update the first duplicate and remove the rest
    primary = dupes[0]
    primary.severity = best_severity
    primary.credibility = best_cred
    primary.lat = avg_lat
    primary.lon = avg_lon
    primary.start_time = merged_start
    primary.updated_at = datetime.utcnow()
    db.commit()
    try:
        log_credibility_decision(
            signal={"id": primary.signal_id},
            extracted={"type": primary.type, "severity": primary.severity, "location": [primary.lat, primary.lon]},
            corroborations=[{"merged_count": len(all_incidents)}],
            score=primary.credibility,
            decision=primary.status,
        )
    except Exception:
        pass
    return primary