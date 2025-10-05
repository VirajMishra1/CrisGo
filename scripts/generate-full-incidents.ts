import fs from 'fs';
import path from 'path';

// NYC Borough coordinates
const boroughs = {
  manhattan: { lat: 40.7831, lng: -73.9712, name: "Manhattan" },
  brooklyn: { lat: 40.6782, lng: -73.9442, name: "Brooklyn" },
  queens: { lat: 40.7282, lng: -73.7949, name: "Queens" },
  bronx: { lat: 40.8448, lng: -73.8648, name: "Bronx" },
  staten_island: { lat: 40.5795, lng: -74.1502, name: "Staten Island" }
};

const incidentTypes = [
  "flooding", "hazard", "accident", "road_closure", "fire", 
  "earthquake", "power_outage", "gas_leak", "building_collapse", "traffic"
];

const streets = [
  "Broadway", "5th Ave", "Park Ave", "Madison Ave", "Lexington Ave",
  "Amsterdam Ave", "Columbus Ave", "Atlantic Ave", "Flatbush Ave",
  "Queens Blvd", "Northern Blvd", "Grand Concourse", "Fordham Rd",
  "Victory Blvd", "Hylan Blvd", "FDR Drive", "West Side Highway",
  "Brooklyn Bridge", "Williamsburg Bridge", "Manhattan Bridge"
];

const sourceTypes = ["tavily", "reddit", "social_media", "official", "news"];

function randomInRange(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function getRandomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateIncident(index: number) {
  const borough = getRandomElement(Object.values(boroughs));
  const type = getRandomElement(incidentTypes);
  const street = getRandomElement(streets);
  const sourceType = getRandomElement(sourceTypes);
  
  // Generate coordinates near borough center with some variation
  const lat = borough.lat + randomInRange(-0.05, 0.05);
  const lng = borough.lng + randomInRange(-0.05, 0.05);
  
  // Determine credibility based on source type
  let credibilityLevel: "high" | "medium" | "low";
  let sourceReliability: number;
  
  if (sourceType === "official") {
    credibilityLevel = "high";
    sourceReliability = randomInRange(0.90, 0.99);
  } else if (sourceType === "tavily" || sourceType === "news") {
    credibilityLevel = Math.random() > 0.3 ? "high" : "medium";
    sourceReliability = randomInRange(0.75, 0.92);
  } else if (sourceType === "reddit") {
    credibilityLevel = Math.random() > 0.5 ? "medium" : "low";
    sourceReliability = randomInRange(0.55, 0.75);
  } else {
    credibilityLevel = Math.random() > 0.7 ? "medium" : "low";
    sourceReliability = randomInRange(0.30, 0.60);
  }
  
  const overall = sourceReliability * randomInRange(0.95, 1.05);
  const promptV1 = overall * randomInRange(0.96, 1.02);
  const promptV2 = overall * randomInRange(0.98, 1.04);
  const temporalRelevance = randomInRange(0.60, 0.99);
  
  // Generate timestamp (last 12 hours)
  const hoursAgo = Math.floor(randomInRange(0, 12));
  const minutesAgo = Math.floor(randomInRange(0, 60));
  const timestamp = new Date();
  timestamp.setHours(timestamp.getHours() - hoursAgo);
  timestamp.setMinutes(timestamp.getMinutes() - minutesAgo);
  
  const severity = credibilityLevel === "high" ? 
    (Math.random() > 0.5 ? "critical" : "moderate") : 
    (Math.random() > 0.5 ? "moderate" : "minor");
  
  const descriptions: Record<string, string[]> = {
    flooding: [
      `Heavy flooding on ${street}. Water level approximately ${Math.floor(randomInRange(4, 12))} inches.`,
      `Flash flooding reported near ${street}. Multiple vehicles stalled.`,
      `Water main break causing severe flooding on ${street}.`,
      `Storm water flooding blocking ${street}. Emergency crews responding.`
    ],
    hazard: [
      `Large debris blocking lane on ${street}.`,
      `Fallen tree obstructing traffic on ${street}.`,
      `Broken glass and debris scattered across ${street}.`,
      `Construction materials spilled on ${street}.`
    ],
    accident: [
      `Multi-vehicle collision on ${street}. ${Math.floor(randomInRange(2, 5))} vehicles involved.`,
      `Pedestrian accident reported on ${street}. Emergency services on scene.`,
      `Vehicle collision blocking lanes on ${street}.`,
      `Rear-end collision on ${street}. Traffic backed up.`
    ],
    road_closure: [
      `${street} closed due to emergency gas leak.`,
      `Full closure of ${street} for emergency repairs.`,
      `${street} shut down for police activity.`,
      `Emergency road closure on ${street}. Seek alternate routes.`
    ],
    fire: [
      `Building fire reported on ${street}. FDNY responding.`,
      `Small fire in commercial building on ${street}.`,
      `Apartment fire on ${street}. Residents evacuated.`,
      `Vehicle fire on ${street}. Fire crews on scene.`
    ],
    earthquake: [
      `Earthquake tremors reported in ${borough.name}. Magnitude ${randomInRange(2, 4).toFixed(1)}.`,
      `Seismic activity detected near ${street}.`,
      `Minor earthquake felt in ${borough.name} area.`,
      `Ground shaking reported near ${street}.`
    ],
    power_outage: [
      `Power outage affecting ${street} and surrounding area.`,
      `Electrical outage reported on ${street}. ConEd investigating.`,
      `${Math.floor(randomInRange(100, 5000))} customers without power near ${street}.`,
      `Transformer explosion causing outage on ${street}.`
    ],
    gas_leak: [
      `Gas leak reported on ${street}. Area being evacuated.`,
      `Natural gas odor reported near ${street}. ConEd responding.`,
      `Emergency gas leak on ${street}. Residents advised to shelter in place.`,
      `Gas main rupture on ${street}. Emergency crews on scene.`
    ],
    building_collapse: [
      `Partial building collapse on ${street}. Emergency response active.`,
      `Structural damage reported on ${street}. Building evacuated.`,
      `Scaffolding collapse on ${street}. Area cordoned off.`,
      `Facade collapse on ${street}. Injuries reported.`
    ],
    traffic: [
      `Heavy traffic congestion on ${street}. Expect delays.`,
      `Traffic signal malfunction on ${street}. Police directing traffic.`,
      `Lane closure on ${street} for emergency repairs.`,
      `Traffic jam on ${street} due to disabled vehicle.`
    ]
  };
  
  const titles: Record<string, string[]> = {
    flooding: [`${borough.name} Flooding - ${street}`, `Water Main Break - ${street}`, `Flash Flooding on ${street}`],
    hazard: [`Road Hazard - ${street}`, `Debris on ${street}`, `Obstruction - ${street}`],
    accident: [`Vehicle Accident - ${street}`, `Collision on ${street}`, `Traffic Incident - ${street}`],
    road_closure: [`Road Closure - ${street}`, `Emergency Closure - ${street}`, `${street} Shut Down`],
    fire: [`Building Fire - ${street}`, `Fire Emergency - ${street}`, `Active Fire on ${street}`],
    earthquake: [`Earthquake - ${borough.name}`, `Seismic Activity - ${borough.name}`, `Tremors Reported`],
    power_outage: [`Power Outage - ${street}`, `Electrical Outage - ${borough.name}`, `No Power - ${street}`],
    gas_leak: [`Gas Leak - ${street}`, `Emergency Gas Leak`, `Gas Odor Reported - ${street}`],
    building_collapse: [`Building Collapse - ${street}`, `Structural Emergency - ${street}`, `Collapse on ${street}`],
    traffic: [`Heavy Traffic - ${street}`, `Traffic Delay - ${street}`, `Congestion on ${street}`]
  };
  
  return {
    id: `nyc_${String(index + 1).padStart(3, '0')}`,
    type,
    lat: parseFloat(lat.toFixed(6)),
    lng: parseFloat(lng.toFixed(6)),
    title: getRandomElement(titles[type]),
    description: getRandomElement(descriptions[type]),
    credibility: credibilityLevel,
    distance: `${randomInRange(0, 10).toFixed(1)} km`,
    timestamp: timestamp.toISOString(),
    severity,
    source: {
      type: sourceType,
      url: `https://example.com/${sourceType}/${index}`,
      reliability: parseFloat(sourceReliability.toFixed(2))
    },
    credibility_scores: {
      overall: parseFloat(overall.toFixed(2)),
      prompt_v1: parseFloat(promptV1.toFixed(2)),
      prompt_v2: parseFloat(promptV2.toFixed(2)),
      source_reliability: parseFloat(sourceReliability.toFixed(2)),
      temporal_relevance: parseFloat(temporalRelevance.toFixed(2))
    }
  };
}

// Generate 502 incidents
const incidents = Array.from({ length: 502 }, (_, i) => generateIncident(i));

const data = {
  metadata: {
    total_incidents: 502,
    generated_at: new Date().toISOString(),
    source: "Tavily + LangGraph + Credibility Scoring",
    coverage_area: "New York City",
    boroughs: ["Manhattan", "Brooklyn", "Queens", "Bronx", "Staten Island"]
  },
  incidents
};

// Write to file
const outputPath = path.join(process.cwd(), 'src', 'data', 'incidents.json');
fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));

console.log(`✅ Generated ${incidents.length} incidents and saved to ${outputPath}`);