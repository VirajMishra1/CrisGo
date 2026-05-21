"use client";

import { useState, useRef, useEffect } from "react";
import { X, AlertTriangle, MapPin, Loader2, Mic, MicOff } from "lucide-react";
import { toast } from "sonner";

interface VoiceReportDialogProps {
  open: boolean;
  onClose: () => void;
  onIncidentReported: (incident: {
    lat: number;
    lng: number;
    type: string;
    description: string;
    severity: string;
    reports_count: number;
  }) => void;
}

const INCIDENT_TYPES = [
  { value: "fire", label: "Fire" },
  { value: "flooding", label: "Flooding" },
  { value: "gas_leak", label: "Gas Leak" },
  { value: "power_outage", label: "Power Outage" },
  { value: "road_closure", label: "Road Closure" },
  { value: "building_collapse", label: "Building Collapse" },
  { value: "traffic", label: "Traffic Incident" },
  { value: "hazard", label: "Hazard" },
  { value: "earthquake", label: "Earthquake" },
  { value: "water_system", label: "Water System" },
];

const SEVERITIES = [
  { value: "high", label: "High", color: "text-red-600 bg-red-50 border-red-200" },
  { value: "medium", label: "Medium", color: "text-amber-600 bg-amber-50 border-amber-200" },
  { value: "low", label: "Low", color: "text-emerald-600 bg-emerald-50 border-emerald-200" },
];

export default function VoiceReportDialog({
  open,
  onClose,
  onIncidentReported,
}: VoiceReportDialogProps) {
  const [type, setType] = useState("hazard");
  const [description, setDescription] = useState("");
  const [severity, setSeverity] = useState("medium");
  const [locationText, setLocationText] = useState("");
  const [locationSuggestions, setLocationSuggestions] = useState<{ label: string; lat: number; lng: number }[]>([]);
  const [locationLocked, setLocationLocked] = useState<{ lat: number; lng: number } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (locationLocked || locationText.length < 3) {
      setLocationSuggestions([]);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://photon.komoot.io/api/?q=${encodeURIComponent(locationText)}&limit=5`,
          { headers: { "User-Agent": "CrisGo/1.0" } }
        );
        const data = await res.json();
        const suggestions = (data.features || []).map((f: any) => {
          const p = f.properties;
          const parts = [p.name, p.city, p.state, p.country].filter(Boolean);
          return { label: parts.join(", "), lat: f.geometry.coordinates[1], lng: f.geometry.coordinates[0] };
        });
        setLocationSuggestions(suggestions);
      } catch {
        setLocationSuggestions([]);
      }
    }, 350);
  }, [locationText, locationLocked]);

  const toggleVoice = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      toast.error("Speech recognition not supported in this browser");
      return;
    }

    if (listening) {
      recognitionRef.current?.stop();
      return;
    }

    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "en-US";

    let finalTranscript = description;

    rec.onstart = () => setListening(true);
    rec.onend = () => setListening(false);
    rec.onerror = (e: any) => {
      toast.error("Mic error: " + e.error);
      setListening(false);
    };
    rec.onresult = (e: any) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) finalTranscript += (finalTranscript ? " " : "") + t;
        else interim = t;
      }
      setDescription(finalTranscript + (interim ? " " + interim : ""));
    };

    recognitionRef.current = rec;
    rec.start();
  };

  if (!open) {
    recognitionRef.current?.stop();
    return null;
  }

  const handleSubmit = async () => {
    if (!description.trim()) { toast.error("Description is required"); return; }
    if (!locationLocked) { toast.error("Select a location from the dropdown"); return; }

    toast.success("Incident reported!");
    onIncidentReported({ lat: locationLocked.lat, lng: locationLocked.lng, type, description, severity, reports_count: 1 });
    onClose();
    setDescription("");
    setLocationText("");
    setLocationLocked(null);
    setType("hazard");
    setSeverity("medium");
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            Report Incident
          </h2>
          <button onClick={() => { recognitionRef.current?.stop(); onClose(); }} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5 uppercase tracking-wider">
              Type
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {INCIDENT_TYPES.map((t) => (
                <button
                  key={t.value}
                  onClick={() => setType(t.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all text-left ${
                    type === t.value
                      ? "bg-slate-900 text-white border-slate-900"
                      : "bg-slate-50 text-slate-500 border-slate-100 hover:border-slate-300"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5 uppercase tracking-wider">
              Severity
            </label>
            <div className="flex gap-2">
              {SEVERITIES.map((s) => (
                <button
                  key={s.value}
                  onClick={() => setSeverity(s.value)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                    severity === s.value ? s.color : "bg-slate-50 text-slate-400 border-slate-100"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5 uppercase tracking-wider">
              Location
            </label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 z-10" />
              <input
                type="text"
                placeholder="e.g. Times Square, New York"
                value={locationText}
                onChange={(e) => { setLocationText(e.target.value); setLocationLocked(null); }}
                className={`w-full pl-8 pr-3 py-2 text-sm border rounded-lg bg-slate-50 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300 focus:bg-white ${locationLocked ? "border-emerald-300" : "border-slate-200"}`}
              />
              {locationSuggestions.length > 0 && (
                <ul className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-50 overflow-hidden">
                  {locationSuggestions.map((s, i) => (
                    <li
                      key={i}
                      onClick={() => { setLocationText(s.label); setLocationLocked({ lat: s.lat, lng: s.lng }); setLocationSuggestions([]); }}
                      className="px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 cursor-pointer flex items-center gap-2 border-b border-slate-100 last:border-0"
                    >
                      <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                      {s.label}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider">
                Description
              </label>
              <button
                type="button"
                onClick={toggleVoice}
                className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium border transition-all ${
                  listening
                    ? "bg-red-50 text-red-600 border-red-200 animate-pulse"
                    : "bg-slate-50 text-slate-500 border-slate-200 hover:border-slate-300"
                }`}
              >
                {listening ? <MicOff className="w-3 h-3" /> : <Mic className="w-3 h-3" />}
                {listening ? "Stop" : "Speak"}
              </button>
            </div>
            <textarea
              rows={3}
              placeholder={listening ? "Listening..." : "Describe what you observed..."}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={`w-full px-3 py-2 text-sm border rounded-lg bg-slate-50 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:bg-white resize-none transition-all ${
                listening ? "border-red-300 focus:ring-red-200" : "border-slate-200 focus:ring-slate-300"
              }`}
            />
          </div>

          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full py-2.5 bg-slate-900 hover:bg-slate-700 disabled:bg-slate-300 text-white rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Locating...
              </>
            ) : (
              "Submit Report"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
