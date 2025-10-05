"use client";

import { useState, useEffect, useRef } from "react";
import { Navigation, AlertTriangle, Camera, Compass } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Canvas } from "@react-three/fiber";
import * as THREE from "three";

interface RouteStep {
  instruction: string;
  distance: number;
  duration: number;
}

interface Incident {
  id: string;
  lat: number;
  lng: number;
  credibility: "high" | "medium" | "low";
  title: string;
  description: string;
}

interface AROverlayProps {
  currentLocation?: { lat: number; lng: number } | null;
  routeCoordinates?: [number, number][];
  routeSteps?: RouteStep[];
  currentStepIndex?: number;
  totalRouteDistance?: number;
  totalRouteDuration?: number;
  incidents?: Incident[];
}

// 3D Arrow Component
function Arrow3D({ rotation }: { rotation: number }) {
  const meshRef = useRef<THREE.Group>(null);

  // Direct rotation update when prop changes (no smoothing - instant response)
  useEffect(() => {
    if (meshRef.current) {
      // Y-axis rotation for compass heading
      meshRef.current.rotation.y = (rotation * Math.PI) / 180;
      // X-axis rotation to tilt arrow forward at 45 degrees
      meshRef.current.rotation.x = -Math.PI / 4; // -45 degrees
      console.log('➡️ Arrow rotation applied:', {
        degrees: Math.round(rotation),
        radians: ((rotation * Math.PI) / 180).toFixed(2),
        tilt: '45° forward'
      });
    }
  }, [rotation]);

  // Pulsing animation only
  useEffect(() => {
    if (!meshRef.current) return;
    
    let frame = 0;
    const animate = () => {
      if (meshRef.current) {
        // Pulsing scale effect
        const pulse = Math.sin(frame * 0.05) * 0.15 + 1;
        meshRef.current.scale.set(pulse, pulse, pulse);
        
        // Moving forward/backward effect
        const movement = Math.sin(frame * 0.03) * 0.3;
        meshRef.current.position.z = movement;
        
        frame++;
      }
      requestAnimationFrame(animate);
    };
    
    const animationId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationId);
  }, []);

  // Create a single chevron shape (>) facing the camera - REDUCED SIZE
  const ChevronShape = ({ position }: { position: [number, number, number] }) => (
    <group position={position}>
      {/* Upper arm of > - smaller size */}
      <mesh position={[0.2, 0.2, 0]} rotation={[0, 0, Math.PI / 4]}>
        <boxGeometry args={[0.5, 0.12, 0.2]} />
        <meshStandardMaterial 
          color="#3b82f6"
          emissive="#3b82f6"
          emissiveIntensity={0.5}
          metalness={0.6}
          roughness={0.2}
        />
      </mesh>
      
      {/* Lower arm of > - smaller size */}
      <mesh position={[0.2, -0.2, 0]} rotation={[0, 0, -Math.PI / 4]}>
        <boxGeometry args={[0.5, 0.12, 0.2]} />
        <meshStandardMaterial 
          color="#3b82f6"
          emissive="#3b82f6"
          emissiveIntensity={0.5}
          metalness={0.6}
          roughness={0.2}
        />
      </mesh>
    </group>
  );

  return (
    <group ref={meshRef}>
      {/* Three chevrons with reduced spacing (>>>) */}
      <ChevronShape position={[-1.2, 0, 0]} />
      <ChevronShape position={[0, 0, 0]} />
      <ChevronShape position={[1.2, 0, 0]} />
    </group>
  );
}

// Calculate bearing from point A to point B
function calculateBearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  const θ = Math.atan2(y, x);
  const bearing = ((θ * 180) / Math.PI + 360) % 360;

  return bearing;
}

// Calculate distance between two points (in meters)
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

export default function AROverlay({ 
  currentLocation = null,
  routeCoordinates = [],
  routeSteps = [],
  currentStepIndex = 0,
  totalRouteDistance = 0,
  totalRouteDuration = 0,
  incidents = [],
}: AROverlayProps) {
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [deviceHeading, setDeviceHeading] = useState<number | null>(null);
  const [orientationPermission, setOrientationPermission] = useState<string>("pending");
  const [showPermissionButton, setShowPermissionButton] = useState(false);
  const [nearbyIncident, setNearbyIncident] = useState<{ incident: Incident; distance: number } | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const cameraAttemptedRef = useRef(false);

  // Check for nearby incidents
  useEffect(() => {
    if (!currentLocation || incidents.length === 0) {
      setNearbyIncident(null);
      return;
    }

    let closestIncident: { incident: Incident; distance: number } | null = null;
    let minDistance = Infinity;

    for (const incident of incidents) {
      const distance = calculateDistance(
        currentLocation.lat,
        currentLocation.lng,
        incident.lat,
        incident.lng
      );

      // Check if within 20 meters
      if (distance <= 20 && distance < minDistance) {
        minDistance = distance;
        closestIncident = { incident, distance };
      }
    }

    if (closestIncident) {
      console.log(`🎯 Near incident: ${closestIncident.incident.title} (${Math.round(closestIncident.distance)}m away)`);
    }

    setNearbyIncident(closestIncident);
  }, [currentLocation, incidents]);

  // Get overlay color based on incident credibility
  const getOverlayColor = (credibility: "high" | "medium" | "low") => {
    switch (credibility) {
      case "high":
        return "rgba(34, 197, 94, 0.25)"; // Green
      case "medium":
        return "rgba(234, 179, 8, 0.25)"; // Yellow
      case "low":
        return "rgba(239, 68, 68, 0.25)"; // Red
      default:
        return "rgba(255, 255, 255, 0)";
    }
  };

  const getOverlayBorderColor = (credibility: "high" | "medium" | "low") => {
    switch (credibility) {
      case "high":
        return "rgba(34, 197, 94, 0.6)"; // Green
      case "medium":
        return "rgba(234, 179, 8, 0.6)"; // Yellow
      case "low":
        return "rgba(239, 68, 68, 0.6)"; // Red
      default:
        return "rgba(255, 255, 255, 0)";
    }
  };

  // Find next waypoint in route
  const getNextWaypoint = (): { lat: number; lng: number; distance: number } | null => {
    if (!currentLocation || routeCoordinates.length === 0) return null;

    let closestWaypoint = null;
    let minDistance = Infinity;

    for (const coord of routeCoordinates) {
      const [lng, lat] = coord;
      const distance = calculateDistance(
        currentLocation.lat,
        currentLocation.lng,
        lat,
        lng
      );

      if (distance > 10 && distance < minDistance) {
        minDistance = distance;
        closestWaypoint = { lat, lng, distance };
      }
    }

    return closestWaypoint;
  };

  // Calculate remaining distance along route
  const getRemainingDistance = (): number => {
    if (!currentLocation || routeCoordinates.length === 0) return totalRouteDistance;

    const nextWaypoint = getNextWaypoint();
    if (!nextWaypoint) return totalRouteDistance;

    let nextWaypointIndex = -1;
    for (let i = 0; i < routeCoordinates.length; i++) {
      const [lng, lat] = routeCoordinates[i];
      const dist = calculateDistance(currentLocation.lat, currentLocation.lng, lat, lng);
      if (dist < 20) {
        nextWaypointIndex = i;
        break;
      }
    }

    if (nextWaypointIndex === -1) {
      return totalRouteDistance;
    }

    let remainingDistance = nextWaypoint.distance;
    
    for (let i = nextWaypointIndex; i < routeCoordinates.length - 1; i++) {
      const [lng1, lat1] = routeCoordinates[i];
      const [lng2, lat2] = routeCoordinates[i + 1];
      remainingDistance += calculateDistance(lat1, lng1, lat2, lng2);
    }

    return remainingDistance;
  };

  // Calculate arrow rotation
  const getArrowRotation = (): { rotation: number; bearing: number; distance: string } => {
    const nextWaypoint = getNextWaypoint();
    let targetBearing: number;
    
    if (currentLocation && nextWaypoint) {
      targetBearing = calculateBearing(
        currentLocation.lat,
        currentLocation.lng,
        nextWaypoint.lat,
        nextWaypoint.lng
      );
    } else {
      targetBearing = 0;
    }
    
    const rotation = deviceHeading !== null ? targetBearing - deviceHeading : targetBearing;

    // Use remaining route distance instead of straight-line distance
    const remainingDistance = getRemainingDistance();
    const formattedDistance = remainingDistance >= 1000 
      ? `${(remainingDistance / 1000).toFixed(1)} km`
      : `${Math.round(remainingDistance)} m`;

    console.log('🧭 Compass Behavior:', {
      targetBearing: `${targetBearing.toFixed(2)}°`,
      deviceHeading: deviceHeading !== null ? `${Math.round(deviceHeading)}°` : 'null',
      arrowRotation: `${Math.round(rotation)}°`,
      distance: formattedDistance,
      explanation: 'Arrow points to target, rotates as you turn'
    });

    // Round bearing to 2 decimal places
    return { rotation, bearing: parseFloat(targetBearing.toFixed(2)), distance: formattedDistance };
  };

  // Request orientation permission (for iOS)
  const requestOrientationPermission = async () => {
    if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
      try {
        const permissionState = await (DeviceOrientationEvent as any).requestPermission();
        console.log('🔐 Permission granted:', permissionState);
        setOrientationPermission(permissionState);
        setShowPermissionButton(false);
        
        if (permissionState === 'granted') {
          // Reload listeners
          window.location.reload();
        }
      } catch (err) {
        console.error('❌ Permission denied:', err);
        setOrientationPermission('denied');
      }
    }
  };

  // Get device compass heading with improved orientation tracking
  useEffect(() => {
    let isSubscribed = true;
    let lastUpdate = 0;

    const handleOrientation = (event: DeviceOrientationEvent) => {
      if (!isSubscribed) return;
      
      const now = Date.now();
      if (now - lastUpdate < 50) return; // Reduced throttle for smoother updates
      lastUpdate = now;
      
      let heading: number | null = null;

      // iOS devices with webkitCompassHeading (most reliable for iOS)
      if ('webkitCompassHeading' in event && typeof (event as any).webkitCompassHeading === 'number') {
        heading = (event as any).webkitCompassHeading;
        console.log('📱 iOS Compass Update:', Math.round(heading), '°');
      }
      // Android and other devices use alpha
      else if (event.alpha !== null) {
        // Normalize alpha to compass heading
        heading = 360 - event.alpha;
        console.log('📱 Android Alpha Update:', Math.round(heading), '°');
      }

      if (heading !== null) {
        setDeviceHeading(heading);
        setOrientationPermission('granted');
      }
    };

    const handleAbsoluteOrientation = (event: DeviceOrientationEvent) => {
      if (!isSubscribed) return;
      
      const now = Date.now();
      if (now - lastUpdate < 50) return; // Reduced throttle
      lastUpdate = now;
      
      // Absolute orientation gives us true compass heading
      if (event.alpha !== null) {
        const heading = event.alpha;
        setDeviceHeading(heading);
        setOrientationPermission('granted');
        console.log('📱 Absolute orientation update:', Math.round(heading), '°');
      }
    };

    // Check if we need to request permission (iOS 13+)
    if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
      console.log('🔐 iOS device detected - permission required');
      setShowPermissionButton(true);
      
      // Try to request permission automatically
      (DeviceOrientationEvent as any).requestPermission()
        .then((permissionState: string) => {
          console.log('🔐 Auto permission state:', permissionState);
          setOrientationPermission(permissionState);
          setShowPermissionButton(permissionState !== 'granted');
          
          if (permissionState === 'granted') {
            window.addEventListener('deviceorientationabsolute', handleAbsoluteOrientation as any, true);
            window.addEventListener('deviceorientation', handleOrientation);
            console.log('✅ iOS orientation listeners added');
          }
        })
        .catch((err: any) => {
          console.error('❌ Auto permission failed:', err);
          setShowPermissionButton(true);
        });
    } else {
      // Android and other devices: directly add listeners
      window.addEventListener('deviceorientationabsolute', handleAbsoluteOrientation as any, true);
      window.addEventListener('deviceorientation', handleOrientation);
      console.log('✅ Android orientation listeners added');
      
      // Check if events are firing
      setTimeout(() => {
        if (deviceHeading === null) {
          console.warn('⚠️ No orientation data received after 3 seconds');
        }
      }, 3000);
    }

    return () => {
      isSubscribed = false;
      window.removeEventListener('deviceorientationabsolute', handleAbsoluteOrientation as any, true);
      window.removeEventListener('deviceorientation', handleOrientation);
    };
  }, []);

  const arrowData = getArrowRotation();
  const remainingDistance = getRemainingDistance();
  const currentStep = routeSteps[currentStepIndex];

  // Stop existing camera stream
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  // Start camera
  const startCamera = async () => {
    if (cameraAttemptedRef.current) {
      return;
    }
    cameraAttemptedRef.current = true;

    stopCamera();

    try {
      const constraints = {
        video: {
          facingMode: "environment",
          width: { ideal: 1920, max: 1920 },
          height: { ideal: 1080, max: 1080 }
        },
        audio: false
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play()
            .then(() => {
              setCameraActive(true);
              setCameraError(null);
            })
            .catch(err => {
              setCameraError("Failed to play video");
            });
        };
      }
    } catch (error: any) {
      let errorMessage = "Camera access failed";
      if (error.name === 'NotAllowedError') {
        errorMessage = "Camera permission denied. Please allow camera access.";
      } else if (error.name === 'NotFoundError') {
        errorMessage = "No camera found on device";
      } else if (error.name === 'NotReadableError') {
        errorMessage = "Camera is being used by another application";
      }
      
      setCameraError(errorMessage);
      setCameraActive(false);
    }
  };

  const retryCamera = () => {
    cameraAttemptedRef.current = false;
    setCameraError(null);
    setCameraActive(false);
    startCamera();
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      startCamera();
    }, 100);

    return () => {
      clearTimeout(timer);
      stopCamera();
    };
  }, []);

  return (
    <div className="relative w-full h-full overflow-hidden bg-black">
      {/* Camera feed */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="absolute inset-0 w-full h-full object-cover"
      />

      {/* Colored Overlay - Shows when near an incident */}
      {cameraActive && nearbyIncident && (
        <div 
          className="absolute inset-0 pointer-events-none z-20 transition-all duration-500 animate-pulse"
          style={{
            backgroundColor: getOverlayColor(nearbyIncident.incident.credibility),
            boxShadow: `inset 0 0 100px ${getOverlayBorderColor(nearbyIncident.incident.credibility)}`,
          }}
        >
          {/* Incident Alert Badge - Simplified */}
          <div className="absolute top-20 left-1/2 -translate-x-1/2">
            <div 
              className="px-4 py-2 rounded-full backdrop-blur-md border shadow-2xl"
              style={{
                backgroundColor: getOverlayColor(nearbyIncident.incident.credibility).replace('0.25', '0.9'),
                borderColor: getOverlayBorderColor(nearbyIncident.incident.credibility),
              }}
            >
              <p className="text-white font-bold text-sm">
                📍 {nearbyIncident.incident.title}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Camera Error Overlay */}
      {cameraError && (
        <div className="absolute inset-0 bg-slate-900/95 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="text-center px-6 max-w-md">
            <Camera className="w-16 h-16 text-red-400 mx-auto mb-4" />
            <h3 className="text-white font-bold text-xl mb-2">Camera Error</h3>
            <p className="text-slate-300 text-sm mb-6">{cameraError}</p>
            <button
              onClick={retryCamera}
              className="px-6 py-3 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg font-semibold transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      )}

      {/* Loading State */}
      {!cameraActive && !cameraError && (
        <div className="absolute inset-0 bg-slate-900 flex items-center justify-center z-40">
          <div className="text-center">
            <Camera className="w-16 h-16 text-cyan-400 mx-auto mb-4 animate-pulse" />
            <p className="text-white text-lg mb-2">Starting Camera...</p>
            <p className="text-slate-400 text-sm">Please allow camera access</p>
          </div>
        </div>
      )}

      {/* iOS orientation permission button */}
      {showPermissionButton && cameraActive && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 text-center">
          <div className="bg-slate-900/95 backdrop-blur-md px-8 py-6 rounded-2xl border border-cyan-500/30 shadow-2xl">
            <Compass className="w-12 h-12 text-cyan-400 mx-auto mb-4" />
            <h3 className="text-white font-bold text-lg mb-2">Compass Access Required</h3>
            <p className="text-slate-300 text-sm mb-6 max-w-xs">
              To show navigation arrows, we need access to your device's compass
            </p>
            <button
              onClick={requestOrientationPermission}
              className="px-6 py-3 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg font-semibold transition-colors"
            >
              Enable Compass
            </button>
          </div>
        </div>
      )}

      {/* 3D navigation arrow */}
      {cameraActive && arrowData && (
        <div className="absolute inset-0 pointer-events-none z-30">
          <Canvas
            camera={{ position: [0, 0, 5], fov: 50 }}
            style={{ width: '100%', height: '100%' }}
          >
            <ambientLight intensity={0.8} />
            <directionalLight position={[10, 10, 5]} intensity={1.5} />
            <pointLight position={[-10, -10, -5]} intensity={0.5} />
            <Arrow3D rotation={arrowData.rotation} />
          </Canvas>
        </div>
      )}

      {/* AR Live Status Badge - pushed down */}
      {cameraActive && (
        <div className="absolute top-20 left-4 z-40">
          <div className="bg-green-500/90 backdrop-blur-sm text-white px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-2 shadow-lg">
            <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
            AR Live
          </div>
        </div>
      )}

      {/* Navigation Info - Top Right Corner */}
      {cameraActive && arrowData && (
        <div className="absolute top-4 right-4 z-40">
          <div className="bg-black/80 backdrop-blur-md text-white px-4 py-3 rounded-xl shadow-lg border border-white/10">
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1.5">
                <Navigation className="w-4 h-4 text-blue-400" />
                <span className="font-semibold">{arrowData.distance}</span>
              </div>
              <div className="w-px h-4 bg-white/20"></div>
              <div className="flex items-center gap-1.5">
                <span className="text-gray-400">Bearing</span>
                <span className="font-semibold">{arrowData.bearing}°</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Current Instruction - Bottom Center */}
      {cameraActive && routeSteps && routeSteps.length > 0 && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-40 max-w-md px-4">
          <div className="bg-slate-900/90 backdrop-blur-md px-6 py-3 rounded-2xl border border-white/20 shadow-2xl">
            <p className="text-white text-sm font-medium text-center leading-snug">
              {currentStep.instruction}
            </p>
          </div>
        </div>
      )}

      {/* GPS Status - Only show when acquiring */}
      {cameraActive && !currentLocation && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-orange-500/20 backdrop-blur-sm border border-orange-400/40 px-6 py-2 rounded-full z-30">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-orange-400 rounded-full animate-pulse"/>
            <span className="text-orange-300 text-sm font-semibold">Acquiring GPS...</span>
          </div>
        </div>
      )}
    </div>
  );
}