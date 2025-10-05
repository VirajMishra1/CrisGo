import { NextRequest, NextResponse } from "next/server";

// Using OSRM (Open Source Routing Machine) - completely free, no API key needed
const OSRM_BASE_URL = "https://router.project-osrm.org/route/v1/driving";

// Nominatim for geocoding - free OpenStreetMap service
const NOMINATIM_BASE_URL = "https://nominatim.openstreetmap.org/search";

async function geocodeLocation(location: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const response = await fetch(
      `${NOMINATIM_BASE_URL}?q=${encodeURIComponent(location)}&format=json&limit=1&countrycodes=us`,
      {
        headers: {
          "User-Agent": "SafeTrekXR-DisasterNav/1.0"
        }
      }
    );

    if (!response.ok) {
      throw new Error("Geocoding failed");
    }

    const data = await response.json();
    
    if (data && data.length > 0) {
      return {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon)
      };
    }

    return null;
  } catch (error) {
    console.error("Geocoding error:", error);
    return null;
  }
}

async function getRoute(start: { lat: number; lng: number }, end: { lat: number; lng: number }) {
  try {
    // OSRM expects coordinates in lng,lat format
    const url = `${OSRM_BASE_URL}/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson&steps=true`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error("Routing failed");
    }

    const data = await response.json();
    
    if (data.code !== "Ok" || !data.routes || data.routes.length === 0) {
      throw new Error("No route found");
    }

    const route = data.routes[0];
    
    // Convert coordinates from [lng, lat] to [lat, lng] for Leaflet
    const coordinates = route.geometry.coordinates.map((coord: number[]) => [coord[1], coord[0]]);
    
    return {
      coordinates,
      distance: route.distance, // in meters
      duration: route.duration, // in seconds
      steps: route.legs[0].steps.map((step: any) => ({
        instruction: step.maneuver.instruction || `${step.maneuver.type}`,
        distance: step.distance,
        duration: step.duration
      }))
    };
  } catch (error) {
    console.error("Routing error:", error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { startLocation, endLocation } = body;

    if (!startLocation || !endLocation) {
      return NextResponse.json(
        { error: "Start and end locations are required" },
        { status: 400 }
      );
    }

    // Geocode both locations
    const startCoords = await geocodeLocation(startLocation);
    const endCoords = await geocodeLocation(endLocation);

    if (!startCoords) {
      return NextResponse.json(
        { error: "Could not find start location" },
        { status: 404 }
      );
    }

    if (!endCoords) {
      return NextResponse.json(
        { error: "Could not find end location" },
        { status: 404 }
      );
    }

    // Get the route
    const route = await getRoute(startCoords, endCoords);

    if (!route) {
      return NextResponse.json(
        { error: "Could not calculate route" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      route: {
        coordinates: route.coordinates,
        distance: route.distance,
        duration: route.duration,
        steps: route.steps,
        start: startCoords,
        end: endCoords
      }
    });
  } catch (error) {
    console.error("Route API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}