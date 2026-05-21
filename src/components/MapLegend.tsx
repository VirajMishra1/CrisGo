"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronUp } from "lucide-react";

interface MapLegendProps {
  showIncidents: boolean;
  onToggleIncidents: () => void;
}

const SEVERITY_ITEMS = [
  { label: "High", outer: "#fee2e2", inner: "#dc2626", ring: "#fca5a5" },
  { label: "Med", outer: "#fef9c3", inner: "#ca8a04", ring: "#fde047" },
  { label: "Low", outer: "#dcfce7", inner: "#16a34a", ring: "#86efac" },
];

const TYPE_ICONS: { label: string; svg: string }[] = [
  { label: "Quake", svg: '<circle cx="8" cy="8" r="3" fill="none" stroke="#475569" stroke-width="1.5"/><path d="M8 1v2M8 13v2M1 8h2M13 8h2" stroke="#475569" stroke-width="1.5"/>' },
  { label: "Fire", svg: '<path d="M8 2c0 3-4 5-4 8a4 4 0 008 0c0-3-4-5-4-8z" fill="#475569" opacity="0.9"/>' },
  { label: "Flood", svg: '<path d="M2 10c1.5-1.5 3-1.5 4.5 0s3 1.5 4.5 0M2 13c1.5-1.5 3-1.5 4.5 0s3 1.5 4.5 0" stroke="#475569" stroke-width="1.5" fill="none"/>' },
  { label: "Traffic", svg: '<rect x="3" y="2" width="10" height="12" rx="2" fill="none" stroke="#475569" stroke-width="1.2"/><circle cx="8" cy="5" r="1.5" fill="#475569"/><circle cx="8" cy="11" r="1.5" fill="#475569"/>' },
  { label: "Power", svg: '<path d="M9 2L5 9h3l-1 5 4-7H8l1-5z" fill="#475569"/>' },
  { label: "Gas", svg: '<circle cx="8" cy="6" r="3" fill="none" stroke="#475569" stroke-width="1.2"/><path d="M6 9c-1 2-1 4 0 5M10 9c1 2 1 4 0 5" stroke="#475569" stroke-width="1.2" fill="none"/>' },
];

function TypeIcon({ svg }: { svg: string }) {
  return (
    <div
      className="w-4 h-4 rounded-full bg-slate-100 flex items-center justify-center"
      // Static hardcoded SVG only — no user input
      dangerouslySetInnerHTML={{
        __html: `<svg width="12" height="12" viewBox="0 0 16 16">${svg}</svg>`,
      }}
    />
  );
}

export default function MapLegend({ showIncidents, onToggleIncidents }: MapLegendProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.div
      className="hidden lg:block absolute bottom-4 left-4 z-30"
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      <div className="bg-white/95 backdrop-blur-xl rounded-lg border border-slate-200 shadow-lg px-2.5 py-1.5">
        <div className="flex items-center gap-2">
          {SEVERITY_ITEMS.map(({ label, outer, inner, ring }) => (
            <div key={label} className="flex items-center gap-1">
              <div
                className="w-4 h-4 rounded-full flex items-center justify-center"
                style={{ background: outer, border: `1.5px solid ${ring}` }}
              >
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: inner }} />
              </div>
              <span className="text-[10px] font-medium text-slate-600">{label}</span>
            </div>
          ))}

          <div className="h-4 w-px bg-slate-200 mx-0.5" />

          <motion.button
            onClick={onToggleIncidents}
            className={`relative w-8 h-4 rounded-full transition-all flex-shrink-0 ${
              showIncidents ? "bg-red-500" : "bg-slate-300"
            }`}
            title={showIncidents ? "Hide incidents" : "Show incidents"}
            whileTap={{ scale: 0.95 }}
          >
            <motion.div
              className="absolute top-0.5 w-3 h-3 bg-white rounded-full shadow-sm"
              animate={{ x: showIncidents ? 16 : 2 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
            />
          </motion.button>

          <div className="h-4 w-px bg-slate-200 mx-0.5" />

          <motion.button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-0.5 text-[10px] font-medium text-slate-500 hover:text-slate-700 transition-colors"
            whileTap={{ scale: 0.95 }}
          >
            Icons
            <motion.span animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
              <ChevronUp className="w-3 h-3" />
            </motion.span>
          </motion.button>
        </div>

        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="flex items-center gap-2 pt-1.5 mt-1.5 border-t border-slate-100">
                {TYPE_ICONS.map(({ label, svg }) => (
                  <div key={label} className="flex items-center gap-1">
                    <TypeIcon svg={svg} />
                    <span className="text-[10px] text-slate-500">{label}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
