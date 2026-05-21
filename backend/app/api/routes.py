from typing import List
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import Signal, Incident
from app.schemas import SignalCreate, SignalOut, IncidentCreate, IncidentOut, RouteRequest, RouteResponse, RouteLeg
from app.agents.credibility import simple_credibility_score, merge_incident
from app.services.routing import choose_safest_route
from app.services.ingest import (
    run_ingestion, ingest_items, fetch_noaa_nws_alerts, fetch_usgs_quakes,
    fetch_reddit_incidents, fetch_tavily_news, run_scrape_and_summarize,
    list_scraped_items, get_scraped_item, fetch_all_incidents,
)
from app.services.ny_incidents import list_ny_incidents_json, list_ny_sources_json, save_live_incidents
from app.services.credibility_agent import get_prompts, score_event, credibility_score_full
from app.services.clustering import cluster_incidents
from app.services.opik_bot import record_prompt_experiments, record_prompt_experiments_custom, list_logs
from app.config import settings
from app.models import CallSession
from app.events import manager


router = APIRouter()


@router.get("/health")
def health():
    return {"status": "ok"}


# ─── Live Incident Endpoints ────────────────────────────────────────

@router.get("/incidents/live")
async def live_incidents():
    """Fetch real-time incidents from all free public APIs."""
    incidents = await fetch_all_incidents(include_global=True)
    return {"count": len(incidents), "incidents": incidents}


@router.post("/incidents/refresh")
async def refresh_incidents(db: Session = Depends(get_db)):
    """Re-fetch live data and update the DB."""
    incidents = await fetch_all_incidents(include_global=True)
    saved = save_live_incidents(db, incidents)
    return {"refreshed": saved, "total_fetched": len(incidents)}


# ─── Signal & Incident CRUD ─────────────────────────────────────────

@router.post("/signals", response_model=SignalOut)
def create_signal(payload: SignalCreate, db: Session = Depends(get_db)):
    sig = Signal(text=payload.text, source_type=payload.source_type, source_url=payload.source_url)
    db.add(sig)
    db.commit()
    db.refresh(sig)

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
        try:
            import json
            import asyncio
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
            asyncio.create_task(manager.broadcast(msg))
        except Exception:
            pass

    return sig


@router.get("/incidents", response_model=List[IncidentOut])
def list_incidents(db: Session = Depends(get_db)):
    return db.query(Incident).order_by(Incident.created_at.desc()).limit(200).all()


@router.get("/ny_incidents")
def ny_incidents(db: Session = Depends(get_db)):
    return list_ny_incidents_json(db)


@router.get("/ny_sources")
def ny_sources(db: Session = Depends(get_db)):
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


# ─── Credibility Experiments ────────────────────────────────────────

@router.get("/credibility/prompts")
def credibility_prompts():
    return get_prompts()

@router.get("/ny_credibility_experiments")
def ny_credibility_experiments():
    real_sources = ["NYPD", "FDNY", "ABC7NY", "NBC New York", "NY1"]
    fake_sources = ["Local Blog", "CitizenApp", "Scanner"]
    return record_prompt_experiments(real_sources, fake_sources)

@router.post("/credibility/experiment")
def credibility_experiment(payload: dict):
    prompts = payload.get("prompts") or {}
    real_sources = payload.get("real_sources") or ["NYPD", "FDNY", "NY1"]
    fake_sources = payload.get("fake_sources") or ["Local Blog", "CitizenApp"]
    return record_prompt_experiments_custom(prompts, real_sources, fake_sources)

@router.get("/ny_credibility_logs")
def ny_credibility_logs():
    return list_logs()


# ─── Clustered Events + Full Credibility Pipeline ─────────────────────

@router.get("/incidents/events")
async def clustered_events(score: bool = False):
    """Fetch live incidents, cluster into events, optionally score each."""
    incidents = await fetch_all_incidents(include_global=True)
    events = cluster_incidents(incidents)

    if score:
        for event in events:
            event["credibility"] = score_event(event)
    else:
        for event in events:
            event["credibility"] = {
                "final_score": 0,
                "confidence": 0,
                "breakdown": "scoring skipped — pass ?score=true",
            }

    events.sort(key=lambda e: e.get("corroboration_count", 0), reverse=True)

    return {
        "count": len(events),
        "total_raw_incidents": len(incidents),
        "events": events,
    }


@router.post("/incidents/score")
async def score_sources(payload: dict):
    """Score credibility for arbitrary source list. Returns full breakdown."""
    sources = payload.get("sources", [])
    if not sources:
        return {"error": "sources list required"}
    return credibility_score_full(sources)
