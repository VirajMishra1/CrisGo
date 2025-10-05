"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Map, Eye, Navigation, Car, Bike, PersonStanding, MapPin, LocateFixed, Search, AlertTriangle, Menu, X } from "lucide-react";
import { toast } from "sonner";
import { searchPlaces } from "@/lib/routing";

interface TopNavProps {
  currentView: "dashboard" | "ar";
  onViewChange: (view: "dashboard" | "ar") => void;
  onCalculateRoute: (start: string, end: string, mode: string) => void;
  onReportIncident: () => void;
  isCalculating?: boolean;
}

interface PlaceSuggestion {
  name: string;
  lat: number;
  lng: number;
  display_name: string;
}

export default function TopNav({
  currentView,
  onViewChange,
  onCalculateRoute,
  onReportIncident,
  isCalculating = false
}: TopNavProps) {
  const [startLocation, setStartLocation] = useState("");
  const [endLocation, setEndLocation] = useState("");
  const [transportMode, setTransportMode] = useState<string>("driving");
  const [isGettingLocation, setIsGettingLocation] = useState<"start" | "end" | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Autocomplete state
  const [startSuggestions, setStartSuggestions] = useState<PlaceSuggestion[]>([]);
  const [endSuggestions, setEndSuggestions] = useState<PlaceSuggestion[]>([]);
  const [showStartDropdown, setShowStartDropdown] = useState(false);
  const [showEndDropdown, setShowEndDropdown] = useState(false);
  const [isSearchingStart, setIsSearchingStart] = useState(false);
  const [isSearchingEnd, setIsSearchingEnd] = useState(false);

  const startInputRef = useRef<HTMLInputElement>(null);
  const endInputRef = useRef<HTMLInputElement>(null);
  const startDropdownRef = useRef<HTMLDivElement>(null);
  const endDropdownRef = useRef<HTMLDivElement>(null);

  // Auto-recalculate route when transport mode changes (if locations exist)
  useEffect(() => {
    if (startLocation && endLocation) {
      onCalculateRoute(startLocation, endLocation, transportMode);
    }
  }, [transportMode]);

  // Debounced search for start location
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (startLocation.length > 2 && showStartDropdown) {
        setIsSearchingStart(true);
        try {
          const results = await searchPlaces(startLocation);
          setStartSuggestions(results);
        } catch (error) {
          console.error("Search error:", error);
        } finally {
          setIsSearchingStart(false);
        }
      } else {
        setStartSuggestions([]);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [startLocation, showStartDropdown]);

  // Debounced search for end location
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (endLocation.length > 2 && showEndDropdown) {
        setIsSearchingEnd(true);
        try {
          const results = await searchPlaces(endLocation);
          setEndSuggestions(results);
        } catch (error) {
          console.error("Search error:", error);
        } finally {
          setIsSearchingEnd(false);
        }
      } else {
        setEndSuggestions([]);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [endLocation, showEndDropdown]);

  // Click outside to close dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        startDropdownRef.current &&
        !startDropdownRef.current.contains(event.target as Node) &&
        !startInputRef.current?.contains(event.target as Node)
      ) {
        setShowStartDropdown(false);
      }
      if (
        endDropdownRef.current &&
        !endDropdownRef.current.contains(event.target as Node) &&
        !endInputRef.current?.contains(event.target as Node)
      ) {
        setShowEndDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleUseCurrentLocation = async (field: "start" | "end") => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      return;
    }

    setIsGettingLocation(field);
    toast.info("Getting your location...");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const locationString = `${latitude},${longitude}`;
        
        if (field === "start") {
          setStartLocation(locationString);
          setShowStartDropdown(false);
        } else {
          setEndLocation(locationString);
          setShowEndDropdown(false);
        }
        
        toast.success("Current location set");
        setIsGettingLocation(null);
      },
      (error) => {
        console.error("Geolocation error:", error);
        let errorMessage = "Could not get your location";
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = "Location permission denied. Please enable location access.";
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = "Location information unavailable";
            break;
          case error.TIMEOUT:
            errorMessage = "Location request timed out. Please try again.";
            break;
        }
        
        toast.error(errorMessage);
        setIsGettingLocation(null);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0
      }
    );
  };

  const handleSelectStartSuggestion = (suggestion: PlaceSuggestion) => {
    setStartLocation(suggestion.display_name);
    setShowStartDropdown(false);
    setStartSuggestions([]);
  };

  const handleSelectEndSuggestion = (suggestion: PlaceSuggestion) => {
    setEndLocation(suggestion.display_name);
    setShowEndDropdown(false);
    setEndSuggestions([]);
  };

  const handleSearch = () => {
    if (startLocation && endLocation && transportMode) {
      onCalculateRoute(startLocation, endLocation, transportMode);
    }
  };

  return (
    <>
      {/* Desktop Navigation */}
      <motion.nav 
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        className="absolute top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-xl border-b border-slate-200 hidden lg:block"
      >
        <div className="px-6 py-4">
          <div className="flex items-center justify-between gap-6">
            {/* Logo */}
            <motion.div 
              className="flex items-center gap-3"
              whileHover={{ scale: 1.02 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
            >
              <motion.div 
                className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center shadow-sm"
                whileHover={{ rotate: 360 }}
                transition={{ type: "spring", stiffness: 200, damping: 15, duration: 0.6 }}
              >
                <span className="text-white font-black text-lg">CG</span>
              </motion.div>
              <div>
                <h1 className="text-slate-900 font-bold text-lg tracking-tight">CrisGo</h1>
                <p className="text-slate-500 text-xs tracking-wide">Smart Navigation</p>
              </div>
            </motion.div>

            {/* View Switcher */}
            <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1">
              {(['dashboard', 'ar'] as const).map((view) => (
                <motion.button
                  key={view}
                  onClick={() => onViewChange(view)}
                  className="relative px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ type: "spring", stiffness: 400, damping: 17 }}
                >
                  {currentView === view && (
                    <motion.div
                      layoutId="activeView"
                      className="absolute inset-0 bg-white rounded-lg shadow-sm"
                      transition={{ type: "spring", stiffness: 400, damping: 25 }}
                    />
                  )}
                  <span className={`relative z-10 flex items-center gap-2 ${currentView === view ? 'text-slate-900' : 'text-slate-600'}`}>
                    {view === 'dashboard' ? <Map className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    {view === 'dashboard' ? 'Map' : 'AR Mode'}
                  </span>
                </motion.button>
              ))}
            </div>

            {/* Transport Mode */}
            <motion.div 
              className="flex items-center gap-2 bg-slate-100 rounded-xl p-1"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 300 }}
            >
              {(['driving', 'cycling', 'walking'] as const).map((mode, index) => (
                <motion.button
                  key={mode}
                  onClick={() => setTransportMode(mode)}
                  className="relative p-2 rounded-lg transition-colors group"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3 + index * 0.1, type: "spring", stiffness: 400 }}
                  whileHover={{ scale: 1.15, rotate: 5 }}
                  whileTap={{ scale: 0.95 }}
                  title={mode.charAt(0).toUpperCase() + mode.slice(1)}
                >
                  {transportMode === mode && (
                    <motion.div
                      layoutId="activeMode"
                      className="absolute inset-0 bg-white rounded-lg shadow-sm"
                      transition={{ type: "spring", stiffness: 400, damping: 25 }}
                    />
                  )}
                  <span className={`relative z-10 ${transportMode === mode ? 'text-slate-900' : 'text-slate-600'}`}>
                    {mode === 'driving' && <Car className="w-4 h-4" />}
                    {mode === 'cycling' && <Bike className="w-4 h-4" />}
                    {mode === 'walking' && <PersonStanding className="w-4 h-4" />}
                  </span>
                </motion.button>
              ))}
            </motion.div>

            {/* Route Input */}
            <motion.div 
              className="flex items-center gap-3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4, type: "spring", stiffness: 300 }}
            >
              <div className="relative flex-1">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 z-10" />
                <motion.input
                  ref={startInputRef}
                  type="text"
                  placeholder="Starting location"
                  value={startLocation}
                  onChange={(e) => setStartLocation(e.target.value)}
                  onFocus={() => setShowStartDropdown(true)}
                  className="w-64 pl-10 pr-10 py-2 bg-slate-100 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder-slate-500 focus:bg-white focus:border-slate-300 focus:outline-none transition-all"
                  whileFocus={{ scale: 1.02 }}
                  transition={{ type: "spring", stiffness: 400, damping: 17 }}
                />
                <motion.button
                  onClick={() => handleUseCurrentLocation("start")}
                  disabled={isGettingLocation === "start"}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-900 transition-colors disabled:opacity-50 z-10"
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <LocateFixed className="w-4 h-4" />
                </motion.button>

                {/* Start location dropdown */}
                <AnimatePresence>
                  {showStartDropdown && (startSuggestions.length > 0 || isSearchingStart) && (
                    <motion.div
                      ref={startDropdownRef}
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute top-full mt-2 w-full bg-white rounded-lg shadow-xl border border-slate-200 max-h-64 overflow-y-auto z-50"
                    >
                      {isSearchingStart ? (
                        <div className="p-3 text-sm text-slate-500">Searching...</div>
                      ) : (
                        startSuggestions.map((suggestion, index) => (
                          <motion.button
                            key={index}
                            onClick={() => handleSelectStartSuggestion(suggestion)}
                            className="w-full text-left px-3 py-2 hover:bg-slate-100 text-sm text-slate-900 border-b border-slate-100 last:border-b-0"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.05 }}
                            whileHover={{ x: 5 }}
                          >
                            <div className="font-medium">{suggestion.name}</div>
                            <div className="text-xs text-slate-500 truncate">{suggestion.display_name}</div>
                          </motion.button>
                        ))
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <motion.div
                animate={{ x: [0, 5, 0] }}
                transition={{ repeat: Infinity, duration: 2 }}
              >
                <Navigation className="w-4 h-4 text-slate-400" />
              </motion.div>

              <div className="relative flex-1">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-900 z-10" />
                <motion.input
                  ref={endInputRef}
                  type="text"
                  placeholder="Destination"
                  value={endLocation}
                  onChange={(e) => setEndLocation(e.target.value)}
                  onFocus={() => setShowEndDropdown(true)}
                  className="w-64 pl-10 pr-10 py-2 bg-slate-100 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder-slate-500 focus:bg-white focus:border-slate-300 focus:outline-none transition-all"
                  whileFocus={{ scale: 1.02 }}
                  transition={{ type: "spring", stiffness: 400, damping: 17 }}
                />
                <motion.button
                  onClick={() => handleUseCurrentLocation("end")}
                  disabled={isGettingLocation === "end"}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-900 transition-colors disabled:opacity-50 z-10"
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <LocateFixed className="w-4 h-4" />
                </motion.button>

                {/* End location dropdown */}
                <AnimatePresence>
                  {showEndDropdown && (endSuggestions.length > 0 || isSearchingEnd) && (
                    <motion.div
                      ref={endDropdownRef}
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute top-full mt-2 w-full bg-white rounded-lg shadow-xl border border-slate-200 max-h-64 overflow-y-auto z-50"
                    >
                      {isSearchingEnd ? (
                        <div className="p-3 text-sm text-slate-500">Searching...</div>
                      ) : (
                        endSuggestions.map((suggestion, index) => (
                          <motion.button
                            key={index}
                            onClick={() => handleSelectEndSuggestion(suggestion)}
                            className="w-full text-left px-3 py-2 hover:bg-slate-100 text-sm text-slate-900 border-b border-slate-100 last:border-b-0"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.05 }}
                            whileHover={{ x: 5 }}
                          >
                            <div className="font-medium">{suggestion.name}</div>
                            <div className="text-xs text-slate-500 truncate">{suggestion.display_name}</div>
                          </motion.button>
                        ))
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <motion.button
                onClick={handleSearch}
                disabled={isCalculating || !startLocation || !endLocation}
                className="relative px-6 py-2 bg-slate-900 text-white rounded-lg font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden shadow-sm"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.98 }}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
              >
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-slate-800 to-slate-900"
                  initial={{ x: "-100%" }}
                  whileHover={{ x: "100%" }}
                  transition={{ duration: 0.5 }}
                />
                <span className="relative z-10 flex items-center gap-2">
                  <Search className="w-4 h-4" />
                  {isCalculating ? 'Searching...' : 'Search'}
                </span>
              </motion.button>
            </motion.div>

            {/* Report Button */}
            <motion.button
              onClick={onReportIncident}
              className="px-4 py-2 bg-slate-900 text-white rounded-lg font-medium text-sm flex items-center gap-2 shadow-sm hover:bg-slate-800 transition-colors"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.98 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
            >
              <AlertTriangle className="w-4 h-4" />
              Report
            </motion.button>
          </div>
        </div>
      </motion.nav>

      {/* Mobile Navigation */}
      <motion.nav 
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        className="absolute top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-xl border-b border-slate-200 lg:hidden"
      >
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center">
                <span className="text-white font-black text-sm">CG</span>
              </div>
              <div>
                <h1 className="text-slate-900 font-bold text-sm">CrisGo</h1>
              </div>
            </div>

            {/* Mobile Actions */}
            <div className="flex items-center gap-2">
              {/* View Switcher - Compact */}
              <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-0.5">
                {(['dashboard', 'ar'] as const).map((view) => (
                  <button
                    key={view}
                    onClick={() => onViewChange(view)}
                    className={`p-1.5 rounded-md transition-colors ${
                      currentView === view ? 'bg-white shadow-sm text-slate-900' : 'text-slate-600'
                    }`}
                  >
                    {view === 'dashboard' ? <Map className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                ))}
              </div>

              {/* Menu Button */}
              <button
                onClick={() => setIsMobileMenuOpen(true)}
                className="p-2 bg-slate-100 rounded-lg text-slate-900"
              >
                <Menu className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </motion.nav>

      {/* Mobile Menu Drawer */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[60] lg:hidden"
              onClick={() => setIsMobileMenuOpen(false)}
            />

            {/* Drawer */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="fixed top-0 right-0 bottom-0 w-full max-w-sm bg-white z-[70] lg:hidden overflow-y-auto"
            >
              <div className="p-6 space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between pb-4 border-b border-slate-200">
                  <h2 className="text-lg font-bold text-slate-900">Navigation</h2>
                  <button
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="p-2 bg-slate-100 rounded-lg text-slate-900"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Transport Mode */}
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-2 block">Transport Mode</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['driving', 'cycling', 'walking'] as const).map((mode) => (
                      <button
                        key={mode}
                        onClick={() => setTransportMode(mode)}
                        className={`p-3 rounded-lg border-2 transition-all ${
                          transportMode === mode
                            ? 'border-slate-900 bg-slate-900 text-white'
                            : 'border-slate-200 bg-white text-slate-600'
                        }`}
                      >
                        <div className="flex flex-col items-center gap-1">
                          {mode === 'driving' && <Car className="w-5 h-5" />}
                          {mode === 'cycling' && <Bike className="w-5 h-5" />}
                          {mode === 'walking' && <PersonStanding className="w-5 h-5" />}
                          <span className="text-xs font-medium capitalize">{mode}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Start Location */}
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-2 block">Starting Location</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 z-10" />
                    <input
                      ref={startInputRef}
                      type="text"
                      placeholder="Enter start location"
                      value={startLocation}
                      onChange={(e) => setStartLocation(e.target.value)}
                      onFocus={() => setShowStartDropdown(true)}
                      className="w-full pl-10 pr-10 py-3 bg-slate-100 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder-slate-500 focus:bg-white focus:border-slate-300 focus:outline-none transition-all"
                    />
                    <button
                      onClick={() => handleUseCurrentLocation("start")}
                      disabled={isGettingLocation === "start"}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-900 transition-colors disabled:opacity-50 z-10 bg-white rounded"
                    >
                      <LocateFixed className="w-4 h-4" />
                    </button>

                    {/* Mobile Start Dropdown */}
                    <AnimatePresence>
                      {showStartDropdown && (startSuggestions.length > 0 || isSearchingStart) && (
                        <motion.div
                          ref={startDropdownRef}
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="absolute top-full mt-2 w-full bg-white rounded-lg shadow-xl border border-slate-200 max-h-64 overflow-y-auto z-50"
                        >
                          {isSearchingStart ? (
                            <div className="p-3 text-sm text-slate-500">Searching...</div>
                          ) : (
                            startSuggestions.map((suggestion, index) => (
                              <button
                                key={index}
                                onClick={() => {
                                  handleSelectStartSuggestion(suggestion);
                                  setShowStartDropdown(false);
                                }}
                                className="w-full text-left px-3 py-2 hover:bg-slate-100 text-sm text-slate-900 border-b border-slate-100 last:border-b-0"
                              >
                                <div className="font-medium">{suggestion.name}</div>
                                <div className="text-xs text-slate-500 truncate">{suggestion.display_name}</div>
                              </button>
                            ))
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                {/* End Location */}
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-2 block">Destination</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-900 z-10" />
                    <input
                      ref={endInputRef}
                      type="text"
                      placeholder="Enter destination"
                      value={endLocation}
                      onChange={(e) => setEndLocation(e.target.value)}
                      onFocus={() => setShowEndDropdown(true)}
                      className="w-full pl-10 pr-10 py-3 bg-slate-100 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder-slate-500 focus:bg-white focus:border-slate-300 focus:outline-none transition-all"
                    />
                    <button
                      onClick={() => handleUseCurrentLocation("end")}
                      disabled={isGettingLocation === "end"}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-900 transition-colors disabled:opacity-50 z-10 bg-white rounded"
                    >
                      <LocateFixed className="w-4 h-4" />
                    </button>

                    {/* Mobile End Dropdown */}
                    <AnimatePresence>
                      {showEndDropdown && (endSuggestions.length > 0 || isSearchingEnd) && (
                        <motion.div
                          ref={endDropdownRef}
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="absolute top-full mt-2 w-full bg-white rounded-lg shadow-xl border border-slate-200 max-h-64 overflow-y-auto z-50"
                        >
                          {isSearchingEnd ? (
                            <div className="p-3 text-sm text-slate-500">Searching...</div>
                          ) : (
                            endSuggestions.map((suggestion, index) => (
                              <button
                                key={index}
                                onClick={() => {
                                  handleSelectEndSuggestion(suggestion);
                                  setShowEndDropdown(false);
                                }}
                                className="w-full text-left px-3 py-2 hover:bg-slate-100 text-sm text-slate-900 border-b border-slate-100 last:border-b-0"
                              >
                                <div className="font-medium">{suggestion.name}</div>
                                <div className="text-xs text-slate-500 truncate">{suggestion.display_name}</div>
                              </button>
                            ))
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="space-y-3 pt-4">
                  <button
                    onClick={() => {
                      handleSearch();
                      setIsMobileMenuOpen(false);
                    }}
                    disabled={isCalculating || !startLocation || !endLocation}
                    className="w-full py-3 bg-slate-900 text-white rounded-lg font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <Search className="w-4 h-4" />
                    {isCalculating ? 'Searching...' : 'Search Route'}
                  </button>

                  <button
                    onClick={() => {
                      onReportIncident();
                      setIsMobileMenuOpen(false);
                    }}
                    className="w-full py-3 bg-white border-2 border-slate-900 text-slate-900 rounded-lg font-medium text-sm flex items-center justify-center gap-2"
                  >
                    <AlertTriangle className="w-4 h-4" />
                    Report Incident
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}