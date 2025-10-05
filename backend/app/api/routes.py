from typing import List
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import Signal, Incident
from app.schemas import SignalCreate, SignalOut, IncidentCreate, IncidentOut, RouteRequest, RouteResponse, RouteLeg
from app.agents.credibility import simple_credibility_score, merge_incident
from app.services.routing import choose_safest_route
from app.services.ingest import run_ingestion, ingest_items, fetch_noaa_nws_alerts, fetch_usgs_quakes, fetch_reddit_incidents, fetch_tavily_news, run_scrape_and_summarize, list_scraped_items, get_scraped_item
from app.services.ny_incidents import list_ny_incidents_json, list_ny_sources_json
from app.services.credibility_agent import get_prompts
from app.services.opik_bot import record_prompt_experiments, record_prompt_experiments_custom, list_logs
from app.config import settings
from app.models import CallSession
from app.events import manager


router = APIRouter()


@router.get("/health")
def health():
    return {"status": "ok"}


@router.post("/signals", response_model=SignalOut)
def create_signal(payload: SignalCreate, db: Session = Depends(get_db)):
    sig = Signal(text=payload.text, source_type=payload.source_type, source_url=payload.source_url)
    db.add(sig)
    db.commit()
    db.refresh(sig)

    # Optional: create incident if lat/lon present (demo convenience)
    if payload.lat is not None and payload.lon is not None:
        credibility = simple_credibility_score(payload.text)
        inc = Incident(
            type="unknown",
            severity=1,
            credibility=credibility,
            status="verified" if credibility >= 0.5 else "borderline",
            lat=payload.lat,
            lon=payload.lon,
            start_time=datetime.utcnow(),
            signal_id=sig.id,
        )
        merged = merge_incident(db, inc)
        # Broadcast basic update
        try:
            import json
            from app.config import settings
            msg = json.dumps({
                "event": "incident_update",
                "data": {
                    "id": merged.id,
                    "type": merged.type,
                    "severity": merged.severity,
                    "credibility": merged.credibility,
                    "lat": merged.lat,
                    "lon": merged.lon,
                },
            })
            # Fire and forget
            import asyncio
            asyncio.create_task(manager.broadcast(msg))
        except Exception:
            pass

    return sig


@router.get("/incidents", response_model=List[IncidentOut])
def list_incidents(db: Session = Depends(get_db)):
    return db.query(Incident).order_by(Incident.created_at.desc()).limit(200).all()


@router.get("/ny_incidents")
def ny_incidents(db: Session = Depends(get_db)):
    # Returns aggregated incidents with credibility
    return list_ny_incidents_json(db)


@router.get("/ny_sources")
def ny_sources(db: Session = Depends(get_db)):
    # Returns source-level entries (>1000), many pointing to the same incidents
    return list_ny_sources_json(db)


@router.post("/incidents/mock", response_model=IncidentOut)
def create_mock_incident(payload: IncidentCreate, db: Session = Depends(get_db)):
    inc = Incident(
        type=payload.type,
        severity=payload.severity,
        credibility=0.7,
        status="verified",
        lat=payload.lat,
        lon=payload.lon,
        start_time=payload.start_time or datetime.utcnow(),
    )
    merged = merge_incident(db, inc)
    return merged


@router.post("/incidents/{incident_id}/approve", response_model=IncidentOut)
def approve_incident(incident_id: int, db: Session = Depends(get_db)):
    inc = db.get(Incident, incident_id)
    if not inc:
        raise HTTPException(status_code=404, detail="Incident not found")
    inc.status = "verified"
    inc.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(inc)
    return inc


@router.post("/incidents/{incident_id}/dismiss", response_model=IncidentOut)
def dismiss_incident(incident_id: int, db: Session = Depends(get_db)):
    inc = db.get(Incident, incident_id)
    if not inc:
        raise HTTPException(status_code=404, detail="Incident not found")
    inc.status = "dismissed"
    inc.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(inc)
    return inc


@router.post("/route", response_model=RouteResponse)
async def route(req: RouteRequest, db: Session = Depends(get_db)):
    # Gather active incidents (exclude dismissed)
    incidents = db.query(Incident).filter(Incident.status != "dismissed").all()
    incidents_view = [
        {"lat": i.lat, "lon": i.lon, "severity": float(i.severity), "credibility": float(i.credibility)}
        for i in incidents
    ]
    best_index, reason, routes = await choose_safest_route(req.origin, req.destination, incidents_view)
    response_routes = [
        RouteLeg(coordinates=coords, distance_m=dist, duration_s=dur, safety_penalty=pen)
        for coords, dist, dur, pen in [
            (r["coordinates"], r["distance_m"], r["duration_s"], r["safety_penalty"]) for r in routes
        ]
    ]
    return RouteResponse(chosen_index=best_index, chosen_reason=reason, routes=response_routes)


# Credibility prompts and experiments (Opik bot)
@router.get("/credibility/prompts")
def credibility_prompts():
    return get_prompts()

@router.get("/ny_credibility_experiments")
def ny_credibility_experiments():
    # Example sets: one real-like mix and one fake-like mix
    real_sources = ["NYPD", "FDNY", "ABC7NY", "NBC New York", "NY1"]
    fake_sources = ["Local Blog", "CitizenApp", "Scanner"]
    return record_prompt_experiments(real_sources, fake_sources)

@router.post("/credibility/experiment")
def credibility_experiment(payload: dict):
    """Run an experiment using custom prompt texts and optional sources.
    Body shape: {"prompts": {"v1": "...", "v2": "..."}, "real_sources": [...], "fake_sources": [...]}"""
    prompts = payload.get("prompts") or {}
    real_sources = payload.get("real_sources") or ["NYPD", "FDNY", "NY1"]
    fake_sources = payload.get("fake_sources") or ["Local Blog", "CitizenApp"]
    return record_prompt_experiments_custom(prompts, real_sources, fake_sources)

@router.get("/ny_credibility_logs")
def ny_credibility_logs():
    return list_logs()