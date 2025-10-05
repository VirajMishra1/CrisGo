import os
from typing import Optional
from dotenv import load_dotenv

load_dotenv()


class Settings:
    app_name: str = "Dual-Dashboard Disaster Safety Backend"
    environment: str = os.getenv("ENV", "local")
    database_url: str = os.getenv("DATABASE_URL", "sqlite:///./data.db")
    osrm_base_url: str = os.getenv("OSRM_BASE_URL", "https://router.project-osrm.org")
    city_name: str = "New York City"

    # Demo tuning
    danger_radius_m: float = 150.0
    credibility_display_scale: int = 10

    # External services
    opik_api_key: Optional[str] = os.getenv("OPIK_API_KEY")
    tavily_api_key: Optional[str] = os.getenv("TAVILY_API_KEY")
    elevenlabs_api_key: Optional[str] = os.getenv("ELEVENLABS_API_KEY")
    elevenlabs_voice_id: Optional[str] = os.getenv("ELEVENLABS_VOICE_ID")
    gemini_api_key: Optional[str] = os.getenv("GEMINI_API_KEY")
    # ElevenLabs Realtime Agent
    agent_id: Optional[str] = os.getenv("AGENT_ID")
    public_agent: bool = os.getenv("PUBLIC_AGENT", "true").lower() == "true"
    # Geocoding base (free)
    nominatim_base: str = os.getenv("NOMINATIM_BASE", "https://nominatim.openstreetmap.org")


settings = Settings()