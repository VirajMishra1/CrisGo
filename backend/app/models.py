from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.db import Base


class Signal(Base):
    __tablename__ = "signals"

    id = Column(Integer, primary_key=True, index=True)
    text = Column(String, nullable=False)
    source_type = Column(String, nullable=False, default="user")  # user, noaa, fema, usgs, tavily, reddit
    source_url = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    incidents = relationship("Incident", back_populates="signal")


class Incident(Base):
    __tablename__ = "incidents"

    id = Column(Integer, primary_key=True, index=True)
    type = Column(String, nullable=False)  # fire, flood, accident, etc.
    severity = Column(Integer, nullable=False, default=1)  # 1-5
    credibility = Column(Float, nullable=False, default=0.0)  # 0-1
    status = Column(String, nullable=False, default="verified")  # verified, borderline, dismissed

    lat = Column(Float, nullable=False)
    lon = Column(Float, nullable=False)

    start_time = Column(DateTime, nullable=True)
    end_time = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)

    signal_id = Column(Integer, ForeignKey("signals.id"), nullable=True)
    signal = relationship("Signal", back_populates="incidents")


class CallSession(Base):
    __tablename__ = "call_sessions"

    id = Column(Integer, primary_key=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    status = Column(String, default="active")  # active, completed
    # simple slots to fill
    incident_type = Column(String, nullable=True)
    location = Column(String, nullable=True)
    when = Column(String, nullable=True)
    injured_count = Column(String, nullable=True)


class CallMessage(Base):
    __tablename__ = "call_messages"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("call_sessions.id"))
    role = Column(String, nullable=False)  # responder or bystander
    text = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class ScrapedItem(Base):
    __tablename__ = "scraped_items"

    id = Column(Integer, primary_key=True, index=True)
    source = Column(String, index=True)  # NOAA, USGS, Reddit, Tavily
    url = Column(String, nullable=True)
    title = Column(String, nullable=True)
    raw_text = Column(String, nullable=True)
    summary = Column(String, nullable=True)
    where_text = Column(String, nullable=True)
    when_text = Column(String, nullable=True)
    injured_count = Column(Integer, nullable=True)
    notes = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)


class NYIncident(Base):
    __tablename__ = "ny_incidents"

    id = Column(Integer, primary_key=True, index=True)
    lat = Column(Float, nullable=False)
    lon = Column(Float, nullable=False)
    time = Column(DateTime, nullable=False)
    summary = Column(String, nullable=False)
    source = Column(String, nullable=True)  # news outlet or mock
    created_at = Column(DateTime, default=datetime.utcnow, index=True)


class NYSource(Base):
    __tablename__ = "ny_sources"

    id = Column(Integer, primary_key=True, index=True)
    incident_id = Column(Integer, ForeignKey("ny_incidents.id"), nullable=True)
    lat = Column(Float, nullable=False)
    lon = Column(Float, nullable=False)
    time = Column(DateTime, nullable=False)
    summary = Column(String, nullable=False)
    source = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)