"use client";

import { useState } from "react";
import { MapPin, Navigation, Loader2, Locate } from "lucide-react";
import { toast } from "sonner";

interface RouteInputProps {
  onRouteChange: (start: string, end: string) => void;
  isLoading?: boolean;
}

export default function RouteInput({ onRouteChange, isLoading = false }: RouteInputProps) {
  const [startLocation, setStartLocation] = useState("");
  const [endLocation, setEndLocation] = useState("");
  const [isGettingLocation, setIsGettingLocation] = useState<"start" | "end" | null>(null);

  const handleStartChange = (value: string) => {
    setStartLocation(value);
    if (value && endLocation) {
      onRouteChange(value, endLocation);
    }
  };

  const handleEndChange = (value: string) => {
    setEndLocation(value);
    if (startLocation && value) {
      onRouteChange(startLocation, value);
    }
  };

  const handleUseCurrentLocation = async (field: "start" | "end") => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      return;
    }

    setIsGettingLocation(field);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const locationString = `${latitude},${longitude}`;
        
        if (field === "start") {
          setStartLocation(locationString);
          if (endLocation) {
            onRouteChange(locationString, endLocation);
          }
        } else {
          setEndLocation(locationString);
          if (startLocation) {
            onRouteChange(startLocation, locationString);
          }
        }
        
        toast.success("Current location set");
        setIsGettingLocation(null);
      },
      (error) => {
        console.error("Geolocation error:", error);
        toast.error("Could not get your location");
        setIsGettingLocation(null);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  return (
    <div className="absolute top-6 left-6 z-[1000] space-y-2 w-80">
      {/* Start Location */}
      <div className="flex items-center gap-2 bg-slate-900/90 backdrop-blur-sm rounded-lg px-4 py-3 border border-slate-700/50 shadow-lg">
        <MapPin className="w-4 h-4 text-green-400 flex-shrink-0" />
        <input
          type="text"
          placeholder="Starting location (e.g., Times Square NYC)"
          value={startLocation}
          onChange={(e) => handleStartChange(e.target.value)}
          disabled={isLoading}
          className="flex-1 bg-transparent text-white placeholder-slate-400 outline-none text-sm disabled:opacity-50"
        />
        <button
          onClick={() => handleUseCurrentLocation("start")}
          disabled={isLoading || isGettingLocation !== null}
          className="p-1 hover:bg-slate-700/50 rounded transition-colors disabled:opacity-50"
          title="Use current location"
        >
          {isGettingLocation === "start" ? (
            <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />
          ) : (
            <Locate className="w-4 h-4 text-cyan-400" />
          )}
        </button>
        {isLoading && <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />}
      </div>

      {/* End Location */}
      <div className="flex items-center gap-2 bg-slate-900/90 backdrop-blur-sm rounded-lg px-4 py-3 border border-slate-700/50 shadow-lg">
        <Navigation className="w-4 h-4 text-red-400 flex-shrink-0" />
        <input
          type="text"
          placeholder="Destination (e.g., Central Park NYC)"
          value={endLocation}
          onChange={(e) => handleEndChange(e.target.value)}
          disabled={isLoading}
          className="flex-1 bg-transparent text-white placeholder-slate-400 outline-none text-sm disabled:opacity-50"
        />
        <button
          onClick={() => handleUseCurrentLocation("end")}
          disabled={isLoading || isGettingLocation !== null}
          className="p-1 hover:bg-slate-700/50 rounded transition-colors disabled:opacity-50"
          title="Use current location"
        >
          {isGettingLocation === "end" ? (
            <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />
          ) : (
            <Locate className="w-4 h-4 text-cyan-400" />
          )}
        </button>
      </div>
    </div>
  );
}