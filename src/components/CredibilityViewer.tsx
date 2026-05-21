"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Activity,
  Shield,
  Brain,
  Globe,
  Clock,
  Users,
  ChevronDown,
  TrendingUp,
  BarChart3,
} from "lucide-react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  RadialLinearScale,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Line, Radar, Bar, Doughnut } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  RadialLinearScale,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface Incident {
  id: string;
  type?: string;
  lat: number;
  lng: number;
  title: string;
  credibility: "high" | "medium" | "low";
  description?: string;
  severity?: string;
  timestamp?: string;
  reports_count?: number;
  source?: {
    name: string;
    type: string;
    reliability: number;
  };
  credibility_scores?: {
    overall: number;
    prompt_v1?: number;
    prompt_v2?: number;
    source_reliability?: number;
    temporal_relevance?: number;
    corroboration?: number;
  };
}

interface CredibilityViewerProps {
  incidents: Incident[];
}

const PIPELINE_STAGES = [
  {
    icon: Shield,
    name: "Deterministic Scoring",
    description: "Source weights: USGS 1.0, NWS 1.0, NYC311 0.85, Google News 0.75, Reddit 0.55",
    color: "#06b6d4",
  },
  {
    icon: Brain,
    name: "Ensemble LLM",
    description: "5 Gemini prompt versions with weighted median aggregation",
    color: "#8b5cf6",
  },
  {
    icon: Globe,
    name: "Web Grounding",
    description: "Gemini google_search verification for high-severity events",
    color: "#3b82f6",
  },
  {
    icon: Clock,
    name: "Temporal Decay",
    description: "1h=1.0, 6h=0.95, 24h=0.85, 72h=0.7 staleness factor",
    color: "#f59e0b",
  },
  {
    icon: Users,
    name: "Cross-Source Corroboration",
    description: "Multiple independent sources boost confidence score",
    color: "#10b981",
  },
];

export default function CredibilityViewer({ incidents }: CredibilityViewerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  const stats = useMemo(() => {
    if (!incidents || incidents.length === 0) {
      return {
        total: 0,
        high: 0,
        medium: 0,
        low: 0,
        activeSources: 0,
        avgOverall: 0,
        avgCorroboration: 0,
        sourceDistribution: {} as Record<string, number>,
        sourceReliability: {} as Record<string, { total: number; count: number }>,
        hourlyBuckets: {} as Record<string, { high: number; medium: number; low: number }>,
      };
    }

    const total = incidents.length;
    const high = incidents.filter((i) => i.credibility === "high").length;
    const medium = incidents.filter((i) => i.credibility === "medium").length;
    const low = incidents.filter((i) => i.credibility === "low").length;

    // Source distribution
    const sourceDistribution: Record<string, number> = {};
    const sourceReliability: Record<string, { total: number; count: number }> = {};
    const sourceNames = new Set<string>();

    incidents.forEach((i) => {
      const name = i.source?.name || "Unknown";
      sourceDistribution[name] = (sourceDistribution[name] || 0) + 1;
      sourceNames.add(name);
      if (i.source?.reliability !== undefined) {
        if (!sourceReliability[name]) sourceReliability[name] = { total: 0, count: 0 };
        sourceReliability[name].total += i.source.reliability;
        sourceReliability[name].count += 1;
      }
    });

    // Hourly buckets for severity timeline (last 24h)
    const hourlyBuckets: Record<string, { high: number; medium: number; low: number }> = {};
    const now = Date.now();
    for (let h = 23; h >= 0; h--) {
      const label = `${h}h ago`;
      hourlyBuckets[label] = { high: 0, medium: 0, low: 0 };
    }
    incidents.forEach((i) => {
      if (!i.timestamp) return;
      const age = now - new Date(i.timestamp).getTime();
      const hoursAgo = Math.floor(age / 3600000);
      if (hoursAgo >= 0 && hoursAgo < 24) {
        const label = `${hoursAgo}h ago`;
        if (hourlyBuckets[label]) {
          hourlyBuckets[label][i.credibility] += 1;
        }
      }
    });

    const avgOverall =
      incidents.reduce((acc, i) => acc + (i.credibility_scores?.overall || 0), 0) / total;
    const corrobIncidents = incidents.filter((i) => i.credibility_scores?.corroboration !== undefined);
    const avgCorroboration =
      corrobIncidents.length > 0
        ? corrobIncidents.reduce((acc, i) => acc + (i.credibility_scores?.corroboration || 0), 0) /
          corrobIncidents.length
        : 0;

    return {
      total,
      high,
      medium,
      low,
      activeSources: sourceNames.size,
      avgOverall,
      avgCorroboration,
      sourceDistribution,
      sourceReliability,
      hourlyBuckets,
    };
  }, [incidents]);

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  // --- Chart data ---

  // Source Distribution Radar
  const sourceLabels = Object.keys(stats.sourceDistribution);
  const sourceCounts = sourceLabels.map((k) => stats.sourceDistribution[k]);
  const radarData = {
    labels: sourceLabels,
    datasets: [
      {
        label: "Incident Count",
        data: sourceCounts,
        backgroundColor: "rgba(100, 116, 139, 0.1)",
        borderColor: "rgba(100, 116, 139, 0.5)",
        borderWidth: 2,
        pointBackgroundColor: "#64748b",
        pointBorderColor: "rgba(226,232,240,1)",
        pointRadius: 5,
        pointHoverRadius: 7,
      },
    ],
  };
  const radarOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      r: {
        beginAtZero: true,
        ticks: {
          color: "rgba(100,116,139,0.8)",
          backdropColor: "transparent",
          font: { size: 10 },
        },
        grid: { color: "rgba(226,232,240,0.8)" },
        pointLabels: {
          color: "rgba(51,65,85,1)",
          font: { size: 11, weight: "bold" as const },
        },
      },
    },
    plugins: {
      legend: { display: false },
      tooltip: { backgroundColor: "rgba(255,255,255,0.95)", titleColor: "#334155", bodyColor: "#475569", borderColor: "#e2e8f0", borderWidth: 1 },
    },
  };

  // Credibility Doughnut
  const doughnutData = {
    labels: ["High", "Medium", "Low"],
    datasets: [
      {
        data: [stats.high, stats.medium, stats.low],
        backgroundColor: ["#e57373", "#ffb74d", "#81c784"],
        borderColor: ["#e5737340", "#ffb74d40", "#81c78440"],
        borderWidth: 2,
        hoverBorderColor: ["#e57373", "#ffb74d", "#81c784"],
      },
    ],
  };
  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: "70%",
    plugins: {
      legend: {
        display: true,
        position: "bottom" as const,
        labels: { color: "rgba(51,65,85,1)", font: { size: 11 }, boxWidth: 12, padding: 16 },
      },
      tooltip: { backgroundColor: "rgba(255,255,255,0.95)", titleColor: "#334155", bodyColor: "#475569", borderColor: "#e2e8f0", borderWidth: 1 },
    },
  };

  // Severity Timeline Line
  const hourLabels = Object.keys(stats.hourlyBuckets);
  const timelineData = {
    labels: hourLabels,
    datasets: [
      {
        label: "High",
        data: hourLabels.map((h) => stats.hourlyBuckets[h]?.high || 0),
        borderColor: "#e57373",
        backgroundColor: "rgba(229,115,115,0.08)",
        tension: 0.4,
        fill: true,
        pointRadius: 2,
        pointHoverRadius: 5,
      },
      {
        label: "Medium",
        data: hourLabels.map((h) => stats.hourlyBuckets[h]?.medium || 0),
        borderColor: "#ffb74d",
        backgroundColor: "rgba(255,183,77,0.08)",
        tension: 0.4,
        fill: true,
        pointRadius: 2,
        pointHoverRadius: 5,
      },
      {
        label: "Low",
        data: hourLabels.map((h) => stats.hourlyBuckets[h]?.low || 0),
        borderColor: "#81c784",
        backgroundColor: "rgba(129,199,132,0.08)",
        tension: 0.4,
        fill: true,
        pointRadius: 2,
        pointHoverRadius: 5,
      },
    ],
  };
  const lineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "index" as const, intersect: false },
    scales: {
      x: {
        grid: { color: "rgba(226,232,240,0.6)" },
        ticks: { color: "rgba(100,116,139,0.8)", maxTicksLimit: 12, font: { size: 10 } },
      },
      y: {
        beginAtZero: true,
        grid: { color: "rgba(226,232,240,0.6)" },
        ticks: { color: "rgba(100,116,139,0.8)", stepSize: 1, font: { size: 10 } },
      },
    },
    plugins: {
      legend: {
        display: true,
        position: "top" as const,
        labels: { color: "rgba(51,65,85,1)", font: { size: 11 }, boxWidth: 12 },
      },
      tooltip: { backgroundColor: "rgba(255,255,255,0.95)", titleColor: "#334155", bodyColor: "#475569", borderColor: "#e2e8f0", borderWidth: 1 },
    },
  };

  // Source Reliability Bar (horizontal)
  const reliabilityEntries = Object.entries(stats.sourceReliability)
    .map(([name, { total, count }]) => ({ name, avg: total / count }))
    .sort((a, b) => b.avg - a.avg);
  const barData = {
    labels: reliabilityEntries.map((e) => e.name),
    datasets: [
      {
        label: "Avg Reliability",
        data: reliabilityEntries.map((e) => +(e.avg * 100).toFixed(1)),
        backgroundColor: reliabilityEntries.map((e) => {
          const v = e.avg;
          if (v >= 0.8) return "#81c784";
          if (v >= 0.6) return "#ffb74d";
          return "#e57373";
        }),
        borderColor: "transparent",
        borderWidth: 0,
        borderRadius: 4,
      },
    ],
  };
  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: "y" as const,
    scales: {
      x: {
        min: 0,
        max: 100,
        grid: { color: "rgba(226,232,240,0.6)" },
        ticks: { color: "rgba(100,116,139,0.8)", font: { size: 10 } },
      },
      y: {
        grid: { display: false },
        ticks: { color: "rgba(51,65,85,1)", font: { size: 11 } },
      },
    },
    plugins: {
      legend: { display: false },
      tooltip: { backgroundColor: "rgba(255,255,255,0.95)", titleColor: "#334155", bodyColor: "#475569", borderColor: "#e2e8f0", borderWidth: 1 },
    },
  };

  if (!incidents || incidents.length === 0) {
    return null;
  }

  return (
    <>
      {/* Floating button */}
      <motion.button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 w-12 h-12 lg:w-14 lg:h-14 bg-white/95 backdrop-blur-xl rounded-full shadow-2xl border border-slate-200 flex items-center justify-center group"
        aria-label="View Credibility Analytics"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 400, damping: 17 }}
      >
        <Activity className="w-5 h-5 lg:w-6 lg:h-6 text-slate-400" />
        <motion.div
          className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-slate-400 rounded-full"
          animate={{ scale: [1, 1.3, 1], opacity: [1, 0.6, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      </motion.button>

      {/* Modal */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="fixed inset-0 z-[100] flex items-center justify-center p-0 lg:p-4 bg-slate-900/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <motion.div
              className="bg-white border-0 lg:border border-slate-200 rounded-none lg:rounded-2xl shadow-2xl w-full h-full lg:max-w-7xl lg:w-full lg:max-h-[90vh] overflow-hidden"
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 lg:p-6 border-b border-slate-200">
                <motion.div
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.1 }}
                  className="flex-1 min-w-0"
                >
                  <h2 className="text-xl lg:text-2xl font-semibold text-slate-900 flex items-center gap-2 lg:gap-3">
                    <div className="w-8 h-8 lg:w-10 lg:h-10 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-center flex-shrink-0">
                      <BarChart3 className="w-4 h-4 lg:w-5 lg:h-5 text-slate-500" />
                    </div>
                    <span className="truncate">Credibility Pipeline Analytics</span>
                  </h2>
                  <p className="text-xs lg:text-sm text-slate-400 mt-1 ml-10 lg:ml-[52px]">
                    5-stage scoring pipeline &middot; Real-time data
                  </p>
                </motion.div>
                <motion.button
                  onClick={() => setIsOpen(false)}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200 flex-shrink-0"
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <X className="w-5 h-5 lg:w-6 lg:h-6 text-slate-400" />
                </motion.button>
              </div>

              {/* Content */}
              <div className="p-4 lg:p-6 overflow-y-auto max-h-[calc(100vh-80px)] lg:max-h-[calc(90vh-120px)] space-y-4 lg:space-y-5">
                {/* Pipeline Overview */}
                <motion.div
                  className="bg-slate-50 rounded-xl p-4 lg:p-6 border border-slate-100"
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.1 }}
                >
                  <h3 className="text-sm lg:text-base font-semibold text-slate-900 mb-4 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-slate-500" />
                    Pipeline Overview
                  </h3>
                  <div className="relative flex flex-col lg:flex-row items-stretch lg:items-center gap-3 lg:gap-0">
                    {/* Gradient connector line (desktop) */}
                    <div className="hidden lg:block absolute top-1/2 left-[10%] right-[10%] h-px bg-gradient-to-r from-slate-300/40 via-slate-400/40 to-slate-300/40 -translate-y-1/2 z-0" />
                    {PIPELINE_STAGES.map((stage, idx) => {
                      const Icon = stage.icon;
                      return (
                        <motion.div
                          key={idx}
                          className="relative z-10 flex-1 bg-white border border-slate-200 rounded-lg p-3 lg:p-4 lg:mx-1.5 first:lg:ml-0 last:lg:mr-0"
                          initial={{ y: 15, opacity: 0 }}
                          animate={{ y: 0, opacity: 1 }}
                          transition={{ delay: 0.15 + idx * 0.06 }}
                          whileHover={{ y: -3, borderColor: stage.color + "40" }}
                        >
                          <div className="flex items-center gap-2 lg:flex-col lg:items-center lg:text-center">
                            <div
                              className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                              style={{ backgroundColor: stage.color + "15", border: `1px solid ${stage.color}30` }}
                            >
                              <Icon className="w-4 h-4" style={{ color: stage.color }} />
                            </div>
                            <div className="lg:mt-2">
                              <div className="text-xs font-medium text-slate-900 lg:text-[11px]">{stage.name}</div>
                              <div className="text-[10px] text-slate-400 mt-0.5 leading-tight hidden lg:block">
                                {stage.description}
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </motion.div>

                {/* Stats cards row */}
                <motion.div
                  className="grid grid-cols-2 lg:grid-cols-4 gap-3"
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  {[
                    { label: "Total Incidents", value: stats.total, accent: "#64748b" },
                    { label: "Active Sources", value: stats.activeSources, accent: "#94a3b8" },
                    {
                      label: "Avg Credibility",
                      value: `${(stats.avgOverall * 100).toFixed(1)}%`,
                      accent: "#ffb74d",
                    },
                    {
                      label: "Avg Corroboration",
                      value: `${(stats.avgCorroboration * 100).toFixed(1)}%`,
                      accent: "#81c784",
                    },
                  ].map((card, idx) => (
                    <motion.div
                      key={idx}
                      className="bg-slate-50 border border-slate-100 rounded-xl p-3 lg:p-4"
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.22 + idx * 0.04 }}
                      whileHover={{ y: -2, borderColor: card.accent + "30" }}
                    >
                      <div className="text-2xl lg:text-3xl font-semibold text-slate-900">{card.value}</div>
                      <div className="text-[10px] lg:text-xs text-slate-400 mt-0.5">{card.label}</div>
                      <div className="h-0.5 w-8 rounded-full mt-2" style={{ backgroundColor: card.accent + "60" }} />
                    </motion.div>
                  ))}
                </motion.div>

                {/* Charts grid: Radar + Doughnut */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Source Distribution Radar */}
                  <motion.div
                    className="bg-white border border-slate-200 rounded-xl shadow-sm p-4 lg:p-5"
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.25 }}
                  >
                    <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                      <Globe className="w-4 h-4 text-slate-500" />
                      Source Distribution
                    </h3>
                    <div className="h-[280px] lg:h-[300px]">
                      {sourceLabels.length >= 2 ? (
                        <Radar data={radarData} options={radarOptions} />
                      ) : (
                        <div className="flex items-center justify-center h-full text-slate-400 text-sm">
                          Need 2+ sources for radar chart
                        </div>
                      )}
                    </div>
                  </motion.div>

                  {/* Credibility Doughnut */}
                  <motion.div
                    className="bg-white border border-slate-200 rounded-xl shadow-sm p-4 lg:p-5"
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.28 }}
                  >
                    <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                      <Shield className="w-4 h-4 text-slate-500" />
                      Credibility Distribution
                    </h3>
                    <div className="relative h-[280px] lg:h-[300px]">
                      <Doughnut data={doughnutData} options={doughnutOptions} />
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none -mt-6">
                        <div className="text-center">
                          <div className="text-3xl font-bold text-slate-900">{stats.total}</div>
                          <div className="text-[10px] text-slate-400 uppercase tracking-widest">Total</div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </div>

                {/* Severity Timeline (collapsible) */}
                <motion.div
                  className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden"
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  <motion.button
                    onClick={() => toggleSection("timeline")}
                    className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors"
                    whileTap={{ scale: 0.99 }}
                  >
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-slate-500" />
                      <span className="text-sm font-semibold text-slate-900">Severity Timeline (24h)</span>
                    </div>
                    <motion.div
                      animate={{ rotate: expandedSection === "timeline" ? 180 : 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    </motion.div>
                  </motion.button>
                  <AnimatePresence>
                    {expandedSection === "timeline" && (
                      <motion.div
                        className="px-4 pb-4"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                      >
                        <div className="h-[240px] lg:h-[280px]">
                          <Line data={timelineData} options={lineOptions} />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>

                {/* Source Reliability (collapsible) */}
                <motion.div
                  className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden"
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.33 }}
                >
                  <motion.button
                    onClick={() => toggleSection("reliability")}
                    className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors"
                    whileTap={{ scale: 0.99 }}
                  >
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-slate-500" />
                      <span className="text-sm font-semibold text-slate-900">Source Reliability Scores</span>
                    </div>
                    <motion.div
                      animate={{ rotate: expandedSection === "reliability" ? 180 : 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    </motion.div>
                  </motion.button>
                  <AnimatePresence>
                    {expandedSection === "reliability" && (
                      <motion.div
                        className="px-4 pb-4"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                      >
                        <div
                          className="lg:h-[280px]"
                          style={{ height: Math.max(180, reliabilityEntries.length * 36) }}
                        >
                          {reliabilityEntries.length > 0 ? (
                            <Bar data={barData} options={barOptions} />
                          ) : (
                            <div className="flex items-center justify-center h-full text-slate-400 text-sm">
                              No reliability data available
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
