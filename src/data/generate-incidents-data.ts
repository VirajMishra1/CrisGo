// This file generates 502 realistic NYC incidents with credibility scores

export interface IncidentData {
  id: string;
  type: string;
  lat: number;
  lng: number;
  title: string;
  description: string;
  credibility: "high" | "medium" | "low";
  distance: string;
  timestamp: string;
  severity: string;
  source: {
    type: string;
    url: string;
    reliability: number;
  };
  credibility_scores: {
    overall: number;
    prompt_v1: number;
    prompt_v2: number;
    source_reliability: number;
    temporal_relevance: number;
  };
}

const boroughs = [
  { lat: 40.7831, lng: -73.9712, name: "Manhattan" },
  { lat: 40.6782, lng: -73.9442, name: "Brooklyn" },
  { lat: 40.7282, lng: -73.7949, name: "Queens" },
  { lat: 40.8448, lng: -73.8648, name: "Bronx" },
  { lat: 40.5795, lng: -74.1502, name: "Staten Island" }
];

const types = [
  "flooding", "hazard", "accident", "road_closure", "fire", 
  "earthquake", "power_outage", "gas_leak", "building_collapse", "traffic"
];

const streets = [
  "Broadway", "5th Ave", "Park Ave", "Madison Ave", "Lexington Ave",
  "Amsterdam Ave", "Columbus Ave", "Atlantic Ave", "Flatbush Ave",
  "Queens Blvd", "Northern Blvd", "Grand Concourse", "Fordham Rd",
  "Victory Blvd", "Hylan Blvd", "FDR Drive", "West Side Highway",
  "Brooklyn Bridge", "Williamsburg Bridge", "Manhattan Bridge",
  "Canal St", "Houston St", "Delancey St", "14th St", "23rd St",
  "34th St", "42nd St", "57th St", "72nd St", "86th St", "96th St",
  "125th St", "135th St", "145th St", "155th St", "Dyckman St"
];

const sourceTypes = ["tavily", "reddit", "social_media", "official", "news"];

const descriptions: Record<string, string[]> = {
  flooding: [
    "Heavy flooding reported. Water level approximately 6-12 inches.",
    "Flash flooding blocking multiple lanes. Emergency response active.",
    "Water main break causing severe flooding.",
    "Storm water flooding reported. Vehicles stalled."
  ],
  hazard: [
    "Large debris blocking traffic lanes.",
    "Fallen tree obstructing roadway.",
    "Broken glass and debris scattered across street.",
    "Construction materials spilled on roadway."
  ],
  accident: [
    "Multi-vehicle collision. Multiple lanes blocked.",
    "Vehicle collision with injuries reported.",
    "Rear-end collision causing traffic backup.",
    "Pedestrian accident. Emergency services on scene."
  ],
  road_closure: [
    "Road closed due to emergency gas leak.",
    "Full closure for emergency repairs.",
    "Street shut down for police activity.",
    "Emergency road closure. Seek alternate routes."
  ],
  fire: [
    "Building fire reported. FDNY responding.",
    "Active fire in commercial building.",
    "Apartment fire. Residents evacuated.",
    "Vehicle fire. Fire crews on scene."
  ],
  earthquake: [
    "Earthquake tremors reported. Magnitude 2.5-4.0.",
    "Seismic activity detected in area.",
    "Minor earthquake felt by residents.",
    "Ground shaking reported."
  ],
  power_outage: [
    "Power outage affecting area. 100-5000 customers impacted.",
    "Electrical outage. ConEd investigating.",
    "Transformer explosion causing outage.",
    "Multiple blocks without power."
  ],
  gas_leak: [
    "Gas leak reported. Area being evacuated.",
    "Natural gas odor reported. ConEd responding.",
    "Emergency gas leak. Residents advised to evacuate.",
    "Gas main rupture. Emergency crews on scene."
  ],
  building_collapse: [
    "Partial building collapse. Emergency response active.",
    "Structural damage reported. Building evacuated.",
    "Scaffolding collapse. Area cordoned off.",
    "Facade collapse. Injuries reported."
  ],
  traffic: [
    "Heavy traffic congestion. Expect major delays.",
    "Traffic signal malfunction. Police directing traffic.",
    "Lane closure for emergency repairs.",
    "Traffic jam due to disabled vehicle."
  ]
};

export function generateAllIncidents(): IncidentData[] {
  const incidents: IncidentData[] = [];
  
  for (let i = 0; i < 502; i++) {
    const borough = boroughs[i % boroughs.length];
    const type = types[i % types.length];
    const street = streets[i % streets.length];
    const sourceType = sourceTypes[i % sourceTypes.length];
    
    // Generate coordinates with variation
    const latOffset = (Math.random() - 0.5) * 0.08;
    const lngOffset = (Math.random() - 0.5) * 0.08;
    
    // Determine credibility based on source
    let credibilityLevel: "high" | "medium" | "low";
    let sourceReliability: number;
    
    if (sourceType === "official") {
      credibilityLevel = "high";
      sourceReliability = 0.90 + Math.random() * 0.09;
    } else if (sourceType === "tavily" || sourceType === "news") {
      credibilityLevel = Math.random() > 0.3 ? "high" : "medium";
      sourceReliability = 0.75 + Math.random() * 0.17;
    } else if (sourceType === "reddit") {
      credibilityLevel = Math.random() > 0.5 ? "medium" : "low";
      sourceReliability = 0.55 + Math.random() * 0.20;
    } else {
      credibilityLevel = Math.random() > 0.7 ? "medium" : "low";
      sourceReliability = 0.30 + Math.random() * 0.30;
    }
    
    const overall = sourceReliability * (0.95 + Math.random() * 0.10);
    const promptV1 = overall * (0.96 + Math.random() * 0.06);
    const promptV2 = overall * (0.98 + Math.random() * 0.06);
    const temporalRelevance = 0.60 + Math.random() * 0.39;
    
    // Generate timestamp (last 12 hours)
    const hoursAgo = Math.floor(Math.random() * 12);
    const minutesAgo = Math.floor(Math.random() * 60);
    const timestamp = new Date();
    timestamp.setHours(timestamp.getHours() - hoursAgo);
    timestamp.setMinutes(timestamp.getMinutes() - minutesAgo);
    
    const severity = credibilityLevel === "high" 
      ? (Math.random() > 0.5 ? "critical" : "moderate")
      : (Math.random() > 0.5 ? "moderate" : "minor");
    
    const description = descriptions[type][i % descriptions[type].length];
    
    incidents.push({
      id: `nyc_${String(i + 1).padStart(3, '0')}`,
      type,
      lat: parseFloat((borough.lat + latOffset).toFixed(6)),
      lng: parseFloat((borough.lng + lngOffset).toFixed(6)),
      title: `${type.charAt(0).toUpperCase() + type.slice(1)} - ${street}, ${borough.name}`,
      description: `${description} Location: ${street}, ${borough.name}.`,
      credibility: credibilityLevel,
      distance: `${(Math.random() * 10).toFixed(1)} km`,
      timestamp: timestamp.toISOString(),
      severity,
      source: {
        type: sourceType,
        url: `https://example.com/${sourceType}/incident_${i + 1}`,
        reliability: parseFloat(sourceReliability.toFixed(2))
      },
      credibility_scores: {
        overall: parseFloat(overall.toFixed(2)),
        prompt_v1: parseFloat(promptV1.toFixed(2)),
        prompt_v2: parseFloat(promptV2.toFixed(2)),
        source_reliability: parseFloat(sourceReliability.toFixed(2)),
        temporal_relevance: parseFloat(temporalRelevance.toFixed(2))
      }
    });
  }
  
  return incidents;
}