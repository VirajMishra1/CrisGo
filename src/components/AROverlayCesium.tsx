"use client";

import { motion } from "framer-motion";
import { Navigation, AlertTriangle, MapPin, Compass } from "lucide-react";
import { useEffect, useState, useRef } from "react";

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

interface AROverlayProps {
  routeData?: RouteData | null;
}

export default function AROverlayCesium({ 
  routeData = null
}: AROverlayProps) {
  const [heading, setHeading] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);
  const cesiumContainerRef = useRef<HTMLDivElement>(null);
  const [cesiumReady, setCesiumReady] = useState(false);

  useEffect(() => {
    // Simulate compass heading changes
    const interval = setInterval(() => {
      setHeading((prev) => (prev + 1) % 360);
    }, 100);
    
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Initialize Cesium viewer when component mounts
    let viewer: any;
    
    const initCesium = async () => {
      if (typeof window !== "undefined" && cesiumContainerRef.current) {
        try {
          const Cesium = await import("cesium");
          
          // Set Cesium ion access token (using default token for testing)
          Cesium.Ion.defaultAccessToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJlYWE1OWUxNy1mMWZiLTQzYjYtYTQ0OS1kMWFjYmFkNjc5YzciLCJpZCI6NTc3MzMsImlhdCI6MTYyNzg0NTE4Mn0.XcKpgANiY19MC4bdFUXMVEBToBmqS8kuYpUlxJHYZxk";
          
          viewer = new Cesium.Viewer(cesiumContainerRef.current, {
            terrainProvider: Cesium.createWorldTerrain(),
            imageryProvider: new Cesium.IonImageryProvider({ assetId: 2 }),
            baseLayerPicker: false,
            geocoder: false,
            homeButton: false,
            sceneModePicker: false,
            navigationHelpButton: false,
            animation: false,
            timeline: false,
            fullscreenButton: false,
            vrButton: false,
            infoBox: false,
            selectionIndicator: false,
          });

          // Set initial camera position (NYC)
          viewer.camera.setView({
            destination: Cesium.Cartesian3.fromDegrees(-74.0060, 40.7128, 1000),
            orientation: {
              heading: Cesium.Math.toRadians(0),
              pitch: Cesium.Math.toRadians(-45),
              roll: 0.0
            }
          });

          // Add route if available
          if (routeData && routeData.coordinates.length > 0) {
            const positions = routeData.coordinates.map(([lat, lng]) =>
              Cesium.Cartesian3.fromDegrees(lng, lat, 50)
            );

            viewer.entities.add({
              polyline: {
                positions: positions,
                width: 5,
                material: new Cesium.PolylineArrowMaterialProperty(Cesium.Color.CYAN),
                clampToGround: true,
              },
            });

            // Add start marker
            viewer.entities.add({
              position: Cesium.Cartesian3.fromDegrees(
                routeData.start.lng,
                routeData.start.lat,
                100
              ),
              billboard: {
                image: createPinImage("#10b981", "A"),
                verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
                scale: 0.5,
              },
            });

            // Add end marker
            viewer.entities.add({
              position: Cesium.Cartesian3.fromDegrees(
                routeData.end.lng,
                routeData.end.lat,
                100
              ),
              billboard: {
                image: createPinImage("#ef4444", "B"),
                verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
                scale: 0.5,
              },
            });

            // Fly to route
            viewer.flyTo(viewer.entities);
          }

          setCesiumReady(true);
        } catch (error) {
          console.error("Error initializing Cesium:", error);
        }
      }
    };

    initCesium();

    return () => {
      if (viewer && !viewer.isDestroyed()) {
        viewer.destroy();
      }
    };
  }, [routeData]);

  // Helper function to create colored pin images
  const createPinImage = (color: string, text: string) => {
    const canvas = document.createElement("canvas");
    canvas.width = 80;
    canvas.height = 100;
    const ctx = canvas.getContext("2d");
    
    if (ctx) {
      // Draw pin shape
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(40, 40, 30, 0, Math.PI * 2);
      ctx.fill();
      
      // Draw text
      ctx.fillStyle = "white";
      ctx.font = "bold 32px Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(text, 40, 40);
    }
    
    return canvas.toDataURL();
  };

  const formatDistance = (meters: number) => {
    if (meters < 1000) return `${Math.round(meters)}m`;
    return `${(meters / 1000).toFixed(1)}km`;
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.round(seconds / 60);
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}min`;
  };

  return (
    <div className="relative w-full h-full bg-slate-900 overflow-hidden">
      {/* Cesium 3D Globe Container */}
      <div 
        ref={cesiumContainerRef} 
        className="absolute inset-0"
        style={{ width: "100%", height: "100%" }}
      />

      {/* Overlay UI */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Top HUD */}
        <div className="absolute top-4 left-0 right-0 flex justify-center z-10 pointer-events-auto">
          <div className="bg-slate-900/80 backdrop-blur-md px-6 py-3 rounded-full border border-cyan-500/30">
            <div className="flex items-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"/>
                <span className="text-white">AR Mode Active - 3D View</span>
              </div>
              <div className="h-4 w-px bg-cyan-500/30"/>
              <div className="flex items-center gap-2 text-cyan-300">
                <Compass className="w-4 h-4" />
                <span className="font-bold">{Math.round(heading)}°</span>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Instructions */}
        {routeData && routeData.steps && routeData.steps.length > 0 && (
          <motion.div
            className="absolute top-24 left-1/2 -translate-x-1/2 pointer-events-auto"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <div className="bg-cyan-500/20 backdrop-blur-md px-6 py-4 rounded-2xl border border-cyan-400/50 max-w-md">
              <div className="flex items-center gap-3">
                <Navigation className="w-8 h-8 text-cyan-400 drop-shadow-[0_0_15px_rgba(6,182,212,0.8)]" />
                <div>
                  <p className="text-cyan-300 font-bold text-lg">
                    {routeData.steps[currentStep]?.instruction || "Follow the route"}
                  </p>
                  {routeData.steps[currentStep] && (
                    <p className="text-cyan-200 text-sm mt-1">
                      {formatDistance(routeData.steps[currentStep].distance)} ahead
                    </p>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Hazard Warning */}
        <motion.div
          className="absolute top-1/2 right-8 -translate-y-1/2 pointer-events-auto"
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1 }}
        >
          <div className="bg-red-500/20 backdrop-blur-md p-4 rounded-xl border border-red-400/50 max-w-xs">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-6 h-6 text-red-400 flex-shrink-0" />
              <div>
                <h3 className="text-white font-bold text-sm mb-1">Hazard Detected</h3>
                <p className="text-red-300 text-xs">Flooding reported 200m ahead on current route</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Bottom HUD - Route Info */}
        {routeData && (
          <div className="absolute bottom-8 left-0 right-0 flex justify-center z-10 pointer-events-auto">
            <div className="bg-slate-900/95 backdrop-blur-md px-8 py-4 rounded-2xl border border-cyan-500/30 shadow-2xl max-w-2xl w-full mx-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-cyan-300 text-xs mb-1">Distance Remaining</p>
                  <p className="text-white font-bold text-2xl">{formatDistance(routeData.distance)}</p>
                </div>
                <div className="h-12 w-px bg-cyan-500/30"/>
                <div>
                  <p className="text-cyan-300 text-xs mb-1">ETA</p>
                  <p className="text-white font-bold text-2xl">{formatDuration(routeData.duration)}</p>
                </div>
                <div className="h-12 w-px bg-cyan-500/30"/>
                <div>
                  <p className="text-cyan-300 text-xs mb-1">Next Turn</p>
                  <p className="text-white font-bold text-lg">
                    {routeData.steps[currentStep]?.instruction.split(" ").slice(0, 2).join(" ") || "Continue"}
                  </p>
                </div>
              </div>
              
              {/* Route warning */}
              <div className="mt-3 pt-3 border-t border-cyan-500/20">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-orange-400" />
                  <p className="text-orange-300 text-xs">1 incident detected on route</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Cesium Loading indicator */}
        {!cesiumReady && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm pointer-events-auto">
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"/>
              <p className="text-white text-lg font-bold">Loading 3D View...</p>
              <p className="text-cyan-300 text-sm mt-2">Powered by Cesium</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}