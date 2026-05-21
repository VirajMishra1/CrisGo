/**
 * Direct incident fetching from free public APIs.
 * Used as fallback when Python backend is unavailable.
 * Mirrors backend/app/services/ingest.py logic.
 */

interface RawIncident {
  id: string;
  type: string;
  title: string;
  description: string;
  lat: number;
  lng: number;
  severity: string;
  source: string;
  source_type: string;
  source_url: string;
  timestamp: string;
}

const HEADERS = { "User-Agent": "CrisGo-CrisisNav/1.0" };

async function fetchUSGS(): Promise<RawIncident[]> {
  try {
    const resp = await fetch(
      "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson",
      { headers: HEADERS, next: { revalidate: 300 } }
    );
    if (!resp.ok) return [];
    const data = await resp.json();

    return (data.features || [])
      .filter((f: any) => (f.properties?.mag || 0) >= 1.0)
      .map((f: any) => {
        const p = f.properties || {};
        const c = f.geometry?.coordinates || [0, 0, 0];
        const mag = p.mag || 0;
        return {
          id: `usgs_${f.id || ""}`,
          type: "earthquake",
          title: p.title || `M${mag} Earthquake`,
          description: `Magnitude ${mag} earthquake. ${p.place || ""}. Depth: ${c[2]?.toFixed(1) || 0}km.`,
          lat: c[1],
          lng: c[0],
          severity: mag >= 4.5 ? "high" : mag >= 3.0 ? "medium" : "low",
          source: "USGS",
          source_type: "official",
          source_url: p.url || "",
          timestamp: new Date((p.time || 0)).toISOString(),
        };
      });
  } catch {
    return [];
  }
}

async function fetchNWS(): Promise<RawIncident[]> {
  try {
    const resp = await fetch(
      "https://api.weather.gov/alerts/active?area=NY",
      { headers: HEADERS, next: { revalidate: 300 } }
    );
    if (!resp.ok) return [];
    const data = await resp.json();

    return (data.features || []).map((f: any) => {
      const p = f.properties || {};
      const geom = f.geometry;
      let lat = 40.7128, lng = -74.006;

      if (geom?.coordinates) {
        if (geom.type === "Point") {
          lng = geom.coordinates[0];
          lat = geom.coordinates[1];
        } else if (geom.type === "Polygon" && geom.coordinates[0]) {
          const ring = geom.coordinates[0];
          lat = ring.reduce((s: number, c: number[]) => s + c[1], 0) / ring.length;
          lng = ring.reduce((s: number, c: number[]) => s + c[0], 0) / ring.length;
        }
      }

      const severityMap: Record<string, string> = {
        Extreme: "high", Severe: "high", Moderate: "medium", Minor: "low", Unknown: "low",
      };
      const event = p.event || "Weather Alert";

      return {
        id: `nws_${p.id || ""}`,
        type: event.toLowerCase().includes("flood") ? "flooding" : "hazard",
        title: `${event} — ${(p.areaDesc || "").slice(0, 80)}`,
        description: (p.headline || p.description || "").slice(0, 500),
        lat,
        lng,
        severity: severityMap[p.severity] || "low",
        source: "National Weather Service",
        source_type: "official",
        source_url: "https://alerts.weather.gov",
        timestamp: p.onset || p.sent || new Date().toISOString(),
      };
    });
  } catch {
    return [];
  }
}

async function fetchNYC311(): Promise<RawIncident[]> {
  try {
    const since = new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0] + "T00:00:00";
    const url = `https://data.cityofnewyork.us/resource/erm2-nwe9.json?$where=created_date>'${since}' AND latitude IS NOT NULL&$order=created_date DESC&$limit=200`;
    const resp = await fetch(url, { headers: HEADERS, next: { revalidate: 300 } });
    if (!resp.ok) return [];
    const data = await resp.json();

    return data
      .filter((item: any) => item.latitude && item.longitude)
      .map((item: any) => {
        const complaint = (item.complaint_type || "").toLowerCase();
        let type = "hazard";
        if (complaint.includes("water") || complaint.includes("sewer") || complaint.includes("flood")) type = "flooding";
        else if (complaint.includes("fire") || complaint.includes("gas")) type = "fire";
        else if (complaint.includes("traffic") || complaint.includes("noise")) type = "traffic";
        else if (complaint.includes("electric") || complaint.includes("light")) type = "power_outage";

        return {
          id: `nyc311_${item.unique_key || ""}`,
          type,
          title: `${item.complaint_type || "Complaint"} — ${item.street_name || item.incident_address || ""}, ${item.borough || ""}`,
          description: `${item.complaint_type || ""}: ${item.descriptor || ""}. Status: ${item.status || "Open"}.`,
          lat: parseFloat(item.latitude),
          lng: parseFloat(item.longitude),
          severity: item.status === "Open" ? "medium" : "low",
          source: "NYC 311 Open Data",
          source_type: "official",
          source_url: "https://data.cityofnewyork.us",
          timestamp: item.created_date || new Date().toISOString(),
        };
      });
  } catch {
    return [];
  }
}

export async function fetchDirectIncidents(): Promise<RawIncident[]> {
  const results = await Promise.allSettled([fetchUSGS(), fetchNWS(), fetchNYC311()]);

  const all: RawIncident[] = [];
  for (const r of results) {
    if (r.status === "fulfilled") all.push(...r.value);
  }

  // Deduplicate by ID
  const seen = new Set<string>();
  return all.filter((inc) => {
    if (seen.has(inc.id)) return false;
    seen.add(inc.id);
    return true;
  });
}
