import { NextRequest, NextResponse } from "next/server";

const ELEVENLABS_API_KEY = "2500e0517c20e06ef1bf94e32c7973eda6112a9e8100a924b5569b350b3de305";
const AGENT_ID = "agent_0801k6ravcndfd6sz48dykgsne27";

export async function POST(request: NextRequest) {
  try {
    // Get signed URL for authenticated WebSocket connection
    const response = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversation/get-signed-url?agent_id=${AGENT_ID}`,
      {
        method: "GET",
        headers: {
          "xi-api-key": ELEVENLABS_API_KEY,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to get signed URL: ${response.statusText}`);
    }

    const data = await response.json();
    
    console.log("✅ Got signed WebSocket URL");
    
    return NextResponse.json({
      success: true,
      signedUrl: data.signed_url,
      agentId: AGENT_ID
    });
  } catch (error: any) {
    console.error("Error getting signed URL:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}