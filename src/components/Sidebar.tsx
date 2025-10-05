"use client";

import { motion } from "framer-motion";
import { AlertTriangle, Home, Shield, Navigation, Clock, MapPin } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

interface SidebarProps {
  overlays: {
    incidents: boolean;
    shelters: boolean;
    closedRoads: boolean;
  };
  onOverlayToggle: (overlay: "incidents" | "shelters" | "closedRoads") => void;
}

export default function Sidebar({ overlays, onOverlayToggle }: SidebarProps) {
  const nearbyIncidents = [
    {
      id: "1",
      icon: Home,
      title: "Emergency Shelter",
      distance: "0.8 km",
      credibility: "high",
      time: "2 min ago",
    },
    {
      id: "2",
      icon: AlertTriangle,
      title: "Flood Warning",
      distance: "1.2 km",
      credibility: "high",
      time: "5 min ago",
    },
    {
      id: "3",
      icon: AlertTriangle,
      title: "Power Outage",
      distance: "2.3 km",
      credibility: "low",
      time: "12 min ago",
    },
    {
      id: "4",
      icon: AlertTriangle,
      title: "Road Closure",
      distance: "3.4 km",
      credibility: "medium",
      time: "18 min ago",
    },
    {
      id: "5",
      icon: Shield,
      title: "Bridge Collapsed",
      distance: "5.1 km",
      credibility: "high",
      time: "25 min ago",
    },
  ];

  const getCredibilityColor = (credibility: string) => {
    switch (credibility) {
      case "high":
        return "from-red-500 to-red-600";
      case "medium":
        return "from-orange-500 to-orange-600";
      case "low":
        return "from-yellow-500 to-yellow-600";
      default:
        return "from-gray-500 to-gray-600";
    }
  };

  return (
    <motion.div
      className="w-96 h-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-l border-white/20 dark:border-slate-800/50 flex flex-col overflow-hidden shadow-2xl"
      initial={{ x: 100, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      {/* Route Summary - Bento Card Style */}
      <div className="p-6 border-b border-white/20 dark:border-slate-800/50">
        <h2 className="text-xl font-black mb-4 flex items-center gap-3 text-gray-900 dark:text-white">
          <Navigation className="w-6 h-6 text-blue-500" />
          Current Route
        </h2>
        <motion.div 
          className="bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl p-6 text-white shadow-2xl"
          whileHover={{ scale: 1.02, y: -4, boxShadow: "0 30px 60px -15px rgba(59, 130, 246, 0.5)" }}
          transition={{ type: "spring", stiffness: 400, damping: 17 }}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold opacity-90">Distance</span>
            <span className="text-4xl font-black">8.4 <span className="text-xl">km</span></span>
          </div>
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-semibold opacity-90">ETA</span>
            <span className="text-3xl font-bold flex items-center gap-2">
              <Clock className="w-6 h-6" />
              12 <span className="text-xl">min</span>
            </span>
          </div>
          <div className="pt-4 border-t border-white/20">
            <div className="flex items-center gap-3 text-sm font-semibold">
              <MapPin className="w-5 h-5" />
              <span>Safe Zone Checkpoint #3</span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Overlay Toggles - Modern Bento Style */}
      <div className="p-6 border-b border-white/20 dark:border-slate-800/50">
        <h3 className="text-base font-bold mb-4 text-gray-900 dark:text-white">
          Map Overlays
        </h3>
        <div className="space-y-3">
          <motion.div 
            className="flex items-center justify-between p-4 rounded-xl bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border border-white/20 dark:border-slate-700/50 shadow-md"
            whileHover={{ scale: 1.02, x: 4 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
          >
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              <Label htmlFor="incidents" className="cursor-pointer font-semibold text-gray-900 dark:text-white">
                Incidents
              </Label>
            </div>
            <Switch
              id="incidents"
              checked={overlays.incidents}
              onCheckedChange={() => onOverlayToggle("incidents")}
            />
          </motion.div>
          
          <motion.div 
            className="flex items-center justify-between p-4 rounded-xl bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border border-white/20 dark:border-slate-700/50 shadow-md"
            whileHover={{ scale: 1.02, x: 4 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
          >
            <div className="flex items-center gap-3">
              <Home className="w-5 h-5 text-green-500" />
              <Label htmlFor="shelters" className="cursor-pointer font-semibold text-gray-900 dark:text-white">
                Shelters
              </Label>
            </div>
            <Switch
              id="shelters"
              checked={overlays.shelters}
              onCheckedChange={() => onOverlayToggle("shelters")}
            />
          </motion.div>
          
          <motion.div 
            className="flex items-center justify-between p-4 rounded-xl bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border border-white/20 dark:border-slate-700/50 shadow-md"
            whileHover={{ scale: 1.02, x: 4 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
          >
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5 text-orange-500" />
              <Label htmlFor="closed" className="cursor-pointer font-semibold text-gray-900 dark:text-white">
                Closed Roads
              </Label>
            </div>
            <Switch
              id="closed"
              checked={overlays.closedRoads}
              onCheckedChange={() => onOverlayToggle("closedRoads")}
            />
          </motion.div>
        </div>
      </div>

      {/* Nearby Incidents List with Bento Cards */}
      <div className="flex-1 overflow-auto p-6">
        <h3 className="text-base font-bold mb-4 text-gray-900 dark:text-white">
          Nearby Incidents
        </h3>
        <div className="space-y-3">
          {nearbyIncidents.map((incident, index) => (
            <motion.div
              key={incident.id}
              className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm rounded-2xl p-4 border border-white/20 dark:border-slate-700/50 cursor-pointer shadow-lg"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ scale: 1.03, x: 6, boxShadow: "0 20px 40px -15px rgba(0, 0, 0, 0.3)" }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="flex items-start gap-4">
                <motion.div 
                  className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${getCredibilityColor(incident.credibility)} flex items-center justify-center flex-shrink-0 shadow-lg`}
                  whileHover={{ rotate: 360 }}
                  transition={{ duration: 0.6 }}
                >
                  <incident.icon className="w-6 h-6 text-white" />
                </motion.div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="font-bold text-sm truncate text-gray-900 dark:text-white">{incident.title}</h4>
                    <Badge variant="secondary" className="text-xs font-semibold">
                      {incident.distance}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-3 py-1 rounded-full text-white font-semibold bg-gradient-to-r ${getCredibilityColor(incident.credibility)} shadow-md`}>
                      {incident.credibility}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">{incident.time}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}