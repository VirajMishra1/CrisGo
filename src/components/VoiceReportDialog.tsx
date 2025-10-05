"use client";

import { useState, useEffect } from "react";
import { X, Mic, Phone, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useConversation } from "@elevenlabs/react";

const AGENT_ID = "agent_0801k6ravcndfd6sz48dykgsne27";

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

export default function VoiceReportDialog({
  open,
  onClose,
  onIncidentReported,
}: VoiceReportDialogProps) {
  const [status, setStatus] = useState<"idle" | "connecting" | "active" | "processing">("idle");
  const [transcript, setTranscript] = useState<string[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isAgentSpeaking, setIsAgentSpeaking] = useState(false);
  
  // Use official ElevenLabs React SDK
  const conversation = useConversation({
    onConnect: (connectionData) => {
      console.log("✅ Connected to ElevenLabs agent!", connectionData);
      setStatus("active");
      setConversationId(connectionData.conversationId);
      toast.success("Connected! Agent will speak first...");
    },
    onDisconnect: () => {
      console.log("🔌 Disconnected from agent");
      if (status === "active") {
        handleEndCall();
      }
    },
    onMessage: (message) => {
      console.log("📩 Message from agent:", message);
      
      // Handle different message types
      if (message.type === "user_transcript") {
        const userText = message.message || message.user_transcript || "";
        if (userText.trim()) {
          console.log("✅ YOU SAID:", userText);
          setTranscript(prev => [...prev, `You: ${userText}`]);
          toast.success("✓ " + userText.substring(0, 40), { duration: 2000 });
        }
      } else if (message.type === "agent_response") {
        const agentText = message.message || message.agent_response || "";
        if (agentText.trim()) {
          console.log("✅ AGENT SAID:", agentText);
          setTranscript(prev => [...prev, `Agent: ${agentText}`]);
        }
      }
    },
    onError: (error) => {
      console.error("❌ Conversation error:", error);
      toast.error(`Error: ${error.message || 'Connection failed'}`);
      setStatus("idle");
    },
  });

  useEffect(() => {
    if (open) {
      startConversation();
    } else {
      stopConversation();
    }
  }, [open]);

  const startConversation = async () => {
    try {
      setStatus("connecting");
      console.log("🎤 Starting conversation with ElevenLabs agent...");
      
      // Request microphone access first
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true });
        console.log("✅ Microphone access granted");
      } catch (error) {
        console.error("❌ Microphone access denied:", error);
        toast.error("Microphone access is required. Please allow microphone access and try again.");
        setStatus("idle");
        return;
      }

      // Get signed URL from server
      const response = await fetch("/api/report-incident/start", {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to get authentication");
      }

      const { signedUrl } = await response.json();
      console.log("✅ Got signed URL for agent");

      // Start conversation with signed URL
      await conversation.startSession({
        signedUrl: signedUrl,
      });

      console.log("✅ Conversation session started!");
    } catch (error: any) {
      console.error("❌ Failed to start conversation:", error);
      toast.error(error.message || "Failed to start conversation");
      setStatus("idle");
    }
  };

  const stopConversation = async () => {
    try {
      if (conversation.status === "connected") {
        await conversation.endSession();
        console.log("✅ Conversation ended");
      }
      setStatus("idle");
      setTranscript([]);
      setIsAgentSpeaking(false);
      setConversationId(null);
    } catch (error) {
      console.error("❌ Error stopping conversation:", error);
    }
  };

  const handleEndCall = async () => {
    if (!conversationId) {
      console.log("⚠️ No conversation ID");
      onClose();
      return;
    }

    setStatus("processing");
    console.log("⏳ Processing conversation...");
    
    // Stop the conversation
    await stopConversation();

    try {
      // Wait for conversation to be processed by ElevenLabs
      await new Promise(resolve => setTimeout(resolve, 3000));

      console.log("📤 Sending conversation to processing API...");
      const response = await fetch("/api/report-incident/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId }),
      });

      const data = await response.json();
      console.log("📥 Processing result:", data);

      if (!data.success) {
        throw new Error(data.error || "Processing failed");
      }

      if (data.coordinates && data.incidentData) {
        toast.success("Incident reported successfully!");
        onIncidentReported({
          lat: data.coordinates.lat,
          lng: data.coordinates.lng,
          type: data.incidentData.incident_type,
          description: data.incidentData.description,
          severity: data.incidentData.severity,
          reports_count: 5, // Dummy count as requested
        });
      } else {
        toast.warning("Location could not be determined from conversation");
      }
    } catch (error: any) {
      console.error("❌ Processing error:", error);
      toast.error("Failed to process: " + error.message);
    } finally {
      onClose();
    }
  };

  if (!open) return null;

  // Determine if agent is speaking based on conversation state
  const isSpeaking = conversation.isSpeaking || isAgentSpeaking;
  const isConnected = conversation.status === "connected";

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
      <div className="bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-700">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Phone className="w-5 h-5 text-orange-500" />
            Report Incident
          </h2>
          <button
            onClick={handleEndCall}
            className="text-slate-400 hover:text-white transition-colors"
            disabled={status === "processing"}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status */}
        <div className="mb-6 text-center">
          {status === "connecting" && (
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-12 h-12 text-orange-500 animate-spin" />
              <p className="text-slate-300">Connecting to agent...</p>
            </div>
          )}

          {status === "active" && (
            <div className="flex flex-col items-center gap-3">
              <div className="relative">
                <Mic 
                  className={`w-16 h-16 transition-all ${
                    isSpeaking ? "text-orange-500 scale-110" : "text-red-500"
                  }`}
                />
                {!isSpeaking && (
                  <div className="absolute inset-0 bg-red-500/20 rounded-full animate-ping" />
                )}
              </div>
              <p className="text-slate-300 font-medium">
                {isSpeaking ? "🔊 Agent is speaking..." : "🎙️ Your turn - speak now"}
              </p>
              <p className="text-sm text-slate-400 max-w-xs">
                Describe what happened and where
              </p>
            </div>
          )}

          {status === "processing" && (
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
              <p className="text-slate-300">Processing your report...</p>
            </div>
          )}
        </div>

        {/* Real-time Transcript */}
        {transcript.length > 0 && (
          <div className="bg-slate-900/50 rounded-lg p-4 max-h-64 overflow-y-auto space-y-2 mb-4">
            <h3 className="text-xs font-semibold text-slate-400 mb-2">CONVERSATION</h3>
            {transcript.map((line, i) => (
              <div
                key={i}
                className={`text-sm animate-fade-in ${
                  line.startsWith("You:") ? "text-green-400 font-medium" : "text-blue-400"
                }`}
              >
                {line}
              </div>
            ))}
          </div>
        )}

        {/* Actions */}
        {status === "active" && (
          <button
            onClick={handleEndCall}
            className="mt-4 w-full bg-red-600 hover:bg-red-700 text-white py-3 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
          >
            <Phone className="w-4 h-4" />
            End Call & Submit Report
          </button>
        )}
      </div>
    </div>
  );
}