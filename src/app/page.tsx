"use client";

import { useState, useEffect } from "react";
import dynamicImport from "next/dynamic";
import TopNav from "@/components/TopNav";
import MapLegend from "@/components/MapLegend";
import RouteInfoCard from "@/components/RouteInfoCard";
import CredibilityViewer from "@/components/CredibilityViewer";
import IncidentFilters from "@/components/IncidentFilters";
import VoiceReportDialog from "@/components/VoiceReportDialog";
import MapSkeleton from "@/components/MapSkeleton";
import ErrorBoundary from "@/components/ErrorBoundary";
import { geocodeAddress, getRoute, type RouteResult, type TransportMode, type Incident } from "@/lib/routing";
import { speakText } from "@/lib/tts";
import { toast } from "sonner";

// Dynamically import components that need browser APIs (Leaflet, camera, etc.)
const MapView = dynamicImport(() => import("@/components/MapView"), { ssr: false, loading: () => <MapSkeleton /> });
const AROverlay = dynamicImport(() => import("@/components/AROverlay"), { ssr: false });

// Prevent static generation
export const dynamic = 'force-dynamic';

// Full route data with start/end points for map display
interface RouteData {
  coordinates: [number, number][];
  distance: number;
  duration: number;
  steps: Array<{
    instruction: string;
    distance: number;
    duration: number;
  }>;
  start: { lat: number; lng: number };
  end: { lat: number; lng: number };
}

export default function Home() {
  // Add mounted state to prevent SSR issues
  const [isMounted, setIsMounted] = useState(false);
  
  const [currentView, setCurrentView] = useState<"dashboard" | "ar">("dashboard");
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [showIncidents, setShowIncidents] = useState(true);
  const [allIncidents, setAllIncidents] = useState<Incident[]>([]);
  const [displayIncidents, setDisplayIncidents] = useState<Incident[]>([]);
  
  const [routeData, setRouteData] = useState<RouteData | null>(null);
  const [alternativeRoute, setAlternativeRoute] = useState<RouteData | null>(null);
  const [isCalculatingRoute, setIsCalculatingRoute] = useState(false);
  const [currentTransportMode, setCurrentTransportMode] = useState<string>("driving");
  
  // Location tracking state
  const [isNavigating, setIsNavigating] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [watchId, setWatchId] = useState<number | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);

  // Add voice report dialog state
  const [showVoiceReportDialog, setShowVoiceReportDialog] = useState(false);
  const [reportedIncidents, setReportedIncidents] = useState<Incident[]>([]);

  // Incident filter state
  const [filterTypes, setFilterTypes] = useState<Set<string>>(new Set());
  const [filterSeverities, setFilterSeverities] = useState<Set<string>>(new Set(["high", "medium", "low"]));
  const [filterSources, setFilterSources] = useState<Set<string>>(new Set());

  // Set mounted state after client-side hydration
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Fetch real incidents from API on mount
  useEffect(() => {
    if (!isMounted) return;

    const fetchIncidents = async () => {
      try {
        const resp = await fetch("/api/incidents?mode=events");
        if (!resp.ok) throw new Error(`API returned ${resp.status}`);
        const data = await resp.json();

        const events = data.events || [];
        const raw = events.length > 0 ? events : (data.incidents || []);

        const credMap: Record<string, "high" | "medium" | "low"> = {
          high: "high", medium: "medium", low: "low",
        };
        const sourceReliability: Record<string, number> = {
          "USGS": 1.0, "National Weather Service": 1.0, "GDACS": 0.95,
          "NYC 311 Open Data": 0.85, "Google News": 0.75, "Reddit": 0.55,
        };

        const convertedIncidents: Incident[] = raw.map((item: any) => {
          const isEvent = !!item.event_id;
          const sourceName = isEvent
            ? (item.source_names?.[0] || "Unknown")
            : (item.source || "Unknown");
          const sourceType = isEvent
            ? (item.sources?.[0]?.source_type || "official")
            : (item.source_type || "official");
          const rel = sourceReliability[sourceName] || 0.7;
          const corr = item.corroboration_count || 1;

          const credScore = item.credibility?.final_score
            ? item.credibility.final_score / 5.0
            : rel;

          return {
            id: item.event_id || item.id,
            type: item.type || "hazard",
            lat: item.lat,
            lng: item.lng,
            title: item.title || item.description || "Incident",
            credibility: credMap[item.severity] || "medium",
            description: item.description || "",
            distance: 0,
            severity: item.severity || "medium",
            timestamp: item.last_reported || item.first_reported || item.timestamp || new Date().toISOString(),
            reports_count: corr,
            source: { name: sourceName, type: sourceType, reliability: rel },
            credibility_scores: {
              overall: credScore,
              prompt_v1: credScore,
              prompt_v2: credScore,
              source_reliability: rel,
              temporal_relevance: item.credibility?.temporal_decay || 0.9,
              corroboration: Math.min(corr / 5.0, 1.0),
            },
          };
        });

        setAllIncidents(convertedIncidents);
      } catch (error) {
        console.error("Failed to fetch incidents:", error);
        toast.error("Failed to load live incident data");
      }
    };

    fetchIncidents();
    const interval = setInterval(fetchIncidents, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [isMounted]);

  // Initialize filter sets when incidents load
  useEffect(() => {
    if (allIncidents.length === 0) return;
    const types = new Set(allIncidents.map(i => i.type || "hazard"));
    const sources = new Set(allIncidents.map(i => i.source?.name).filter(Boolean) as string[]);
    setFilterTypes(types);
    setFilterSources(sources);
    setFilterSeverities(new Set(["high", "medium", "low"]));
  }, [allIncidents]);

  // Apply filters to displayIncidents
  useEffect(() => {
    const combined = [...allIncidents, ...reportedIncidents];
    const filtered = combined.filter(i => {
      const type = i.type || "hazard";
      const sev = i.severity || i.credibility || "medium";
      const src = i.source?.name || "";
      return filterTypes.has(type) && filterSeverities.has(sev) && (filterSources.size === 0 || filterSources.has(src));
    });
    setDisplayIncidents(filtered);
  }, [allIncidents, reportedIncidents, filterTypes, filterSeverities, filterSources]);

  const handleToggleType = (type: string) => {
    setFilterTypes(prev => {
      const next = new Set(prev);
      next.has(type) ? next.delete(type) : next.add(type);
      return next;
    });
  };

  const handleToggleSeverity = (severity: string) => {
    setFilterSeverities(prev => {
      const next = new Set(prev);
      next.has(severity) ? next.delete(severity) : next.add(severity);
      return next;
    });
  };

  const handleToggleSource = (source: string) => {
    setFilterSources(prev => {
      const next = new Set(prev);
      next.has(source) ? next.delete(source) : next.add(source);
      return next;
    });
  };

  const handleClearFilters = () => {
    const types = new Set(allIncidents.map(i => i.type || "hazard"));
    const sources = new Set(allIncidents.map(i => i.source?.name).filter(Boolean) as string[]);
    setFilterTypes(types);
    setFilterSources(sources);
    setFilterSeverities(new Set(["high", "medium", "low"]));
  };

  // Start navigation and location tracking
  const handleStartNavigation = () => {
    if (!routeData) {
      toast.error("Please calculate a route first");
      return;
    }

    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      setLocationError("Geolocation not supported");
      return;
    }

    // Check if we're in a secure context
    const isSecureContext = typeof window !== 'undefined' && (
      window.location.protocol === 'https:' || 
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1'
    );
    
    if (!isSecureContext) {
      toast.error("Location access requires HTTPS or localhost");
      setLocationError("Requires HTTPS");
      return;
    }

    setIsNavigating(true);
    setLocationError(null);
    
    // Automatically switch to AR view
    setCurrentView("ar");
    
    toast.info("Starting AR Navigation...", { duration: 2000 });

    // Speak the first direction using TTS
    if (routeData.steps && routeData.steps.length > 0) {
      const firstDirection = routeData.steps[0].instruction;
      speakText(firstDirection).catch((error) => {
        console.error("TTS error:", error);
        // Don't show error to user, just log it
      });
    }

    // First try to get current position with high accuracy
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const newLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        setCurrentLocation(newLocation);
        console.log('✅ GPS location acquired:', newLocation, 'accuracy:', position.coords.accuracy, 'm');
        toast.success(`Location acquired! (±${Math.round(position.coords.accuracy)}m accuracy)`);
      },
      (error) => {
        console.error("Initial geolocation error:", error);
        // Don't show error yet, try with lower accuracy
        console.log('High accuracy failed, trying with lower accuracy...');
        
        // Fallback: Try with lower accuracy settings
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const newLocation = {
              lat: position.coords.latitude,
              lng: position.coords.longitude
            };
            setCurrentLocation(newLocation);
            console.log('✅ GPS location acquired (low accuracy):', newLocation);
            toast.success("Location acquired with approximate accuracy");
          },
          (fallbackError) => {
            console.error("Fallback geolocation error:", fallbackError);
            handleLocationError(fallbackError);
          },
          {
            enableHighAccuracy: false,
            timeout: 20000,
            maximumAge: 5000
          }
        );
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0
      }
    );

    // Then start continuous tracking with high accuracy
    const id = navigator.geolocation.watchPosition(
      (position) => {
        const newLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        setCurrentLocation(newLocation);
        setLocationError(null);
        console.log('📍 GPS updated:', newLocation, 'accuracy:', position.coords.accuracy, 'm');
      },
      (error) => {
        console.error("Geolocation watch error:", error);
        // Don't stop navigation on watch errors, just log them
        console.log('Watch position error, continuing with last known location');
      },
      {
        enableHighAccuracy: true,
        maximumAge: 2000,
        timeout: 30000 // Increased timeout for GPS lock
      }
    );

    setWatchId(id);
    console.log('🎯 GPS watch started with ID:', id);
  };

  // Handle location errors with helpful messages
  const handleLocationError = (error: GeolocationPositionError) => {
    let errorMessage = "Could not get your location";
    let toastMessage = errorMessage;
    
    switch (error.code) {
      case error.PERMISSION_DENIED:
        errorMessage = "Location access denied";
        toastMessage = "Please allow location access in your browser settings to use AR navigation";
        break;
      case error.POSITION_UNAVAILABLE:
        errorMessage = "Location unavailable";
        toastMessage = "Location information is unavailable. Make sure you're outdoors or near a window.";
        break;
      case error.TIMEOUT:
        errorMessage = "GPS signal timeout";
        toastMessage = "GPS signal timeout. Move outdoors for better reception and try again.";
        break;
    }
    
    setLocationError(errorMessage);
    toast.error(toastMessage, { duration: 7000 });
  };

  // Stop navigation and location tracking
  const handleStopNavigation = () => {
    if (watchId !== null && typeof navigator !== 'undefined') {
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
    }
    setIsNavigating(false);
    setCurrentLocation(null);
    setLocationError(null);
    
    // Switch back to dashboard
    setCurrentView("dashboard");
    
    toast.info("Navigation stopped");
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (watchId !== null && typeof navigator !== 'undefined') {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [watchId]);

  const handleToggleIncidents = () => {
    setShowIncidents(prev => !prev);
  };

  const handleCalculateRoute = async (start: string, end: string, mode: string) => {
    setIsCalculatingRoute(true);
    
    // Save old route as alternative if exists
    if (routeData) {
      setAlternativeRoute(routeData);
    }
    
    setRouteData(null);
    setCurrentTransportMode(mode);
    
    try {
      const startCoords = await geocodeAddress(start);
      const endCoords = await geocodeAddress(end);

      if (!startCoords || !endCoords) {
        toast.error("Could not find one or both locations");
        setIsCalculatingRoute(false);
        return;
      }

      // Pass all incidents to routing function for intelligent avoidance
      const route = await getRoute(startCoords, endCoords, mode as TransportMode, allIncidents);

      if (route) {
        const fullRouteData: RouteData = {
          coordinates: route.coordinates,
          distance: route.distance,
          duration: route.duration,
          steps: route.steps,
          start: startCoords,
          end: endCoords
        };
        
        setRouteData(fullRouteData);
        toast.success(`Route calculated: ${(route.distance / 1000).toFixed(1)} km, ~${Math.round(route.duration / 60)} min`);
      } else {
        toast.error("Could not calculate route");
        setRouteData(null);
      }
    } catch (error) {
      console.error("Route calculation error:", error);
      toast.error("Error calculating route");
      setRouteData(null);
    } finally {
      setIsCalculatingRoute(false);
    }
  };

  const handleReportIncident = () => {
    console.log("Report incident - opening voice dialog");
    setShowVoiceReportDialog(true);
  };

  const handleIncidentReported = (incident: {
    lat: number;
    lng: number;
    type: string;
    description: string;
    severity: string;
    reports_count: number;
  }) => {
    // Create new incident object
    const newIncident: Incident = {
      id: `user-report-${Date.now()}`,
      type: incident.type as any,
      lat: incident.lat,
      lng: incident.lng,
      title: incident.description,
      credibility: incident.severity === "high" ? "high" : incident.severity === "medium" ? "medium" : "low",
      description: incident.description,
      distance: 0,
      severity: incident.severity as any,
      timestamp: new Date().toISOString(),
      source: { name: "User Report (Voice)", type: "user_report", reliability: 0.8 },
      credibility_scores: {
        overall: 0.8,
        prompt_v1: 0.8,
        prompt_v2: 0.8,
        source_reliability: 0.8,
        temporal_relevance: 1.0
      },
      reports_count: incident.reports_count
    };

    setReportedIncidents(prev => [...prev, newIncident]);
    setFilterSources(prev => new Set([...prev, "User Report (Voice)"]));
    
    // Close dialog
    setShowVoiceReportDialog(false);
    
    // Show success message
    toast.success("Incident has been added to the map!");
  };

  // Show loading state during SSR
  if (!isMounted) {
    return (
      <div className="relative w-screen h-screen overflow-hidden bg-slate-900">
        <MapSkeleton />
      </div>
    );
  }

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-900">
      <TopNav 
        currentView={currentView} 
        onViewChange={setCurrentView}
        onCalculateRoute={handleCalculateRoute}
        onReportIncident={handleReportIncident}
        isCalculating={isCalculatingRoute}
      />

      <div className="absolute top-[57px] lg:top-[73px] left-0 right-0 bottom-0">
        <ErrorBoundary fallbackTitle="Map failed to load">
          {currentView === "dashboard" ? (
            <div className="relative w-full h-full">
              <MapView
                onIncidentClick={setSelectedIncident}
                onDeleteIncident={(id) => {
                  setReportedIncidents(prev => prev.filter(i => i.id !== id));
                  setSelectedIncident(null);
                }}
                selectedIncident={selectedIncident}
                showIncidents={showIncidents}
                routeData={routeData}
                alternativeRoute={alternativeRoute}
                transportMode={currentTransportMode}
                currentLocation={currentLocation}
                isNavigating={isNavigating}
                incidents={displayIncidents}
              />
              <MapLegend showIncidents={showIncidents} onToggleIncidents={handleToggleIncidents} />
              <IncidentFilters
                incidents={allIncidents}
                activeTypes={filterTypes}
                activeSeverities={filterSeverities}
                activeSources={filterSources}
                onToggleType={handleToggleType}
                onToggleSeverity={handleToggleSeverity}
                onToggleSource={handleToggleSource}
                onClearAll={handleClearFilters}
              />
              {routeData && (
                <RouteInfoCard
                  routeInfo={routeData}
                  transportMode={currentTransportMode}
                  isNavigating={isNavigating}
                  onStartNavigation={handleStartNavigation}
                  onStopNavigation={handleStopNavigation}
                />
              )}
              <CredibilityViewer incidents={allIncidents} />
            </div>
          ) : (
            <AROverlay
              currentLocation={currentLocation}
              routeCoordinates={routeData?.coordinates || []}
              routeSteps={routeData?.steps}
              currentStepIndex={0}
              totalRouteDistance={routeData?.distance || 0}
              totalRouteDuration={routeData?.duration || 0}
              incidents={displayIncidents}
            />
          )}
        </ErrorBoundary>
      </div>

      {/* Voice Report Dialog */}
      <VoiceReportDialog
        open={showVoiceReportDialog}
        onClose={() => setShowVoiceReportDialog(false)}
        onIncidentReported={handleIncidentReported}
      />
    </div>
  );
}