/**
 * Text-to-Speech utility using ElevenLabs API
 */

const ELEVENLABS_API_KEY = "2500e0517c20e06ef1bf94e32c7973eda6112a9e8100a924b5569b350b3de305";
const VOICE_ID = "pNInz6obpgDQGcFmaJgB"; // Default voice - can be changed

/**
 * Speaks text using ElevenLabs TTS API
 * @param text - The text to speak
 * @returns Promise that resolves when audio finishes playing
 */
export async function speakText(text: string): Promise<void> {
  try {
    console.log("🔊 TTS: Speaking:", text);

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`,
      {
        method: "POST",
        headers: {
          "Accept": "audio/mpeg",
          "Content-Type": "application/json",
          "xi-api-key": ELEVENLABS_API_KEY,
        },
        body: JSON.stringify({
          text: text,
          model_id: "eleven_monolingual_v1",
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.5
          }
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`TTS API error: ${response.status} - ${errorText}`);
    }

    // Get audio data as blob
    const audioBlob = await response.blob();
    console.log("✅ TTS: Audio received, size:", audioBlob.size, "bytes");

    // Create audio element and play
    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrl);

    return new Promise((resolve, reject) => {
      audio.onended = () => {
        console.log("✅ TTS: Playback complete");
        URL.revokeObjectURL(audioUrl);
        resolve();
      };

      audio.onerror = (error) => {
        console.error("❌ TTS: Playback error:", error);
        URL.revokeObjectURL(audioUrl);
        reject(error);
      };

      audio.play().catch((error) => {
        console.error("❌ TTS: Play failed:", error);
        URL.revokeObjectURL(audioUrl);
        reject(error);
      });
    });
  } catch (error) {
    console.error("❌ TTS: Error:", error);
    throw error;
  }
}