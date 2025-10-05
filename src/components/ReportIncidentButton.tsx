"use client";

import { Phone } from "lucide-react";

interface ReportIncidentButtonProps {
  onReportIncident: () => void;
}

export default function ReportIncidentButton({ onReportIncident }: ReportIncidentButtonProps) {
  return (
    <button
      onClick={onReportIncident}
      className="absolute bottom-6 left-6 z-[1000] bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white px-5 py-2.5 rounded-lg shadow-lg font-semibold flex items-center gap-2 transition-all"
    >
      <Phone className="w-4 h-4" />
      Report Incident
    </button>
  );
}