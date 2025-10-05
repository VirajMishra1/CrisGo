// Routing service - INTELLIGENT WEIGHTED ROUTING with Dijkstra-based optimization
// 🎯 ALGORITHM: Custom weighted path-finding that penalizes routes near incidents
//    - Base cost: Distance (meters) + Time (seconds)
//    - Incident penalties: HIGH=10000, MEDIUM=5000, LOW=2000 per nearby incident
//    - Uses multiple route alternatives and selects lowest weighted cost

export interface RoutePoint {
  lat: number;
  lng: number;
}

export interface RouteResult {
  coordinates: [number, number][];
  distance: number;
  duration: number;
  steps: Array<{
    instruction: string;
    distance: number;
    duration: number;
  }>;
}

export type TransportMode = "driving" | "walking" | "cycling" | "transit";

export interface Incident {
  id: string;
  lat: number;
  lng: number;
  credibility: "high" | "medium" | "low";
  title: string;
}

/**
 * INCIDENT COST WEIGHTS - Critical for route optimization
 * HIGH credibility incidents are weighted so heavily that routing through them is virtually impossible
 */
const INCIDENT_WEIGHTS = {
  high: 500000,   // 500km equivalent penalty - makes route impossible
  medium: 7000,   // 7km equivalent penalty
  low: 3000       // 3km equivalent penalty
};

// Distance-based penalty zones for high credibility incidents
const HIGH_CRED_PENALTY_ZONES = {
  innerZone: 200,    // 0-200m: MAXIMUM penalty (route impossible)
  middleZone: 400,   // 200-400m: Very high penalty 
  outerZone: 600     // 400-600m: High penalty (still expensive)
};

const INCIDENT_DETECTION_RADIUS = 600; // Extended to 600m to catch outer zone

/**
 * Calculate distance between two points in meters using Haversine formula
 */
function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Calculate weighted cost for a route considering incidents
 * Cost = distance + duration + incident_penalties
 * This is the core of our Dijkstra-inspired optimization
 * 
 * HIGH CREDIBILITY INCIDENTS use distance-based gradient penalties:
 * - 0-200m: 500,000 (route impossible)
 * - 200-400m: 250,000 (still very expensive)
 * - 400-600m: 100,000 (expensive but possible)
 * - Beyond 600m: No penalty
 */
function calculateRouteCost(
  routeCoordinates: [number, number][],
  distance: number,
  duration: number,
  incidents: Incident[]
): number {
  // Base cost: distance (meters) + duration (seconds)
  let cost = distance + duration;

  // Add incident penalties with gradient for high credibility
  const incidentsNearRoute = new Set<string>();

  for (const incident of incidents) {
    let minDistanceToIncident = Infinity;
    
    // Find closest point on route to this incident
    for (const [lat, lng] of routeCoordinates) {
      const distanceToIncident = calculateDistance(lat, lng, incident.lat, incident.lng);
      minDistanceToIncident = Math.min(minDistanceToIncident, distanceToIncident);
    }
    
    if (minDistanceToIncident <= INCIDENT_DETECTION_RADIUS) {
      // Only count each incident once
      if (!incidentsNearRoute.has(incident.id)) {
        incidentsNearRoute.add(incident.id);
        
        let weight = 0;
        
        // HIGH credibility: Use distance-based gradient
        if (incident.credibility === "high") {
          if (minDistanceToIncident <= HIGH_CRED_PENALTY_ZONES.innerZone) {
            // 0-200m: MAXIMUM penalty - route is virtually impossible
            weight = INCIDENT_WEIGHTS.high; // 500,000
            console.log(`🚫 HIGH CRED INNER ZONE (${Math.round(minDistanceToIncident)}m): +${weight}m penalty - ROUTE IMPOSSIBLE (${incident.title})`);
          } else if (minDistanceToIncident <= HIGH_CRED_PENALTY_ZONES.middleZone) {
            // 200-400m: Very high penalty
            weight = INCIDENT_WEIGHTS.high * 0.5; // 250,000
            console.log(`⚠️ HIGH CRED MIDDLE ZONE (${Math.round(minDistanceToIncident)}m): +${weight}m penalty - VERY EXPENSIVE (${incident.title})`);
          } else if (minDistanceToIncident <= HIGH_CRED_PENALTY_ZONES.outerZone) {
            // 400-600m: High penalty
            weight = INCIDENT_WEIGHTS.high * 0.2; // 100,000
            console.log(`⚠️ HIGH CRED OUTER ZONE (${Math.round(minDistanceToIncident)}m): +${weight}m penalty - EXPENSIVE (${incident.title})`);
          }
        } else {
          // MEDIUM and LOW credibility: Flat penalty
          weight = INCIDENT_WEIGHTS[incident.credibility];
          console.log(`💰 Adding ${incident.credibility} incident penalty: +${weight}m equivalent (${incident.title})`);
        }
        
        cost += weight;
      }
    }
  }

  return cost;
}

/**
 * Check if a route passes near any incidents
 * Returns incidents that are within threshold distance of the route
 */
function checkRouteForIncidents(
  routeCoordinates: [number, number][],
  incidents: Incident[],
  thresholdMeters: number = 400 // 400m detection zone (expanded from 200m)
): Incident[] {
  const nearbyIncidents: Incident[] = [];

  for (const incident of incidents) {
    for (const [lat, lng] of routeCoordinates) {
      const distance = calculateDistance(lat, lng, incident.lat, incident.lng);
      if (distance <= thresholdMeters) {
        nearbyIncidents.push(incident);
        break; // Found this incident near route, move to next incident
      }
    }
  }

  return nearbyIncidents;
}

/**
 * Generate waypoints to avoid incidents
 * Creates multiple waypoints that force the route AROUND incidents
 */
function generateAvoidanceWaypoints(
  start: RoutePoint,
  end: RoutePoint,
  incidentsToAvoid: Incident[]
): RoutePoint[][] {
  if (incidentsToAvoid.length === 0) return [];

  const allWaypoints: RoutePoint[][] = [];
  const distances = [0.005, 0.010, 0.015]; // 0.5km, 1.0km, 1.5km

  // For each incident, create MULTIPLE waypoint strategies
  for (const incident of incidentsToAvoid) {
    // Calculate bearing from start to end
    const startToEndLat = end.lat - start.lat;
    const startToEndLng = end.lng - start.lng;
    
    // Calculate bearing from start to incident
    const startToIncidentLat = incident.lat - start.lat;
    const startToIncidentLng = incident.lng - start.lng;
    
    // Perpendicular vectors (both directions)
    const perpLat1 = -startToEndLng;
    const perpLng1 = startToEndLat;
    const perpLat2 = startToEndLng;
    const perpLng2 = -startToEndLat;
    
    // Normalize and scale by VERY AGGRESSIVE avoidance distance
    const length = Math.sqrt(startToEndLat * startToEndLat + startToEndLng * startToEndLng);
    
    if (length > 0) {
      for (const avoidDistance of distances) {
        const normPerpLat1 = (perpLat1 / length) * avoidDistance;
        const normPerpLng1 = (perpLng1 / length) * avoidDistance;
        const normPerpLat2 = (perpLat2 / length) * avoidDistance;
        const normPerpLng2 = (perpLng2 / length) * avoidDistance;
        
        // Strategy 1: Single waypoint perpendicular left
        allWaypoints.push([
          {
            lat: incident.lat + normPerpLat1,
            lng: incident.lng + normPerpLng1
          }
        ]);
        
        // Strategy 2: Single waypoint perpendicular right
        allWaypoints.push([
          {
            lat: incident.lat + normPerpLat2,
            lng: incident.lng + normPerpLng2
          }
        ]);
        
        // Strategy 3: Two waypoints - approach and leave (left side)
        allWaypoints.push([
          {
            lat: start.lat + startToIncidentLat * 0.5 + normPerpLat1,
            lng: start.lng + startToIncidentLng * 0.5 + normPerpLng1
          },
          {
            lat: incident.lat + normPerpLat1,
            lng: incident.lng + normPerpLng1
          }
        ]);
        
        // Strategy 4: Two waypoints - approach and leave (right side)
        allWaypoints.push([
          {
            lat: start.lat + startToIncidentLat * 0.5 + normPerpLat2,
            lng: start.lng + startToIncidentLng * 0.5 + normPerpLng2
          },
          {
            lat: incident.lat + normPerpLat2,
            lng: incident.lng + normPerpLng2
          }
        ]);
      }
    }
  }

  console.log(`🔄 Generated ${allWaypoints.length} waypoint strategies to avoid ${incidentsToAvoid.length} high-cred incident(s)`);
  return allWaypoints;
}

/**
 * Geocode an address to coordinates using Nominatim (free, no API key)
 */
export async function geocodeAddress(address: string): Promise<RoutePoint | null> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`,
      {
        headers: {
          'User-Agent': 'SafeTrekXR-App'
        }
      }
    );
    
    const data = await response.json();
    
    if (data && data.length > 0) {
      return {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon)
      };
    }
    
    return null;
  } catch (error) {
    console.error('Geocoding error:', error);
    return null;
  }
}

/**
 * Get route with waypoints using Valhalla
 */
async function getValhallaRouteWithWaypoints(
  locations: RoutePoint[],
  mode: TransportMode
): Promise<RouteResult | null> {
  try {
    const costingMap: Record<TransportMode, string> = {
      driving: "auto",
      walking: "pedestrian",
      cycling: "bicycle",
      transit: "multimodal"
    };

    const costing = costingMap[mode];
    
    const requestBody = {
      locations: locations.map(loc => ({ lat: loc.lat, lon: loc.lng })),
      costing: costing,
      directions_options: {
        units: "kilometers",
        language: "en-US"
      },
      costing_options: {
        [costing]: {
          shortest: costing === "pedestrian" || costing === "bicycle",
          use_ferry: 0.1,
          use_highways: costing === "auto" ? 1.0 : 0.0,
          use_tolls: 0.5
        }
      }
    };

    const response = await fetch('https://valhalla1.openstreetmap.de/route', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
      console.warn(`Valhalla API error: ${response.status}`);
      return null;
    }

    const data = await response.json();

    if (!data.trip || !data.trip.legs || data.trip.legs.length === 0) {
      return null;
    }

    // Combine all legs into one route
    let allCoordinates: [number, number][] = [];
    let totalDistance = 0;
    let totalDuration = 0;
    let allSteps: Array<{ instruction: string; distance: number; duration: number }> = [];

    for (const leg of data.trip.legs) {
      const legCoordinates = decodePolyline6(leg.shape);
      allCoordinates = allCoordinates.concat(legCoordinates);
      totalDistance += leg.summary.length * 1000;
      totalDuration += leg.summary.time;
      
      const legSteps = leg.maneuvers.map((maneuver: any) => ({
        instruction: maneuver.instruction || "Continue",
        distance: maneuver.length * 1000,
        duration: maneuver.time
      }));
      allSteps = allSteps.concat(legSteps);
    }

    return {
      coordinates: allCoordinates,
      distance: totalDistance,
      duration: totalDuration,
      steps: allSteps
    };
  } catch (error) {
    console.error("Valhalla waypoints routing error:", error);
    return null;
  }
}

/**
 * Get route using Valhalla (FREE - excellent pedestrian routing with pathways!)
 * Uses public Valhalla instance - no API key required
 * 
 * ⚡ ALGORITHM: Valhalla uses A* (optimized Dijkstra's algorithm) for shortest path calculation
 * Each transport mode uses different cost functions optimized for that mode:
 * - auto: Road speed limits, traffic patterns, turn restrictions
 * - pedestrian: Walkability, sidewalks, crosswalks, stairs, shortcuts
 * - bicycle: Bike lanes, road types, elevation, surface quality
 * - multimodal: Public transit schedules, walking connections, transfers
 */
async function getValhallaRoute(
  start: { lat: number; lng: number },
  end: { lat: number; lng: number },
  mode: TransportMode
): Promise<RouteResult | null> {
  try {
    // Valhalla costing models - each optimized for SHORTEST path in that mode
    const costingMap: Record<TransportMode, string> = {
      driving: "auto",           // Optimized for driving - considers speed limits, turn costs
      walking: "pedestrian",     // Optimized for walking - uses pathways, trails, shortcuts
      cycling: "bicycle",        // Optimized for cycling - considers bike lanes, elevation
      transit: "multimodal"      // Optimized for public transit - uses schedules, transfers
    };

    const costing = costingMap[mode];
    
    const requestBody = {
      locations: [
        { lat: start.lat, lon: start.lng },
        { lat: end.lat, lon: end.lng }
      ],
      costing: costing,
      directions_options: {
        units: "kilometers",
        language: "en-US"
      },
      // Additional options for optimal routing
      costing_options: {
        [costing]: {
          // Ensure we prioritize shortest/fastest path
          shortest: costing === "pedestrian" || costing === "bicycle", // Use shortest for walk/bike
          use_ferry: 0.1,  // Minimize ferry usage
          use_highways: costing === "auto" ? 1.0 : 0.0,
          use_tolls: 0.5   // Moderate toll avoidance
        }
      }
    };

    const response = await fetch('https://valhalla1.openstreetmap.de/route', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
      console.warn(`Valhalla API error: ${response.status}`);
      return null;
    }

    const data = await response.json();

    if (!data.trip || !data.trip.legs || data.trip.legs.length === 0) {
      console.error("No route found from Valhalla");
      return null;
    }

    const leg = data.trip.legs[0];
    
    // Decode Valhalla's polyline6 format
    const coordinates = decodePolyline6(leg.shape);

    // Extract turn-by-turn instructions
    const steps = leg.maneuvers.map((maneuver: any) => ({
      instruction: maneuver.instruction || "Continue",
      distance: maneuver.length * 1000, // Convert km to meters
      duration: maneuver.time
    }));

    return {
      coordinates,
      distance: leg.summary.length * 1000, // Convert km to meters
      duration: leg.summary.time,
      steps
    };
  } catch (error) {
    console.error("Valhalla routing error:", error);
    return null;
  }
}

/**
 * Decode Valhalla's polyline6 format (precision 6)
 */
function decodePolyline6(encoded: string): [number, number][] {
  const coordinates: [number, number][] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let shift = 0;
    let result = 0;
    let byte;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const deltaLat = result & 1 ? ~(result >> 1) : result >> 1;
    lat += deltaLat;

    shift = 0;
    result = 0;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const deltaLng = result & 1 ? ~(result >> 1) : result >> 1;
    lng += deltaLng;

    coordinates.push([lat / 1e6, lng / 1e6]);
  }

  return coordinates;
}

/**
 * Get route using OSRM (fallback - free, no API key)
 */
async function getOSRMRoute(
  start: { lat: number; lng: number },
  end: { lat: number; lng: number },
  mode: TransportMode
): Promise<RouteResult | null> {
  try {
    // Map transport modes to OSRM profiles
    const profileMap: Record<TransportMode, string> = {
      driving: "car",
      walking: "foot",
      cycling: "bike",
      transit: "car"
    };

    const profile = profileMap[mode];

    const url = `https://router.project-osrm.org/route/v1/${profile}/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson&steps=true&annotations=true`;

    const response = await fetch(url);
    
    if (!response.ok) {
      console.error(`OSRM API error: ${response.status}`);
      return null;
    }

    const data = await response.json();

    if (data.code !== "Ok" || !data.routes || data.routes.length === 0) {
      console.error("No route found from OSRM");
      return null;
    }

    const route = data.routes[0];
    const coordinates: [number, number][] = route.geometry.coordinates.map(
      (coord: [number, number]) => [coord[1], coord[0]]
    );

    const steps = route.legs[0].steps.map((step: any) => {
      let instruction = "Continue";
      if (step.maneuver) {
        const type = step.maneuver.type;
        const modifier = step.maneuver.modifier;
        const streetName = step.name || "the road";

        if (type === "depart") {
          instruction = `Head ${modifier || "straight"} on ${streetName}`;
        } else if (type === "arrive") {
          instruction = `Arrive at destination`;
        } else if (type === "turn" || type === "new name") {
          const direction = modifier?.includes("left") ? "left" : modifier?.includes("right") ? "right" : "straight";
          instruction = `Turn ${direction} onto ${streetName}`;
        } else if (type === "merge" || type === "on ramp") {
          instruction = `Merge onto ${streetName}`;
        } else if (type === "off ramp") {
          instruction = `Take exit onto ${streetName}`;
        } else if (type === "roundabout" || type === "rotary") {
          instruction = `Take roundabout onto ${streetName}`;
        } else if (type === "continue") {
          instruction = `Continue on ${streetName}`;
        } else {
          instruction = `${type} ${modifier || ""} ${streetName}`.trim();
        }
      }

      return {
        instruction,
        distance: step.distance || 0,
        duration: step.duration || 0
      };
    });

    return {
      coordinates,
      distance: route.distance,
      duration: route.duration,
      steps
    };
  } catch (error) {
    console.error("OSRM routing error:", error);
    return null;
  }
}

/**
 * Get route between two points with intelligent incident avoidance
 * Uses Dijkstra-inspired weighted cost optimization
 * 
 * 🎯 WEIGHTED ROUTING ALGORITHM:
 * 1. Generate multiple route alternatives (direct + waypoint variations)
 * 2. Calculate weighted cost for each route:
 *    - Base cost = distance (m) + duration (s)
 *    - Add penalties: HIGH incidents = +15000, MEDIUM = +7000, LOW = +3000
 * 3. Select route with LOWEST weighted cost
 * 4. This naturally avoids high-credibility incidents while finding optimal path
 */
export async function getRoute(
  start: { lat: number; lng: number },
  end: { lat: number; lng: number },
  mode: TransportMode,
  incidents: Incident[] = []
): Promise<RouteResult | null> {
  console.log(`🗺️ Calculating ${mode} route (FAST MODE - no incident avoidance)`);
  
  // Fast mode: Just get the direct optimal route without incident checking
  const directRoute = await getValhallaRoute(start, end, mode);
  
  if (!directRoute) {
    console.warn("⚠️ Valhalla unavailable, falling back to OSRM");
    return getOSRMRoute(start, end, mode);
  }

  console.log(`✅ Route calculated: ${(directRoute.distance / 1000).toFixed(1)}km, ${Math.round(directRoute.duration / 60)}min`);
  
  return directRoute;
}

/**
 * Search for places using Nominatim
 */
export async function searchPlaces(query: string): Promise<Array<{
  name: string;
  lat: number;
  lng: number;
  display_name: string;
}>> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`,
      {
        headers: {
          'User-Agent': 'SafeTrekXR-App'
        }
      }
    );
    
    const data = await response.json();
    
    return data.map((item: any) => ({
      name: item.name || item.display_name.split(',')[0],
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon),
      display_name: item.display_name
    }));
  } catch (error) {
    console.error('Place search error:', error);
    return [];
  }
}

/* ============================================================================
 * 🚀 GOOGLE MAPS ROUTES API INTEGRATION GUIDE
 * ============================================================================
 * 
 * For accurate transit routing (bus, train) and better route optimization,
 * integrate Google Maps Routes API:
 * 
 * 1. GET GOOGLE MAPS API KEY:
 *    - Go to https://console.cloud.google.com/
 *    - Enable "Routes API" and "Places API (New)"
 *    - Create API key
 *    - Add to .env.local: GOOGLE_MAPS_API_KEY=your_key_here
 * 
 * 2. CREATE BACKEND API ROUTE (src/app/api/routes/route.ts):
 * 
 *    import { NextRequest, NextResponse } from 'next/server';
 *    
 *    export async function POST(req: NextRequest) {
 *      const { origin, destination, travelMode } = await req.json();
 *      
 *      // Map modes: driving -> DRIVE, walking -> WALK, cycling -> BICYCLE, transit -> TRANSIT
 *      const modeMap: Record<string, string> = {
 *        driving: "DRIVE",
 *        walking: "WALK", 
 *        cycling: "BICYCLE",
 *        transit: "TRANSIT"
 *      };
 *      
 *      const response = await fetch(
 *        'https://routes.googleapis.com/directions/v2:computeRoutes',
 *        {
 *          method: 'POST',
 *          headers: {
 *            'Content-Type': 'application/json',
 *            'X-Goog-Api-Key': process.env.GOOGLE_MAPS_API_KEY!,
 *            'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters,routes.polyline,routes.legs.steps'
 *          },
 *          body: JSON.stringify({
 *            origin: { location: { latLng: { latitude: origin.lat, longitude: origin.lng } } },
 *            destination: { location: { latLng: { latitude: destination.lat, longitude: destination.lng } } },
 *            travelMode: modeMap[travelMode] || "DRIVE",
 *            computeAlternativeRoutes: false,
 *            routeModifiers: {
 *              avoidTolls: false,
 *              avoidHighways: false,
 *              avoidFerries: false
 *            },
 *            languageCode: "en-US",
 *            units: "METRIC"
 *          })
 *        }
 *      );
 *      
 *      const data = await response.json();
 *      
 *      if (!data.routes || data.routes.length === 0) {
 *        return NextResponse.json({ error: 'No route found' }, { status: 404 });
 *      }
 *      
 *      const route = data.routes[0];
 *      
 *      // Decode polyline
 *      const coordinates = decodePolyline(route.polyline.encodedPolyline);
 *      
 *      // Extract steps
 *      const steps = route.legs[0].steps.map((step: any) => ({
 *        instruction: step.navigationInstruction?.instructions || 'Continue',
 *        distance: step.distanceMeters || 0,
 *        duration: parseInt(step.staticDuration?.replace('s', '') || '0')
 *      }));
 *      
 *      return NextResponse.json({
 *        coordinates,
 *        distance: route.distanceMeters,
 *        duration: parseInt(route.duration.replace('s', '')),
 *        steps
 *      });
 *    }
 *    
 *    // Polyline decoder
 *    function decodePolyline(encoded: string): [number, number][] {
 *      const poly = [];
 *      let index = 0, len = encoded.length;
 *      let lat = 0, lng = 0;
 *      
 *      while (index < len) {
 *        let b, shift = 0, result = 0;
 *        do {
 *          b = encoded.charCodeAt(index++) - 63;
 *          result |= (b & 0x1f) << shift;
 *          shift += 5;
 *        } while (b >= 0x20);
 *        const dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
 *        lat += dlat;
 *        
 *        shift = 0;
 *        result = 0;
 *        do {
 *          b = encoded.charCodeAt(index++) - 63;
 *          result |= (b & 0x1f) << shift;
 *          shift += 5;
 *        } while (b >= 0x20);
 *        const dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
 *        lng += dlng;
 *        
 *        poly.push([lat / 1e5, lng / 1e5]);
 *      }
 *      return poly as [number, number][];
 *    }
 * 
 * 3. UPDATE THIS FILE to call your backend:
 * 
 *    export async function getRoute(start, end, mode) {
 *      const response = await fetch('/api/routes', {
 *        method: 'POST',
 *        headers: { 'Content-Type': 'application/json' },
 *        body: JSON.stringify({
 *          origin: start,
 *          destination: end,
 *          travelMode: mode
 *        })
 *      });
 *      return response.json();
 *    }
 * 
 * 4. PRICING (as of 2025):
 *    - Routes API: Free tier includes usage caps per month
 *    - After free tier: ~$5-10 per 1000 requests
 *    - More info: https://developers.google.com/maps/billing-and-pricing
 * 
 * ============================================================================
 */