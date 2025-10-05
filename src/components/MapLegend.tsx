"use client";

import { motion } from "framer-motion";

interface MapLegendProps {
  showIncidents: boolean;
  onToggleIncidents: () => void;
}

export default function MapLegend({ showIncidents, onToggleIncidents }: MapLegendProps) {
  return (
    <motion.div
      className="hidden lg:flex absolute bottom-6 left-6 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-xl border border-white/20 dark:border-slate-800/50 shadow-2xl px-3 lg:px-4 py-2 lg:py-2.5 hover:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] transition-all duration-300 !w-[29.9%] !h-[60px] !max-w-[29.9%]"
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4 }}
      whileHover={{ y: -2, scale: 1.02 }}>

      <div className="flex items-center gap-2 lg:gap-3">
        {/* High credibility - two-tone red with micro-interaction */}
        <motion.div
          className="flex items-center gap-1.5 lg:gap-2 cursor-pointer flex-shrink-0"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          transition={{ type: "spring", stiffness: 400, damping: 17 }}>

          <div className="relative flex items-center justify-center w-5 h-5 lg:w-6 lg:h-6 rounded-full shadow-lg transition-all duration-300 hover:shadow-xl" style={{ background: "#f87171" }}>
            <div className="w-2.5 h-2.5 lg:w-3 lg:h-3 rounded-full" style={{ background: "#dc2626" }} />
            <div className="absolute inset-0 rounded-full animate-ping opacity-20" style={{ background: "#f87171" }} />
          </div>
          <span className="text-xs font-medium text-gray-900 dark:text-gray-100">High</span>
        </motion.div>
        
        {/* Medium credibility with micro-interaction */}
        <motion.div
          className="flex items-center gap-1.5 lg:gap-2 cursor-pointer flex-shrink-0"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          transition={{ type: "spring", stiffness: 400, damping: 17 }}>

          <div className="relative flex items-center justify-center w-5 h-5 lg:w-6 lg:h-6 rounded-full shadow-lg transition-all duration-300 hover:shadow-xl" style={{ background: "#f87171" }}>
            <div className="w-2.5 h-2.5 lg:w-3 lg:h-3 bg-yellow-400 rounded-full" />
          </div>
          <span className="text-xs font-medium text-gray-900 dark:text-gray-100">Med</span>
        </motion.div>
        
        {/* Low credibility with micro-interaction */}
        <motion.div
          className="flex items-center gap-1.5 lg:gap-2 cursor-pointer flex-shrink-0"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          transition={{ type: "spring", stiffness: 400, damping: 17 }}>

          <div className="relative flex items-center justify-center w-5 h-5 lg:w-6 lg:h-6 rounded-full shadow-lg transition-all duration-300 hover:shadow-xl" style={{ background: "#f87171" }}>
            <div className="w-2.5 h-2.5 lg:w-3 lg:h-3 bg-green-500 rounded-full" />
          </div>
          <span className="text-xs font-medium text-gray-900 dark:text-gray-100">Low</span>
        </motion.div>
        
        {/* Divider */}
        <div className="h-6 lg:h-7 w-px bg-gradient-to-b from-transparent via-gray-300 dark:via-gray-700 to-transparent flex-shrink-0 mx-1" />
        
        {/* Toggle button with smooth micro-interaction */}
        <motion.button
          onClick={onToggleIncidents}
          className={`relative w-10 lg:w-12 h-5 lg:h-6 rounded-full transition-all duration-300 shadow-lg flex-shrink-0 ${
          showIncidents ? "bg-gradient-to-r from-red-500 to-red-600" : "bg-gray-300 dark:bg-gray-600"}`
          }
          title={showIncidents ? "Hide incidents" : "Show incidents"}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          transition={{ type: "spring", stiffness: 400, damping: 17 }}>

          <motion.div
            className="absolute top-0.5 w-4 h-4 lg:w-5 lg:h-5 bg-white rounded-full shadow-lg"
            animate={{ x: showIncidents ? 20 : 2, lg: { x: showIncidents ? 24 : 2 } }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }} />

        </motion.button>
      </div>
    </motion.div>);

}