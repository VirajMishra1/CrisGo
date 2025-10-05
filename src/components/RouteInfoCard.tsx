"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Navigation, Car, PersonStanding, Bike, ChevronDown, ChevronUp, Play, Square, MapPin, Clock, X } from "lucide-react";
import type { RouteResult } from "@/lib/routing";
import { useState } from "react";

interface RouteInfoCardProps {
  routeInfo: RouteResult;
  transportMode?: string;
  isNavigating?: boolean;
  onStartNavigation?: () => void;
  onStopNavigation?: () => void;
}

// Transport mode styling
const TRANSPORT_STYLES = {
  driving: {
    gradient: "from-blue-500 to-cyan-500",
    icon: Car,
    label: "Driving",
    bgColor: "bg-blue-50/80 dark:bg-blue-950/50",
    textColor: "text-blue-600 dark:text-blue-400",
    hoverGlow: "hover:shadow-[0_0_30px_rgba(59,130,246,0.3)]"
  },
  walking: {
    gradient: "from-orange-500 to-amber-500",
    icon: PersonStanding,
    label: "Walking",
    bgColor: "bg-orange-50/80 dark:bg-orange-950/50",
    textColor: "text-orange-600 dark:text-orange-400",
    hoverGlow: "hover:shadow-[0_0_30px_rgba(249,115,22,0.3)]"
  },
  cycling: {
    gradient: "from-purple-500 to-pink-500",
    icon: Bike,
    label: "Cycling",
    bgColor: "bg-purple-50/80 dark:bg-purple-950/50",
    textColor: "text-purple-600 dark:text-purple-400",
    hoverGlow: "hover:shadow-[0_0_30px_rgba(168,85,247,0.3)]"
  }
};

export default function RouteInfoCard({ 
  routeInfo, 
  transportMode = "driving",
  isNavigating = false,
  onStartNavigation,
  onStopNavigation
}: RouteInfoCardProps) {
  const modeStyle = TRANSPORT_STYLES[transportMode as keyof typeof TRANSPORT_STYLES] || TRANSPORT_STYLES.driving;
  const ModeIcon = modeStyle.icon;
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  return (
    <>
      {/* Desktop Card */}
      <motion.div
        className="hidden lg:block absolute top-24 right-6 z-30 w-96"
        initial={{ x: 100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.4, type: "spring", stiffness: 100 }}
      >
        {/* Bento Grid Container with Glassmorphism */}
        <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-3xl border border-white/20 dark:border-slate-800/50 shadow-2xl overflow-hidden hover:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.4)] transition-all duration-300">
          
          {/* Header - Bento Style */}
          <motion.div 
            className={`px-6 py-4 ${modeStyle.bgColor} border-b border-white/20 dark:border-slate-800/50 backdrop-blur-sm`}
            whileHover={{ scale: 1.01 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
          >
            <div className="flex items-center gap-3">
              <motion.div
                whileHover={{ rotate: 360 }}
                transition={{ duration: 0.6 }}
              >
                <ModeIcon className={`w-6 h-6 ${modeStyle.textColor}`} />
              </motion.div>
              <span className={`text-base font-bold ${modeStyle.textColor}`}>{modeStyle.label} Route</span>
            </div>
          </motion.div>

          {/* Bento Grid Layout - Distance & Time Cards */}
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {/* Distance Card */}
              <motion.div
                className="bg-gradient-to-br from-white/50 to-white/30 dark:from-slate-800/50 dark:to-slate-900/30 backdrop-blur-sm rounded-2xl p-4 border border-white/20 dark:border-slate-700/50 shadow-lg"
                whileHover={{ scale: 1.05, y: -4 }}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <MapPin className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                  <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                    Distance
                  </span>
                </div>
                <div className="text-3xl font-black text-gray-900 dark:text-white">
                  {(routeInfo.distance / 1000).toFixed(1)}
                  <span className="text-sm text-gray-500 dark:text-gray-400 ml-1 font-normal">km</span>
                </div>
              </motion.div>

              {/* Time Card */}
              <motion.div
                className="bg-gradient-to-br from-white/50 to-white/30 dark:from-slate-800/50 dark:to-slate-900/30 backdrop-blur-sm rounded-2xl p-4 border border-white/20 dark:border-slate-700/50 shadow-lg"
                whileHover={{ scale: 1.05, y: -4 }}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                  <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                    Time
                  </span>
                </div>
                <div className="text-3xl font-black text-gray-900 dark:text-white">
                  {Math.round(routeInfo.duration / 60)}
                  <span className="text-sm text-gray-500 dark:text-gray-400 ml-1 font-normal">min</span>
                </div>
              </motion.div>
            </div>

            {/* Navigation Button - Full Width Bento Card */}
            {isNavigating ? (
              <motion.button
                onClick={onStopNavigation}
                className="w-full bg-gradient-to-r from-red-500 to-red-600 text-white font-bold py-4 px-6 rounded-2xl flex items-center justify-center gap-3 shadow-lg transition-all"
                whileHover={{ scale: 1.02, y: -2, boxShadow: "0 20px 40px -15px rgba(239, 68, 68, 0.5)" }}
                whileTap={{ scale: 0.98 }}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
              >
                <Square className="w-5 h-5" />
                Stop Navigation
              </motion.button>
            ) : (
              <motion.button
                onClick={onStartNavigation}
                className={`w-full bg-gradient-to-r ${modeStyle.gradient} text-white font-bold py-4 px-6 rounded-2xl flex items-center justify-center gap-3 shadow-lg ${modeStyle.hoverGlow} transition-all`}
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
              >
                <Play className="w-5 h-5" />
                Start AR Navigation
              </motion.button>
            )}

            {/* Turn-by-Turn Directions */}
            {routeInfo.steps && routeInfo.steps.length > 0 && (
              <div className="space-y-3">
                {/* Expandable Header */}
                <motion.button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="w-full bg-gradient-to-br from-white/50 to-white/30 dark:from-slate-800/50 dark:to-slate-900/30 backdrop-blur-sm rounded-2xl p-4 border border-white/20 dark:border-slate-700/50 flex items-center justify-between shadow-lg"
                  whileHover={{ scale: 1.01, y: -2 }}
                  whileTap={{ scale: 0.99 }}
                  transition={{ type: "spring", stiffness: 400, damping: 17 }}
                >
                  <div className="flex items-center gap-3">
                    <Navigation className={`w-5 h-5 ${modeStyle.textColor}`} />
                    <span className="text-sm font-bold text-gray-900 dark:text-white">
                      Directions
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-200/50 dark:bg-gray-700/50 px-2 py-0.5 rounded-full">
                      {routeInfo.steps.length} steps
                    </span>
                  </div>
                  <motion.div
                    animate={{ rotate: isExpanded ? 180 : 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <ChevronDown className="w-5 h-5 text-gray-500" />
                  </motion.div>
                </motion.button>

                {/* Instructions List with AnimatePresence */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="space-y-2 overflow-hidden"
                    >
                      <div className="max-h-80 overflow-y-auto space-y-2 pr-2">
                        {routeInfo.steps.map((step, index) => (
                          <motion.div
                            key={index}
                            initial={{ x: -20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            transition={{ delay: index * 0.05 }}
                            className="flex items-start gap-3 p-3 rounded-xl bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm border border-white/20 dark:border-slate-700/50 shadow-md"
                            whileHover={{ x: 4, scale: 1.02 }}
                          >
                            <div className={`flex-shrink-0 w-7 h-7 rounded-full ${modeStyle.bgColor} ${modeStyle.textColor} flex items-center justify-center text-xs font-bold shadow-md`}>
                              {index + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
                                {step.instruction}
                              </p>
                              <div className="flex items-center gap-3 text-xs text-gray-600 dark:text-gray-400">
                                <span className="flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                                  {step.distance > 0 ? `${step.distance} m` : "0 m"}
                                </span>
                                {step.duration > 0 && (
                                  <span className="flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                                    {Math.ceil(step.duration / 60)} min
                                  </span>
                                )}
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Mobile Bottom Sheet Trigger */}
      <motion.button
        onClick={() => setIsMobileDrawerOpen(true)}
        className="lg:hidden fixed bottom-20 right-4 z-30 w-14 h-14 bg-white/90 backdrop-blur-md rounded-full shadow-xl border border-slate-200 flex items-center justify-center"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
      >
        <Navigation className="w-6 h-6 text-slate-900" />
      </motion.button>

      {/* Mobile Bottom Sheet */}
      <AnimatePresence>
        {isMobileDrawerOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="lg:hidden fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40"
              onClick={() => setIsMobileDrawerOpen(false)}
            />

            {/* Bottom Drawer */}
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="lg:hidden fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl z-50 max-h-[80vh] overflow-hidden"
            >
              {/* Handle */}
              <div className="flex justify-center py-3">
                <div className="w-12 h-1.5 bg-slate-300 rounded-full" />
              </div>

              {/* Content */}
              <div className="px-6 pb-6 overflow-y-auto max-h-[calc(80vh-3rem)]">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <ModeIcon className={`w-6 h-6 ${modeStyle.textColor}`} />
                    <h3 className="text-lg font-bold text-slate-900">{modeStyle.label} Route</h3>
                  </div>
                  <button
                    onClick={() => setIsMobileDrawerOpen(false)}
                    className="p-2 bg-slate-100 rounded-lg"
                  >
                    <X className="w-5 h-5 text-slate-900" />
                  </button>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="bg-slate-100 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <MapPin className="w-4 h-4 text-slate-600" />
                      <span className="text-xs font-medium text-slate-600 uppercase">Distance</span>
                    </div>
                    <div className="text-2xl font-black text-slate-900">
                      {(routeInfo.distance / 1000).toFixed(1)}
                      <span className="text-sm text-slate-600 ml-1 font-normal">km</span>
                    </div>
                  </div>

                  <div className="bg-slate-100 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <Clock className="w-4 h-4 text-slate-600" />
                      <span className="text-xs font-medium text-slate-600 uppercase">Time</span>
                    </div>
                    <div className="text-2xl font-black text-slate-900">
                      {Math.round(routeInfo.duration / 60)}
                      <span className="text-sm text-slate-600 ml-1 font-normal">min</span>
                    </div>
                  </div>
                </div>

                {/* Navigation Button */}
                {isNavigating ? (
                  <button
                    onClick={onStopNavigation}
                    className="w-full bg-gradient-to-r from-red-500 to-red-600 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 shadow-lg mb-4"
                  >
                    <Square className="w-5 h-5" />
                    Stop Navigation
                  </button>
                ) : (
                  <button
                    onClick={onStartNavigation}
                    className={`w-full bg-gradient-to-r ${modeStyle.gradient} text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 shadow-lg mb-4`}
                  >
                    <Play className="w-5 h-5" />
                    Start AR Navigation
                  </button>
                )}

                {/* Directions */}
                {routeInfo.steps && routeInfo.steps.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-bold text-slate-900">Turn-by-Turn Directions</h4>
                      <span className="text-xs text-slate-600 bg-slate-100 px-2 py-1 rounded-full">
                        {routeInfo.steps.length} steps
                      </span>
                    </div>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {routeInfo.steps.map((step, index) => (
                        <div
                          key={index}
                          className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200"
                        >
                          <div className={`flex-shrink-0 w-6 h-6 rounded-full ${modeStyle.bgColor} ${modeStyle.textColor} flex items-center justify-center text-xs font-bold`}>
                            {index + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-900 mb-1">
                              {step.instruction}
                            </p>
                            <div className="flex items-center gap-2 text-xs text-slate-600">
                              <span>{step.distance > 0 ? `${step.distance} m` : "0 m"}</span>
                              {step.duration > 0 && (
                                <>
                                  <span>•</span>
                                  <span>{Math.ceil(step.duration / 60)} min</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}