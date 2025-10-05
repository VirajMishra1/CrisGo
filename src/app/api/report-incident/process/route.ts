import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const ELEVENLABS_API_KEY = "2500e0517c20e06ef1bf94e32c7973eda6112a9e8100a924b5569b350b3de305";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;

export async function POST(request: NextRequest) {
  try {
    const { conversationId } = await request.json();

    if (!conversationId) {
      return NextResponse.json(
        { success: false, error: "Conversation ID required" },
        { status: 400 }
      );
    }

    console.log("🔍 Fetching conversation:", conversationId);

    // Get conversation details from ElevenLabs
    const conversationResponse = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversations/${conversationId}`,
      {
        headers: {
          "xi-api-key": ELEVENLABS_API_KEY,
        },
      }
    );

    if (!conversationResponse.ok) {
      const errorText = await conversationResponse.text();
      console.error("❌ ElevenLabs API error:", conversationResponse.status, errorText);
      throw new Error(`Failed to fetch conversation: ${conversationResponse.status}`);
    }

    const conversationData = await conversationResponse.json();
    console.log("📦 Conversation data:", JSON.stringify(conversationData, null, 2));
    
    // Extract and format transcript
    let transcriptText = "";
    
    if (conversationData.transcript && Array.isArray(conversationData.transcript)) {
      // Transcript is an array of message objects
      transcriptText = conversationData.transcript
        .map((msg: any) => {
          const role = msg.role || msg.speaker || "unknown";
          const text = msg.message || msg.text || msg.content || "";
          return `${role}: ${text}`;
        })
        .join("\n");
    } else if (conversationData.analysis?.transcript_summary) {
      transcriptText = conversationData.analysis.transcript_summary;
    } else if (typeof conversationData.transcript === "string") {
      transcriptText = conversationData.transcript;
    }

    console.log("📝 Formatted transcript:", transcriptText);

    if (!transcriptText || transcriptText.trim().length === 0) {
      return NextResponse.json({
        success: false,
        error: "No transcript available yet. The conversation may still be processing."
      }, { status: 400 });
    }

    if (!GEMINI_API_KEY) {
      return NextResponse.json({
        success: true,
        summary: transcriptText,
        location: null,
        warning: "Gemini API key not configured - location extraction skipped"
      });
    }

    // Use Gemini to extract location and incident details
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    // Use latest Gemini 2.5 Flash model
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

    const prompt = `
You are an incident report analyzer with location intelligence. Extract the following information from this conversation transcript:
1. What happened (incident type and description)
2. Where it happened (location with coordinates)
3. Severity level (low, medium, high)

**CRITICAL - LOCATION EXTRACTION:**
- ALWAYS provide latitude and longitude coordinates, even if the address is vague
- If exact address is given, provide precise coordinates
- If only a neighborhood/area is mentioned, provide approximate coordinates for that area's center
- If only landmarks are mentioned, provide coordinates near those landmarks
- If city/state only, provide coordinates for the city center
- If completely unclear, provide coordinates for a major central location in the most likely city (default to New York City if no city mentioned)
- NEVER return null coordinates - always make your best educated guess

Conversation:
${transcriptText}

Respond in JSON format:
{
  "incident_type": "string (e.g., 'road_closure', 'accident', 'flooding', 'fire', 'hazard', 'other')",
  "description": "string (brief summary)",
  "location_text": "string (address, landmark, or area description)",
  "latitude": number (estimated latitude, e.g., 40.7580),
  "longitude": number (estimated longitude, e.g., -73.9855),
  "location_confidence": "string (high/medium/low - how confident are you about the coordinates)",
  "severity": "string (low/medium/high)"
}

Examples:
- "Near Central Park" → lat: 40.7829, lng: -73.9654, confidence: "medium"
- "Downtown Manhattan" → lat: 40.7589, lng: -73.9851, confidence: "medium"  
- "5th Avenue and 42nd Street" → lat: 40.7540, lng: -73.9808, confidence: "high"
- "Somewhere in Brooklyn" → lat: 40.6782, lng: -73.9442, confidence: "low"

ALWAYS provide numeric coordinates, never null or "unknown".
`;

    console.log("🤖 Calling Gemini for analysis...");
    const result = await model.generateContent(prompt);
    const response = result.response.text();
    console.log("📥 Gemini response:", response);
    
    // Parse JSON from response (handle markdown code blocks)
    const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/) || response.match(/\{[\s\S]*\}/);
    const extractedData = jsonMatch ? JSON.parse(jsonMatch[1] || jsonMatch[0]) : null;

    console.log("✅ Gemini extracted:", extractedData);

    // Use Gemini-provided coordinates first
    let coordinates = null;
    if (extractedData?.latitude && extractedData?.longitude) {
      coordinates = {
        lat: extractedData.latitude,
        lng: extractedData.longitude
      };
      console.log("📍 Using Gemini coordinates:", coordinates, `(confidence: ${extractedData.location_confidence || 'unknown'})`);
    }
    
    // Fallback: Try Nominatim geocoding if coordinates not provided or confidence is low
    if (!coordinates && extractedData?.location_text && extractedData.location_text !== "Unknown location") {
      try {
        console.log("🌍 Fallback: Geocoding with Nominatim:", extractedData.location_text);
        const geocodeResponse = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(extractedData.location_text)}&limit=1`,
          {
            headers: {
              "User-Agent": "SafeTrekXR/1.0"
            }
          }
        );
        
        const geocodeData = await geocodeResponse.json();
        if (geocodeData && geocodeData.length > 0) {
          coordinates = {
            lat: parseFloat(geocodeData[0].lat),
            lng: parseFloat(geocodeData[0].lon)
          };
          console.log("📍 Nominatim geocoded location:", coordinates);
        }
      } catch (geocodeError) {
        console.error("Geocoding error:", geocodeError);
      }
    }
    
    // Last resort: Default to NYC Times Square if still no coordinates
    if (!coordinates) {
      coordinates = {
        lat: 40.7580,
        lng: -73.9855
      };
      console.log("⚠️ Using default NYC coordinates as fallback");
    }

    return NextResponse.json({
      success: true,
      summary: transcriptText,
      incidentData: extractedData,
      coordinates,
      conversationId
    });
  } catch (error: any) {
    console.error("❌ Error processing conversation:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}