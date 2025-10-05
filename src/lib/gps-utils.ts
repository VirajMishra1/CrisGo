// GPS and Navigation Utilities for AR

export interface Coordinate {
  lat: number;
  lng: number;
}

/**
 * Calculate distance between two points in meters using Haversine formula
 */
export function calculateDistance(
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
 * Calculate bearing from point A to point B in degrees (0-360)
 * 0° = North, 90° = East, 180° = South, 270° = West
 */
export function calculateBearing(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;

  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  const θ = Math.atan2(y, x);
  const bearing = ((θ * 180) / Math.PI + 360) % 360;

  return bearing;
}

/**
 * Find the next waypoint on the route that user should head towards
 * Returns the closest upcoming waypoint within look-ahead distance
 */
export function findNextWaypoint(
  currentLocation: Coordinate,
  routeCoordinates: [number, number][],
  lookAheadMeters: number = 100
): { waypoint: [number, number]; index: number; distance: number } | null {
  if (!routeCoordinates || routeCoordinates.length === 0) return null;

  let closestIndex = 0;
  let minDistance = Infinity;

  // Find closest point on route
  for (let i = 0; i < routeCoordinates.length; i++) {
    const [lat, lng] = routeCoordinates[i];
    const distance = calculateDistance(currentLocation.lat, currentLocation.lng, lat, lng);
    
    if (distance < minDistance) {
      minDistance = distance;
      closestIndex = i;
    }
  }

  // Look ahead from closest point
  const lookAheadIndex = Math.min(
    closestIndex + 5, // Look 5 points ahead
    routeCoordinates.length - 1
  );

  const nextWaypoint = routeCoordinates[lookAheadIndex];
  const distanceToNext = calculateDistance(
    currentLocation.lat,
    currentLocation.lng,
    nextWaypoint[0],
    nextWaypoint[1]
  );

  return {
    waypoint: nextWaypoint,
    index: lookAheadIndex,
    distance: distanceToNext
  };
}

/**
 * Get cardinal direction from bearing
 */
export function getCardinalDirection(bearing: number): string {
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const index = Math.round(bearing / 45) % 8;
  return directions[index];
}

/**
 * Check proximity to incidents and return incident severity levels
 * Returns the highest severity level within range
 */
export interface ProximityResult {
  severity: 'safe' | 'low' | 'medium' | 'high';
  nearestIncident: any | null;
  distance: number;
  incidentsInRange: any[];
}

export function checkProximityToIncidents(
  currentLocation: Coordinate,
  incidents: any[],
  highRadius: number = 100,   // Red zone: within 100m
  mediumRadius: number = 300, // Yellow zone: within 300m
  lowRadius: number = 500     // Orange zone: within 500m
): ProximityResult {
  let nearestIncident = null;
  let minDistance = Infinity;
  let highestSeverity: 'safe' | 'low' | 'medium' | 'high' = 'safe';
  const incidentsInRange: any[] = [];

  for (const incident of incidents) {
    const distance = calculateDistance(
      currentLocation.lat,
      currentLocation.lng,
      incident.lat,
      incident.lng
    );

    if (distance < lowRadius) {
      incidentsInRange.push({ ...incident, distance });
    }

    if (distance < minDistance) {
      minDistance = distance;
      nearestIncident = incident;
    }

    // Determine severity based on distance and credibility
    if (distance < highRadius && incident.credibility === 'high') {
      highestSeverity = 'high';
    } else if (distance < mediumRadius && highestSeverity !== 'high') {
      if (incident.credibility === 'high' || incident.credibility === 'medium') {
        highestSeverity = 'medium';
      }
    } else if (distance < lowRadius && highestSeverity === 'safe') {
      highestSeverity = 'low';
    }
  }

  return {
    severity: highestSeverity,
    nearestIncident,
    distance: minDistance,
    incidentsInRange
  };
}

/**
 * Calculate remaining distance along route from current position
 */
export function calculateRemainingDistance(
  currentLocation: Coordinate,
  routeCoordinates: [number, number][]
): number {
  if (!routeCoordinates || routeCoordinates.length === 0) return 0;

  // Find closest point on route
  let closestIndex = 0;
  let minDistance = Infinity;

  for (let i = 0; i < routeCoordinates.length; i++) {
    const [lat, lng] = routeCoordinates[i];
    const distance = calculateDistance(currentLocation.lat, currentLocation.lng, lat, lng);
    
    if (distance < minDistance) {
      minDistance = distance;
      closestIndex = i;
    }
  }

  // Calculate distance from closest point to end
  let totalDistance = 0;
  for (let i = closestIndex; i < routeCoordinates.length - 1; i++) {
    const [lat1, lng1] = routeCoordinates[i];
    const [lat2, lng2] = routeCoordinates[i + 1];
    totalDistance += calculateDistance(lat1, lng1, lat2, lng2);
  }

  return totalDistance;
}