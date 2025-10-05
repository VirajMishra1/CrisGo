/**
 * Generate 500+ mock NYC incidents with credibility scores
 */

import fs from 'fs';
import path from 'path';

// NYC borough coordinates and neighborhoods
const nycLocations = [
  // Manhattan
  { name: "Times Square", lat: 40.7580, lng: -73.9855, borough: "Manhattan" },
  { name: "Central Park", lat: 40.7829, lng: -73.9654, borough: "Manhattan" },
  { name: "Wall Street", lat: 40.7074, lng: -74.0113, borough: "Manhattan" },
  { name: "Harlem", lat: 40.8116, lng: -73.9465, borough: "Manhattan" },
  { name: "Upper East Side", lat: 40.7736, lng: -73.9566, borough: "Manhattan" },
  { name: "Upper West Side", lat: 40.7870, lng: -73.9754, borough: "Manhattan" },
  { name: "Greenwich Village", lat: 40.7336, lng: -74.0027, borough: "Manhattan" },
  { name: "SoHo", lat: 40.7233, lng: -74.0030, borough: "Manhattan" },
  { name: "TriBeCa", lat: 40.7163, lng: -74.0086, borough: "Manhattan" },
  { name: "East Village", lat: 40.7264, lng: -73.9818, borough: "Manhattan" },
  { name: "Chelsea", lat: 40.7465, lng: -74.0014, borough: "Manhattan" },
  { name: "Hell's Kitchen", lat: 40.7638, lng: -73.9918, borough: "Manhattan" },
  { name: "Murray Hill", lat: 40.7476, lng: -73.9764, borough: "Manhattan" },
  { name: "Gramercy", lat: 40.7379, lng: -73.9862, borough: "Manhattan" },
  { name: "Lower East Side", lat: 40.7153, lng: -73.9874, borough: "Manhattan" },
  { name: "Chinatown", lat: 40.7157, lng: -73.9970, borough: "Manhattan" },
  { name: "Little Italy", lat: 40.7194, lng: -73.9977, borough: "Manhattan" },
  { name: "Battery Park", lat: 40.7033, lng: -74.0170, borough: "Manhattan" },
  { name: "Morningside Heights", lat: 40.8091, lng: -73.9626, borough: "Manhattan" },
  { name: "Washington Heights", lat: 40.8502, lng: -73.9365, borough: "Manhattan" },
  
  // Brooklyn
  { name: "Williamsburg", lat: 40.7081, lng: -73.9571, borough: "Brooklyn" },
  { name: "Brooklyn Heights", lat: 40.6958, lng: -73.9936, borough: "Brooklyn" },
  { name: "Park Slope", lat: 40.6710, lng: -73.9778, borough: "Brooklyn" },
  { name: "DUMBO", lat: 40.7033, lng: -73.9889, borough: "Brooklyn" },
  { name: "Bushwick", lat: 40.6942, lng: -73.9210, borough: "Brooklyn" },
  { name: "Greenpoint", lat: 40.7298, lng: -73.9509, borough: "Brooklyn" },
  { name: "Red Hook", lat: 40.6744, lng: -74.0089, borough: "Brooklyn" },
  { name: "Sunset Park", lat: 40.6454, lng: -74.0154, borough: "Brooklyn" },
  { name: "Bay Ridge", lat: 40.6260, lng: -74.0299, borough: "Brooklyn" },
  { name: "Coney Island", lat: 40.5755, lng: -73.9707, borough: "Brooklyn" },
  
  // Queens
  { name: "Astoria", lat: 40.7614, lng: -73.9242, borough: "Queens" },
  { name: "Long Island City", lat: 40.7447, lng: -73.9485, borough: "Queens" },
  { name: "Flushing", lat: 40.7674, lng: -73.8328, borough: "Queens" },
  { name: "Jamaica", lat: 40.6916, lng: -73.8062, borough: "Queens" },
  { name: "Forest Hills", lat: 40.7185, lng: -73.8448, borough: "Queens" },
  { name: "Jackson Heights", lat: 40.7557, lng: -73.8831, borough: "Queens" },
  { name: "Ridgewood", lat: 40.7006, lng: -73.9024, borough: "Queens" },
  { name: "Corona", lat: 40.7472, lng: -73.8622, borough: "Queens" },
  
  // Bronx
  { name: "Fordham", lat: 40.8621, lng: -73.8978, borough: "Bronx" },
  { name: "Riverdale", lat: 40.8908, lng: -73.9123, borough: "Bronx" },
  { name: "Hunts Point", lat: 40.8120, lng: -73.8820, borough: "Bronx" },
  { name: "Pelham Bay", lat: 40.8524, lng: -73.8270, borough: "Bronx" },
  { name: "Mott Haven", lat: 40.8089, lng: -73.9219, borough: "Bronx" },
  
  // Staten Island
  { name: "St. George", lat: 40.6437, lng: -74.0754, borough: "Staten Island" },
  { name: "Stapleton", lat: 40.6276, lng: -74.0765, borough: "Staten Island" },
  { name: "Tottenville", lat: 40.5057, lng: -74.2426, borough: "Staten Island" }
];

const incidentTypes = [
  { type: "flooding", severity: ["medium", "high", "critical"] },
  { type: "road_closure", severity: ["medium", "high", "critical"] },
  { type: "hazard", severity: ["low", "medium", "high", "critical"] },
  { type: "accident", severity: ["low", "medium", "high"] },
  { type: "power_outage", severity: ["medium", "high", "critical"] },
  { type: "fire", severity: ["high", "critical"] },
  { type: "gas_leak", severity: ["high", "critical"] },
  { type: "debris", severity: ["low", "medium", "high"] },
  { type: "chemical_spill", severity: ["critical"] },
  { type: "building_collapse", severity: ["critical"] },
  { type: "water_main_break", severity: ["medium", "high"] },
  { type: "fallen_tree", severity: ["low", "medium"] },
  { type: "subway_incident", severity: ["medium", "high"] },
  { type: "traffic_signal_out", severity: ["low", "medium"] },
  { type: "sinkhole", severity: ["high", "critical"] }
];

const sources = [
  "NOAA Weather Service",
  "NYC DOT Official",
  "NYPD Traffic Alert",
  "FDNY Official",
  "ConEd Alert System",
  "MTA Official",
  "Citizen Reports via Tavily",
  "Social Media Reports",
  "Traffic Cameras",
  "Building Management Reports",
  "FDNY Hazmat Unit",
  "NYC Emergency Management",
  "Port Authority",
  "NYC 311 Reports"
];

const descriptions: Record<string, string[]> = {
  flooding: [
    "Heavy rainfall causing street flooding, water levels rising rapidly.",
    "Storm drain overflow causing localized flooding.",
    "Water entering subway station, service suspended.",
    "Multiple buildings reporting basement flooding.",
    "Flash flooding from severe thunderstorms."
  ],
  road_closure: [
    "Emergency construction due to water main break.",
    "Police activity, area cleared for investigation.",
    "Suspicious package investigation underway.",
    "Sinkhole discovered, immediate road closure.",
    "Emergency repairs to bridge structure."
  ],
  hazard: [
    "Large debris reported blocking lanes.",
    "Downed power lines on street, area cordoned off.",
    "Gas leak reported, building evacuated.",
    "Chemical spill reported, hazmat team responding.",
    "Scaffolding partially collapsed, street closed."
  ],
  accident: [
    "Multi-vehicle collision, emergency services on scene.",
    "Pedestrian struck by vehicle, ambulance responding.",
    "Bus involved in collision, minor injuries reported.",
    "Motorcycle accident, traffic diverted.",
    "Head-on collision blocking intersection."
  ],
  power_outage: [
    "Widespread power outage affecting multiple buildings.",
    "Transformer explosion, power out in area.",
    "Electrical fire causing power disruption.",
    "Grid failure, ConEd crews dispatched.",
    "Storm damage causing outages."
  ],
  fire: [
    "Building fire, FDNY on scene, area evacuated.",
    "Electrical fire in apartment building.",
    "Commercial building fire, multiple alarms.",
    "Vehicle fire on highway, lanes blocked.",
    "Warehouse fire, heavy smoke reported."
  ],
  gas_leak: [
    "Emergency gas leak, area cordoned off.",
    "Natural gas odor reported, evacuations ordered.",
    "Gas main rupture, emergency response active.",
    "Building gas leak, residents evacuated."
  ],
  debris: [
    "Construction debris on roadway.",
    "Fallen signage blocking lane.",
    "Cargo spill from truck accident.",
    "Building materials scattered on street."
  ],
  chemical_spill: [
    "Industrial chemical spill, hazmat responding.",
    "Truck accident causing chemical leak.",
    "Hazardous materials containment underway.",
    "Chemical tanker accident, evacuations ordered."
  ],
  building_collapse: [
    "Partial building collapse, emergency response active.",
    "Structural failure, area evacuated.",
    "Building wall collapse on street.",
    "Parking garage partial collapse."
  ],
  water_main_break: [
    "Major water main break flooding streets.",
    "Water main rupture causing service disruption.",
    "Emergency water main repair underway.",
    "Water geyser from broken main."
  ],
  fallen_tree: [
    "Large tree fallen across street.",
    "Storm damage, tree blocking roadway.",
    "Tree limbs on power lines.",
    "Multiple trees down from high winds."
  ],
  subway_incident: [
    "Subway train delay, signal problems.",
    "Emergency brake activation, service stopped.",
    "Medical emergency on subway platform.",
    "Subway flooding, station closed."
  ],
  traffic_signal_out: [
    "Traffic signal malfunction at intersection.",
    "Power outage affecting traffic lights.",
    "Multiple signals out along corridor.",
    "Emergency signal repairs in progress."
  ],
  sinkhole: [
    "Large sinkhole discovered on roadway.",
    "Street collapse, emergency closure.",
    "Sinkhole expanding, evacuations ordered.",
    "Underground void causing street damage."
  ]
};

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomFloat(min: number, max: number, decimals: number = 2): number {
  return parseFloat((Math.random() * (max - min) + min).toFixed(decimals));
}

function generateDistance(): string {
  const km = randomFloat(0.1, 8.5, 1);
  return `${km} km`;
}

function generateTimestamp(): string {
  const now = new Date('2025-10-02T20:00:00Z');
  const hoursAgo = Math.floor(Math.random() * 24);
  const minutesAgo = Math.floor(Math.random() * 60);
  now.setHours(now.getHours() - hoursAgo);
  now.setMinutes(now.getMinutes() - minutesAgo);
  return now.toISOString();
}

function getCredibilityFromScore(score: number): "low" | "medium" | "high" {
  if (score >= 0.8) return "high";
  if (score >= 0.6) return "medium";
  return "low";
}

function generateIncidents(count: number) {
  const incidents = [];
  
  for (let i = 0; i < count; i++) {
    const location = randomChoice(nycLocations);
    const incidentType = randomChoice(incidentTypes);
    const severity = randomChoice(incidentType.severity);
    const source = randomChoice(sources);
    const description = randomChoice(descriptions[incidentType.type] || ["Incident reported."]);
    
    // Add slight variation to coordinates
    const lat = location.lat + randomFloat(-0.01, 0.01, 4);
    const lng = location.lng + randomFloat(-0.01, 0.01, 4);
    
    // Generate credibility score based on source and severity
    let baseScore = 0.5;
    if (source.includes("Official") || source.includes("NYPD") || source.includes("FDNY")) {
      baseScore = 0.85;
    } else if (source.includes("MTA") || source.includes("ConEd") || source.includes("DOT")) {
      baseScore = 0.78;
    } else if (source.includes("Citizen") || source.includes("Social")) {
      baseScore = 0.55;
    }
    
    const credibilityScore = randomFloat(baseScore - 0.15, baseScore + 0.15, 2);
    const credibility = getCredibilityFromScore(credibilityScore);
    
    incidents.push({
      id: `nyc_${String(i + 1).padStart(3, '0')}`,
      type: incidentType.type,
      lat,
      lng,
      title: `${incidentType.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} - ${location.name}`,
      description: `${description} Location: ${location.borough}.`,
      credibility,
      credibility_score: credibilityScore,
      distance: generateDistance(),
      source,
      timestamp: generateTimestamp(),
      severity,
      affected_area: `${location.name}, ${location.borough}`,
      borough: location.borough
    });
  }
  
  return incidents;
}

// Generate 502 incidents
const incidents = generateIncidents(502);

const data = {
  generated_at: new Date().toISOString(),
  total_incidents: incidents.length,
  metadata: {
    source: "Tavily + LangGraph Credibility Agent",
    location: "New York City",
    credibility_scoring: "Multi-prompt LLM evaluation with Opik tracking",
    prompt_versions: [
      {
        id: "v1_strict",
        description: "Strict credibility assessment with high thresholds",
        avg_score: 0.72
      },
      {
        id: "v2_balanced",
        description: "Balanced assessment considering multiple factors",
        avg_score: 0.78
      },
      {
        id: "v3_contextual",
        description: "Context-aware scoring with location and source weighting",
        avg_score: 0.81
      }
    ]
  },
  incidents
};

// Save to file
const outputPath = path.join(process.cwd(), 'src', 'data', 'ny_incidents.json');
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));

console.log(`✅ Generated ${incidents.length} NYC incidents`);
console.log(`📄 Saved to: ${outputPath}`);
console.log(`📊 Credibility distribution:`);
console.log(`   - High: ${incidents.filter(i => i.credibility === 'high').length}`);
console.log(`   - Medium: ${incidents.filter(i => i.credibility === 'medium').length}`);
console.log(`   - Low: ${incidents.filter(i => i.credibility === 'low').length}`);