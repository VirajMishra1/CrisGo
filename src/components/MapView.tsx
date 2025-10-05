"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { AlertTriangle, X, MapPin, Users } from "lucide-react";

// Fix Leaflet default icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

interface Incident {
  id: string;
  type?: "hazard";
  lat: number;
  lng: number;
  title: string;
  credibility: "high" | "medium" | "low";
  description?: string;
  distance?: string;
  reports_count?: number;
}

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

interface MapViewProps {
  onIncidentClick: (incident: Incident | null) => void;
  selectedIncident: Incident | null;
  showIncidents: boolean;
  routeData?: RouteData | null;
  alternativeRoute?: RouteData | null;
  transportMode?: string;
  currentLocation?: { lat: number; lng: number } | null;
  isNavigating?: boolean;
  incidents: Incident[];
}

// NYC center coordinates
const NYC_CENTER: [number, number] = [40.7128, -74.0060];

// Custom marker icons
const createCustomIcon = (type: string, credibility: string, isUserReport: boolean = false) => {
  // For high credibility: lighter red outer with darker red inner
  if (credibility === "high") {
    const microphoneBadge = isUserReport ? `
      <div style="
        position: absolute;
        top: -6px;
        right: -6px;
        width: 20px;
        height: 20px;
        background: #3B82F6;
        border: 2px solid white;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 2px 8px rgba(59, 130, 246, 0.6);
        z-index: 10;
      ">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/>
          <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
          <line x1="12" y1="19" x2="12" y2="23"/>
        </svg>
      </div>
    ` : '';

    return L.divIcon({
      className: "custom-marker",
      html: `
        <div style="position: relative;">
          <div style="
            width: 40px;
            height: 40px;
            background: #f87171;
            border: 3px solid white;
            border-radius: 50%;
            box-shadow: 0 4px 12px rgba(0,0,0,0.4);
            display: flex;
            align-items: center;
            justify-content: center;
            ${isUserReport ? 'animation: user-report-pulse 2s ease-in-out infinite;' : ''}
          ">
            <div style="
              width: 16px;
              height: 16px;
              background: #dc2626;
              border-radius: 50%;
            "></div>
          </div>
          ${microphoneBadge}
        </div>
        ${isUserReport ? `
          <style>
            @keyframes user-report-pulse {
              0%, 100% { transform: scale(1); box-shadow: 0 4px 12px rgba(0,0,0,0.4); }
              50% { transform: scale(1.1); box-shadow: 0 4px 20px rgba(59, 130, 246, 0.6); }
            }
          </style>
        ` : ''}
      `,
      iconSize: [40, 40],
      iconAnchor: [20, 20],
    });
  }
  
  // Medium and low credibility with colored inner circles
  const innerColors = {
    medium: "#facc15",    // yellow-400
    low: "#22c55e"        // green-500
  };
  
  const innerColor = innerColors[credibility as keyof typeof innerColors] || "#facc15";
  
  const microphoneBadge = isUserReport ? `
    <div style="
      position: absolute;
      top: -6px;
      right: -6px;
      width: 20px;
      height: 20px;
      background: #3B82F6;
      border: 2px solid white;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 2px 8px rgba(59, 130, 246, 0.6);
      z-index: 10;
    ">
      <svg width="10" height="10" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/>
        <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
        <line x1="12" y1="19" x2="12" y2="23"/>
      </svg>
    </div>
  ` : '';
  
  return L.divIcon({
    className: "custom-marker",
    html: `
      <div style="position: relative;">
        <div style="
          width: 40px;
          height: 40px;
          background: #f87171;
          border: 3px solid white;
          border-radius: 50%;
          box-shadow: 0 4px 12px rgba(0,0,0,0.4);
          display: flex;
          align-items: center;
          justify-content: center;
          ${isUserReport ? 'animation: user-report-pulse 2s ease-in-out infinite;' : ''}
        ">
          <div style="
            width: 16px;
            height: 16px;
            background: ${innerColor};
            border-radius: 50%;
          "></div>
        </div>
        ${microphoneBadge}
      </div>
      ${isUserReport ? `
        <style>
          @keyframes user-report-pulse {
            0%, 100% { transform: scale(1); box-shadow: 0 4px 12px rgba(0,0,0,0.4); }
            50% { transform: scale(1.1); box-shadow: 0 4px 20px rgba(59, 130, 246, 0.6); }
          }
        </style>
      ` : ''}
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  });
};

// Transport mode color configuration - Google Maps style
const TRANSPORT_COLORS = {
  driving: {
    main: "#4285F4",      // Google Maps blue
    border: "#1a73e8",
    lighter: "#93BAF8"
  },
  transit: {
    main: "#34A853",      // Google Maps green
    border: "#0F9D58",
    lighter: "#81C995"
  },
  walking: {
    main: "#FBBC04",      // Google Maps yellow/orange
    border: "#F9AB00",
    lighter: "#FDD663"
  },
  cycling: {
    main: "#9334E9",      // Purple for cycling
    border: "#7E22CE",
    lighter: "#C084FC"
  }
};

// Google Maps-style start/end markers
const createRouteMarker = (label: string, color: string) => {
  return L.divIcon({
    className: "custom-marker",
    html: `
      <div style="position: relative;">
        <div style="
          width: 48px;
          height: 48px;
          background: ${color};
          border: 4px solid white;
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          box-shadow: 0 4px 12px rgba(0,0,0,0.4);
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          <div style="
            transform: rotate(45deg);
            color: white;
            font-weight: bold;
            font-size: 18px;
            font-family: 'Inter', sans-serif;
          ">${label}</div>
        </div>
      </div>
    `,
    iconSize: [48, 48],
    iconAnchor: [24, 42],
  });
};

// Custom current location marker (blue pulsing dot)
const createCurrentLocationIcon = () => {
  return L.divIcon({
    className: "custom-marker",
    html: `
      <div style="position: relative; width: 32px; height: 32px;">
        <div style="
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 32px;
          height: 32px;
          background: rgba(66, 133, 244, 0.2);
          border-radius: 50%;
          animation: pulse 2s ease-in-out infinite;
        "></div>
        <div style="
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 16px;
          height: 16px;
          background: #4285F4;
          border: 3px solid white;
          border-radius: 50%;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        "></div>
      </div>
      <style>
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
          50% { opacity: 0.3; transform: translate(-50%, -50%) scale(1.3); }
        }
      </style>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
};

// Component to automatically fit bounds when route changes
function MapController({ routeData, currentLocation, isNavigating }: { 
  routeData: RouteData | null;
  currentLocation: { lat: number; lng: number } | null;
  isNavigating: boolean;
}) {
  const map = useMap();

  useEffect(() => {
    if (routeData && routeData.coordinates.length > 0) {
      const bounds = L.latLngBounds(routeData.coordinates);
      map.fitBounds(bounds, { 
        padding: [100, 100],
        maxZoom: 15,
        animate: true,
        duration: 0.8
      });
    }
  }, [routeData, map]);

  // Center on current location when navigating
  useEffect(() => {
    if (isNavigating && currentLocation) {
      map.setView([currentLocation.lat, currentLocation.lng], map.getZoom(), {
        animate: true,
        duration: 0.5
      });
    }
  }, [currentLocation, isNavigating, map]);

  return null;
}

export default function MapView({ 
  onIncidentClick, 
  selectedIncident, 
  showIncidents,
  routeData = null,
  alternativeRoute = null,
  transportMode = "driving",
  currentLocation = null,
  isNavigating = false,
  incidents
}: MapViewProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="w-full h-full bg-slate-900 flex items-center justify-center">
        <div className="text-white">Loading map...</div>
      </div>
    );
  }

  const filteredIncidents = showIncidents ? incidents : [];

  // Get colors for current transport mode
  const modeColors = TRANSPORT_COLORS[transportMode as keyof typeof TRANSPORT_COLORS] || TRANSPORT_COLORS.driving;

  return (
    <div className="w-full h-full relative">
      <MapContainer
        center={NYC_CENTER}
        zoom={13}
        style={{ height: "100%", width: "100%" }}
        zoomControl={true}
        className="z-0"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        <MapController 
          routeData={routeData} 
          currentLocation={currentLocation}
          isNavigating={isNavigating}
        />
        
        {/* Alternative/Old route (shown with reduced opacity) */}
        {alternativeRoute && alternativeRoute.coordinates.length > 0 && (
          <>
            <Polyline
              positions={alternativeRoute.coordinates}
              pathOptions={{
                color: "#9CA3AF",
                weight: 10,
                opacity: 0.15,
                lineJoin: "round",
                lineCap: "round",
                dashArray: "15, 15"
              }}
            />
            <Polyline
              positions={alternativeRoute.coordinates}
              pathOptions={{
                color: "#6B7280",
                weight: 5,
                opacity: 0.4,
                lineJoin: "round",
                lineCap: "round",
                dashArray: "15, 15"
              }}
            />
          </>
        )}
        
        {/* Main/New route with transport mode color */}
        {routeData && routeData.coordinates.length > 0 && (
          <>
            <Polyline
              positions={routeData.coordinates}
              pathOptions={{
                color: modeColors.border,
                weight: 12,
                opacity: 0.25,
                lineJoin: "round",
                lineCap: "round"
              }}
            />
            
            <Polyline
              positions={routeData.coordinates}
              pathOptions={{
                color: modeColors.main,
                weight: 7,
                opacity: 1,
                lineJoin: "round",
                lineCap: "round",
                dashArray: transportMode === "walking" ? "10, 10" : undefined
              }}
            />
            
            <Marker
              position={[routeData.start.lat, routeData.start.lng]}
              icon={createRouteMarker("A", "#34A853")}
            >
              <Popup>
                <div className="text-sm font-semibold">Starting Point</div>
              </Popup>
            </Marker>
            
            <Marker
              position={[routeData.end.lat, routeData.end.lng]}
              icon={createRouteMarker("B", "#EA4335")}
            >
              <Popup>
                <div className="text-sm font-semibold">Destination</div>
              </Popup>
            </Marker>
          </>
        )}

        {/* Current location marker (blue pulsing dot) */}
        {currentLocation && (
          <Marker
            position={[currentLocation.lat, currentLocation.lng]}
            icon={createCurrentLocationIcon()}
            zIndexOffset={1000}
          >
            <Popup>
              <div className="text-sm font-semibold">Your Current Location</div>
            </Popup>
          </Marker>
        )}

        {/* Incident markers */}
        {filteredIncidents.map((incident) => (
          <Marker
            key={incident.id}
            position={[incident.lat, incident.lng]}
            icon={createCustomIcon(incident.type, incident.credibility, incident.reports_count !== undefined)}
            eventHandlers={{
              click: () => onIncidentClick(incident)
            }}
          >
            <Popup>
              <div className="text-sm min-w-[200px]">
                <h3 className="font-bold mb-2 text-base">{incident.title}</h3>
                
                {/* Location */}
                <div className="flex items-start gap-2 mb-2 text-gray-700 dark:text-gray-300">
                  <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0 text-blue-500" />
                  <div className="text-xs">
                    <div className="font-medium">Location:</div>
                    <div className="text-gray-600 dark:text-gray-400">
                      {incident.lat.toFixed(4)}, {incident.lng.toFixed(4)}
                    </div>
                  </div>
                </div>

                {/* Incident Type */}
                <div className="flex items-start gap-2 mb-2 text-gray-700 dark:text-gray-300">
                  <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0 text-orange-500" />
                  <div className="text-xs">
                    <div className="font-medium">Type:</div>
                    <div className="text-gray-600 dark:text-gray-400 capitalize">
                      {incident.type || "hazard"}
                    </div>
                  </div>
                </div>

                {/* Reports Count */}
                {incident.reports_count !== undefined && (
                  <div className="flex items-start gap-2 mb-3 text-gray-700 dark:text-gray-300">
                    <Users className="w-4 h-4 mt-0.5 flex-shrink-0 text-green-500" />
                    <div className="text-xs">
                      <div className="font-medium">Reports:</div>
                      <div className="text-gray-600 dark:text-gray-400">
                        {incident.reports_count} {incident.reports_count === 1 ? "person" : "people"} reported this
                      </div>
                    </div>
                  </div>
                )}

                {/* Description */}
                {incident.description && (
                  <p className="text-gray-600 dark:text-gray-400 mb-3 text-xs">
                    {incident.description}
                  </p>
                )}

                {/* Credibility Badge */}
                <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                  incident.credibility === "high" ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300" :
                  incident.credibility === "medium" ? "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300" :
                  "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300"
                }`}>
                  {incident.credibility} credibility
                </span>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* Selected incident details overlay */}
      {selectedIncident && (
        <div className={`absolute bottom-8 left-8 right-8 rounded-xl p-6 shadow-2xl border z-[1000] ${
          selectedIncident.credibility === "high" ? "bg-red-50 dark:bg-red-950/50 border-red-200 dark:border-red-500/30" :
          selectedIncident.credibility === "medium" ? "bg-yellow-50 dark:bg-yellow-950/50 border-yellow-200 dark:border-yellow-500/30" :
          "bg-green-50 dark:bg-green-950/50 border-green-200 dark:border-green-500/30"
        }`}>
          <button
            onClick={() => onIncidentClick(null)}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-lg ${
              selectedIncident.credibility === "high" ? "bg-red-500/20" :
              selectedIncident.credibility === "medium" ? "bg-yellow-500/20" :
              "bg-green-500/20"
            }`}>
              <AlertTriangle className={`w-6 h-6 ${
                selectedIncident.credibility === "high" ? "text-red-400" :
                selectedIncident.credibility === "medium" ? "text-yellow-400" :
                "text-green-400"
              }`} />
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{selectedIncident.title}</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-3">{selectedIncident.description}</p>
              <div className="flex gap-4 text-sm">
                <span className="text-gray-500 dark:text-gray-400">Distance: {selectedIncident.distance}</span>
                <span className={`font-medium ${
                  selectedIncident.credibility === "high" ? "text-red-400" :
                  selectedIncident.credibility === "medium" ? "text-yellow-400" :
                  "text-green-400"
                }`}>
                  {selectedIncident.credibility.toUpperCase()} Credibility
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}