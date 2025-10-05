from datetime import datetime
from typing import Optional, List, Tuple
from pydantic import BaseModel, Field


class SignalCreate(BaseModel):
    text: str
    source_type: str = Field(default="user")
    source_url: Optional[str] = None
    lat: Optional[float] = None
    lon: Optional[float] = None


class SignalOut(BaseModel):
    id: int
    text: str
    source_type: str
    source_url: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class IncidentCreate(BaseModel):
    type: str
    severity: int = 1
    lat: float
    lon: float
    start_time: Optional[datetime] = None


class IncidentOut(BaseModel):
    id: int
    type: str
    severity: int
    credibility: float
    status: str
    lat: float
    lon: float
    start_time: Optional[datetime]
    end_time: Optional[datetime]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class RouteRequest(BaseModel):
    origin: Tuple[float, float]  # lat, lon
    destination: Tuple[float, float]  # lat, lon


class RouteLeg(BaseModel):
    coordinates: List[Tuple[float, float]]
    distance_m: float
    duration_s: float
    safety_penalty: float


class RouteResponse(BaseModel):
    chosen_index: int
    chosen_reason: str
    routes: List[RouteLeg]