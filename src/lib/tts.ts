/**
 * Text-to-Speech utility using free Web Speech API (SpeechSynthesis)
 * No API key required — works in all modern browsers
 */

let currentUtterance: SpeechSynthesisUtterance | null = null;

export async function speakText(text: string): Promise<void> {
  if (typeof window === "undefined" || !window.speechSynthesis) {
    console.warn("SpeechSynthesis not available");
    return;
  }

  // Cancel any ongoing speech
  window.speechSynthesis.cancel();

  return new Promise((resolve, reject) => {
    const utterance = new SpeechSynthesisUtterance(text);
    currentUtterance = utterance;

    // Pick a good English voice if available
    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find(
      (v) => v.lang.startsWith("en") && v.name.includes("Google")
    ) || voices.find((v) => v.lang.startsWith("en-US"))
      || voices.find((v) => v.lang.startsWith("en"));

    if (preferred) utterance.voice = preferred;
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    utterance.onend = () => {
      currentUtterance = null;
      resolve();
    };

    utterance.onerror = (event) => {
      currentUtterance = null;
      if (event.error === "canceled" || event.error === "interrupted") {
        resolve();
      } else {
        reject(new Error(`TTS error: ${event.error}`));
      }
    };

    window.speechSynthesis.speak(utterance);
  });
}

export function stopSpeaking(): void {
  if (typeof window !== "undefined" && window.speechSynthesis) {
    window.speechSynthesis.cancel();
    currentUtterance = null;
  }
}