"use client";

import { motion } from "framer-motion";

export default function MapSkeleton() {
  return (
    <div className="relative w-full h-full bg-[#0d0d1a] flex items-center justify-center overflow-hidden">
      {/* Animated grid background */}
      <div className="absolute inset-0 opacity-10">
        <div
          className="w-full h-full"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
      </div>

      {/* Pulsing skeleton blocks */}
      <div className="absolute inset-0">
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-xl bg-white/[0.03] border border-white/5"
            style={{
              width: `${120 + Math.random() * 80}px`,
              height: `${80 + Math.random() * 40}px`,
              left: `${10 + (i % 3) * 30 + Math.random() * 10}%`,
              top: `${15 + Math.floor(i / 3) * 35 + Math.random() * 10}%`,
            }}
            animate={{ opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 2, repeat: Infinity, delay: i * 0.3 }}
          />
        ))}
      </div>

      {/* Center loading indicator */}
      <motion.div
        className="relative z-10 flex flex-col items-center gap-4"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <motion.div
          className="w-12 h-12 rounded-full border-2 border-cyan-500/30 border-t-cyan-500"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        />
        <div className="text-sm font-medium text-gray-400">Loading map data...</div>
        <div className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-cyan-500"
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
            />
          ))}
        </div>
      </motion.div>
    </div>
  );
}
