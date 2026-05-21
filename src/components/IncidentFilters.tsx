"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Filter, X } from "lucide-react";

interface IncidentFiltersProps {
  incidents: Array<{
    type?: string;
    credibility: string;
    source?: { name: string; type: string };
  }>;
  activeTypes: Set<string>;
  activeSeverities: Set<string>;
  activeSources: Set<string>;
  onToggleType: (type: string) => void;
  onToggleSeverity: (severity: string) => void;
  onToggleSource: (source: string) => void;
  onClearAll: () => void;
}

const TYPE_LABELS: Record<string, string> = {
  earthquake: "Earthquake",
  fire: "Fire",
  gas_leak: "Gas Leak",
  flooding: "Flooding",
  water_system: "Water",
  sewer: "Sewer",
  traffic: "Traffic",
  road_closure: "Road Closure",
  power_outage: "Power",
  hazard: "Hazard",
  building_collapse: "Building",
  scaffolding: "Scaffolding",
  blocked_driveway: "Blocked",
};

const SEVERITY_STYLES: Record<string, { active: string; dot: string }> = {
  high: { active: "bg-red-50 text-red-700 border-red-200", dot: "bg-red-500" },
  medium: { active: "bg-amber-50 text-amber-700 border-amber-200", dot: "bg-amber-500" },
  low: { active: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" },
};

export default function IncidentFilters({
  incidents,
  activeTypes,
  activeSeverities,
  activeSources,
  onToggleType,
  onToggleSeverity,
  onToggleSource,
  onClearAll,
}: IncidentFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);

  const types = [...new Set(incidents.map((i) => i.type || "hazard"))].sort();
  const severities = ["high", "medium", "low"];
  const sources = [...new Set(incidents.map((i) => i.source?.name).filter(Boolean) as string[])].sort();

  const activeFilterCount =
    (activeTypes.size < types.length ? activeTypes.size : 0) +
    (activeSeverities.size < 3 ? activeSeverities.size : 0) +
    (activeSources.size < sources.length ? activeSources.size : 0);

  return (
    <>
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className="absolute top-2 left-2 z-40 flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 rounded-lg text-slate-600 text-xs font-medium hover:bg-slate-200 transition-colors"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <Filter className="w-3.5 h-3.5" />
        Filters
        {activeFilterCount > 0 && (
          <span className="ml-1 w-4 h-4 rounded-full bg-slate-900 text-white text-[10px] flex items-center justify-center font-bold">
            {activeFilterCount}
          </span>
        )}
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, x: 20, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 20, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className="absolute top-10 left-2 z-40 w-64 bg-white/95 backdrop-blur-xl rounded-xl border border-slate-200 shadow-xl overflow-hidden"
          >
            <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100">
              <span className="text-xs font-semibold text-slate-900">Filter Incidents</span>
              <div className="flex items-center gap-1">
                {activeFilterCount > 0 && (
                  <button
                    onClick={onClearAll}
                    className="text-[10px] text-slate-500 hover:text-slate-700 px-1.5 py-0.5 rounded bg-slate-100"
                  >
                    Clear
                  </button>
                )}
                <button onClick={() => setIsOpen(false)} className="p-0.5 text-slate-400 hover:text-slate-600">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="p-3 space-y-3 max-h-80 overflow-y-auto">
              <div>
                <div className="text-[10px] font-medium text-slate-400 uppercase tracking-wider mb-1.5">Severity</div>
                <div className="flex flex-wrap gap-1.5">
                  {severities.map((sev) => {
                    const active = activeSeverities.has(sev);
                    const style = SEVERITY_STYLES[sev];
                    return (
                      <button
                        key={sev}
                        onClick={() => onToggleSeverity(sev)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-all flex items-center gap-1.5 ${
                          active ? style.active : "bg-slate-50 text-slate-400 border-slate-100"
                        }`}
                      >
                        <span className={`w-2 h-2 rounded-full ${active ? style.dot : "bg-slate-300"}`} />
                        {sev}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <div className="text-[10px] font-medium text-slate-400 uppercase tracking-wider mb-1.5">Type</div>
                <div className="flex flex-wrap gap-1.5">
                  {types.map((type) => {
                    const active = activeTypes.has(type);
                    return (
                      <button
                        key={type}
                        onClick={() => onToggleType(type)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-all ${
                          active
                            ? "bg-slate-100 text-slate-700 border-slate-200"
                            : "bg-slate-50 text-slate-400 border-slate-100"
                        }`}
                      >
                        {TYPE_LABELS[type] || type}
                      </button>
                    );
                  })}
                </div>
              </div>

              {sources.length > 0 && (
                <div>
                  <div className="text-[10px] font-medium text-slate-400 uppercase tracking-wider mb-1.5">Source</div>
                  <div className="flex flex-wrap gap-1.5">
                    {sources.slice(0, 8).map((src) => {
                      const active = activeSources.has(src);
                      return (
                        <button
                          key={src}
                          onClick={() => onToggleSource(src)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-all ${
                            active
                              ? "bg-blue-50 text-blue-600 border-blue-200"
                              : "bg-slate-50 text-slate-400 border-slate-100"
                          }`}
                        >
                          {src}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
