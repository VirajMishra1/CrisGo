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
  type?: string;
  lat: number;
  lng: number;
  title: string;
  credibility: "high" | "medium" | "low";
  description?: string;
  distance?: number;
  severity?: string;
  timestamp?: string;
  reports_count?: number;
  source?: {
    name: string;
    type: string;
    reliability: number;
  };
  credibility_scores?: {
    overall: number;
    prompt_v1?: number;
    prompt_v2?: number;
    source_reliability?: number;
    temporal_relevance?: number;
  };
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
  onDeleteIncident?: (id: string) => void;
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

// Severity color schemes — outer matches severity, not all red
const SEVERITY_STYLES: Record<string, { outer: string; inner: string; shadow: string }> = {
  high:   { outer: "#fee2e2", inner: "#dc2626", shadow: "rgba(220,38,38,0.4)" },
  medium: { outer: "#fef9c3", inner: "#ca8a04", shadow: "rgba(202,138,4,0.3)" },
  low:    { outer: "#dcfce7", inner: "#16a34a", shadow: "rgba(22,163,74,0.3)" },
};

const TYPE_ICON_PATHS: Record<string, string> = {
  earthquake: '<circle cx="8" cy="8" r="3" fill="none" stroke="#1e293b" stroke-width="1.5"/><path d="M8 1v2M8 13v2M1 8h2M13 8h2" stroke="#1e293b" stroke-width="1.5"/>',
  fire: '<path d="M8 2c0 3-4 5-4 8a4 4 0 008 0c0-3-4-5-4-8z" fill="#1e293b" opacity="0.9"/>',
  flooding: '<path d="M2 10c1.5-1.5 3-1.5 4.5 0s3 1.5 4.5 0M2 13c1.5-1.5 3-1.5 4.5 0s3 1.5 4.5 0" stroke="#1e293b" stroke-width="1.5" fill="none"/>',
  traffic: '<rect x="3" y="2" width="10" height="12" rx="2" fill="none" stroke="#1e293b" stroke-width="1.2"/><circle cx="8" cy="5" r="1.5" fill="#1e293b"/><circle cx="8" cy="11" r="1.5" fill="#1e293b"/>',
  power_outage: '<path d="M9 2L5 9h3l-1 5 4-7H8l1-5z" fill="#1e293b"/>',
  gas_leak: '<circle cx="8" cy="6" r="3" fill="none" stroke="#1e293b" stroke-width="1.2"/><path d="M6 9c-1 2-1 4 0 5M10 9c1 2 1 4 0 5" stroke="#1e293b" stroke-width="1.2" fill="none"/>',
};

const createCustomIcon = (type: string = "hazard", credibility: string, isUserReport: boolean = false) => {
  const style = SEVERITY_STYLES[credibility] || SEVERITY_STYLES.medium;
  const iconPath = TYPE_ICON_PATHS[type] || '';
  const size = 30;
  const innerSize = 18;

  const iconSvg = iconPath
    ? `<svg viewBox="0 0 16 16" width="12" height="12" style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%)">${iconPath}</svg>`
    : '';

  const microphoneBadge = isUserReport ? `
    <div style="position:absolute;top:-4px;right:-4px;width:16px;height:16px;background:#3B82F6;border:2px solid white;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 1px 4px rgba(59,130,246,0.5);z-index:10">
      <svg width="8" height="8" viewBox="0 0 24 24" fill="white"><path d="M12 2a3 3 0 00-3 3v7a3 3 0 006 0V5a3 3 0 00-3-3z"/><path d="M19 10v2a7 7 0 01-14 0v-2" fill="none" stroke="white" stroke-width="2"/></svg>
    </div>` : '';

  return L.divIcon({
    className: "custom-marker",
    html: `
      <div style="position:relative;width:${size}px;height:${size}px">
        <div style="
          width:${size}px;height:${size}px;
          background:${style.outer};
          border:2px solid white;
          border-radius:50%;
          box-shadow:0 2px 8px ${style.shadow}, 0 1px 3px rgba(0,0,0,0.15);
          display:flex;align-items:center;justify-content:center;
        ">
          <div style="
            position:relative;
            width:${innerSize}px;height:${innerSize}px;
            background:${style.inner};
            border-radius:50%;
          ">${iconSvg}</div>
        </div>
        ${microphoneBadge}
      </div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
};

const TRANSPORT_COLORS = {
  driving:  { main: "#2563eb", border: "#1d4ed8", lighter: "#93c5fd" },
  transit:  { main: "#2563eb", border: "#1d4ed8", lighter: "#93c5fd" },
  walking:  { main: "#ea580c", border: "#c2410c", lighter: "#fdba74" },
  cycling:  { main: "#16a34a", border: "#15803d", lighter: "#86efac" },
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
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
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
          background: rgba(148, 163, 184, 0.2);
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
          background: #94a3b8;
          border: 3px solid white;
          border-radius: 50%;
          box-shadow: 0 2px 8px rgba(0,0,0,0.15);
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
  onDeleteIncident,
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
              <div className="text-sm min-w-[220px] max-w-[280px]">
                <h3 className="font-bold text-sm text-gray-900 leading-snug mb-2">{incident.title}</h3>

                <div className="flex flex-wrap gap-1.5 mb-2">
                  <span className="capitalize text-[11px] font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                    {incident.type || "hazard"}
                  </span>
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                    incident.credibility === "high" ? "bg-red-100 text-red-700" :
                    incident.credibility === "medium" ? "bg-amber-100 text-amber-700" :
                    "bg-emerald-100 text-emerald-700"
                  }`}>
                    {incident.credibility} severity
                  </span>
                </div>

                {incident.description && (
                  <p className="text-gray-500 text-xs mb-2 line-clamp-2">{incident.description}</p>
                )}

                <div className="flex items-center gap-3 text-[11px] text-gray-400 mb-2">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {incident.lat.toFixed(4)}, {incident.lng.toFixed(4)}
                  </span>
                  {incident.reports_count !== undefined && (
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {incident.reports_count} report{incident.reports_count !== 1 ? "s" : ""}
                    </span>
                  )}
                </div>

                {incident.source && (
                  <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                      incident.source.type === "official" ? "bg-blue-50 text-blue-600" :
                      incident.source.type === "news" ? "bg-purple-50 text-purple-600" :
                      "bg-gray-50 text-gray-500"
                    }`}>
                      {incident.source.name}
                    </span>
                    <span className="text-[10px] text-gray-400">
                      {Math.round(incident.source.reliability * 100)}% reliable
                    </span>
                  </div>
                )}

                {String(incident.id).startsWith("user-report-") && onDeleteIncident && (
                  <button
                    onClick={() => onDeleteIncident(String(incident.id))}
                    className="mt-2 w-full text-[11px] font-medium text-red-500 hover:text-red-700 hover:bg-red-50 border border-red-200 rounded py-1 transition-colors"
                  >
                    Delete my report
                  </button>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* Selected incident details overlay */}
      {selectedIncident && (
        <div className={`absolute bottom-6 left-6 right-6 lg:left-auto lg:right-6 lg:w-96 rounded-2xl p-5 shadow-xl border z-[1000] bg-white/95 backdrop-blur-sm ${
          selectedIncident.credibility === "high" ? "border-red-200" :
          selectedIncident.credibility === "medium" ? "border-amber-200" :
          "border-emerald-200"
        }`}>
          <button
            onClick={() => onIncidentClick(null)}
            className="absolute top-3 right-3 p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="flex items-start gap-3">
            <div className={`p-2.5 rounded-xl ${
              selectedIncident.credibility === "high" ? "bg-red-100" :
              selectedIncident.credibility === "medium" ? "bg-amber-100" :
              "bg-emerald-100"
            }`}>
              <AlertTriangle className={`w-5 h-5 ${
                selectedIncident.credibility === "high" ? "text-red-600" :
                selectedIncident.credibility === "medium" ? "text-amber-600" :
                "text-emerald-600"
              }`} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-bold text-gray-900 mb-1 pr-6">{selectedIncident.title}</h3>
              {selectedIncident.description && (
                <p className="text-gray-500 text-sm mb-2 line-clamp-2">{selectedIncident.description}</p>
              )}
              <div className="flex flex-wrap items-center gap-2">
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                  selectedIncident.credibility === "high" ? "bg-red-100 text-red-700" :
                  selectedIncident.credibility === "medium" ? "bg-amber-100 text-amber-700" :
                  "bg-emerald-100 text-emerald-700"
                }`}>
                  {selectedIncident.credibility} severity
                </span>
                {selectedIncident.source && (
                  <span className="text-xs text-gray-400">
                    via {selectedIncident.source.name}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}