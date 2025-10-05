"""
Data ingestion from multiple sources: NOAA, USGS, Reddit, Tavily.
"""

import os
import asyncio
from typing import List, Dict, Any, Optional
from datetime import datetime
import httpx
from tavily import TavilyClient


class DataIngestion:
    """Handles data ingestion from multiple emergency/disaster sources."""
    
    def __init__(self):
        self.tavily_client = None
        if os.getenv("TAVILY_API_KEY"):
            self.tavily_client = TavilyClient(api_key=os.getenv("TAVILY_API_KEY"))
    
    async def search_tavily_incidents(
        self,
        query: str,
        location: Optional[str] = None,
        max_results: int = 10
    ) -> List[Dict[str, Any]]:
        """Search for incidents using Tavily API."""
        if not self.tavily_client:
            return []
        
        try:
            # Construct search query
            search_query = f"{query} disaster emergency incident"
            if location:
                search_query += f" {location}"
            
            # Search using Tavily
            results = self.tavily_client.search(
                query=search_query,
                max_results=max_results,
                search_depth="advanced",
                include_domains=["weather.gov", "usgs.gov", "fema.gov", "weather.com"]
            )
            
            incidents = []
            for result in results.get("results", []):
                incident = {
                    "title": result.get("title", ""),
                    "description": result.get("content", ""),
                    "source": result.get("url", ""),
                    "source_type": "tavily",
                    "timestamp": datetime.utcnow().isoformat(),
                    "raw_score": result.get("score", 0.0)
                }
                incidents.append(incident)
            
            return incidents
        except Exception as e:
            print(f"Tavily search error: {e}")
            return []
    
    async def fetch_noaa_alerts(self, state: str = "NY") -> List[Dict[str, Any]]:
        """Fetch weather alerts from NOAA API."""
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                url = f"https://api.weather.gov/alerts/active?area={state}"
                response = await client.get(url)
                response.raise_for_status()
                
                data = response.json()
                alerts = []
                
                for feature in data.get("features", []):
                    properties = feature.get("properties", {})
                    alert = {
                        "title": properties.get("headline", "Weather Alert"),
                        "description": properties.get("description", ""),
                        "event_type": properties.get("event", ""),
                        "severity": properties.get("severity", ""),
                        "urgency": properties.get("urgency", ""),
                        "source": "NOAA",
                        "source_type": "noaa",
                        "timestamp": properties.get("onset", datetime.utcnow().isoformat()),
                        "areas": properties.get("areaDesc", "")
                    }
                    alerts.append(alert)
                
                return alerts
        except Exception as e:
            print(f"NOAA fetch error: {e}")
            return []
    
    async def fetch_usgs_earthquakes(
        self,
        min_magnitude: float = 2.5,
        days: int = 7
    ) -> List[Dict[str, Any]]:
        """Fetch earthquake data from USGS."""
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                url = "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_week.geojson"
                response = await client.get(url)
                response.raise_for_status()
                
                data = response.json()
                earthquakes = []
                
                for feature in data.get("features", []):
                    properties = feature.get("properties", {})
                    geometry = feature.get("geometry", {})
                    
                    magnitude = properties.get("mag", 0.0)
                    if magnitude >= min_magnitude:
                        quake = {
                            "title": properties.get("title", "Earthquake"),
                            "description": f"Magnitude {magnitude} earthquake",
                            "magnitude": magnitude,
                            "place": properties.get("place", ""),
                            "latitude": geometry.get("coordinates", [None, None])[1],
                            "longitude": geometry.get("coordinates", [None, None])[0],
                            "depth": geometry.get("coordinates", [None, None, None])[2],
                            "source": "USGS",
                            "source_type": "usgs",
                            "timestamp": datetime.fromtimestamp(
                                properties.get("time", 0) / 1000
                            ).isoformat()
                        }
                        earthquakes.append(quake)
                
                return earthquakes
        except Exception as e:
            print(f"USGS fetch error: {e}")
            return []
    
    async def search_reddit_incidents(
        self,
        subreddit: str = "nyc",
        keywords: List[str] = None
    ) -> List[Dict[str, Any]]:
        """Search Reddit for incident reports (requires Reddit API setup)."""
        # Placeholder - would require Reddit API credentials
        # This is a stub for future implementation
        return []
    
    async def aggregate_incidents(
        self,
        location: str = "New York",
        sources: List[str] = None
    ) -> List[Dict[str, Any]]:
        """Aggregate incidents from all configured sources."""
        if sources is None:
            sources = ["tavily", "noaa", "usgs"]
        
        all_incidents = []
        tasks = []
        
        if "tavily" in sources and self.tavily_client:
            tasks.append(self.search_tavily_incidents(
                query="emergency incident disaster",
                location=location,
                max_results=20
            ))
        
        if "noaa" in sources:
            tasks.append(self.fetch_noaa_alerts("NY"))
        
        if "usgs" in sources:
            tasks.append(self.fetch_usgs_earthquakes(min_magnitude=2.0))
        
        # Run all tasks concurrently
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        for result in results:
            if isinstance(result, list):
                all_incidents.extend(result)
        
        return all_incidents


# Global instance
data_ingestion = DataIngestion()