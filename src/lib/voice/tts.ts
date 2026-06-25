// Text-to-speech seam for spoken assistant replies.
//
// Gemini-backed TTS is planned but NOT implemented yet. This module is the
// single integration point so the voice UI can call `speak()` today (a no-op)
// and the real synthesis can be dropped in later without touching components.
//
// When implemented, `speak()` should: request audio for `text` from the Gemini
// TTS endpoint via the API_Client, play it, and resolve when playback finishes
// (or reject on failure). `cancel()` should stop any in-flight playback.

export const TTS_ENABLED = false;

export type SpeakOptions = {
  /** BCP-47 locale hint for voice selection (e.g. "fr-FR", "ar-TN"). */
  lang?: string;
  /** AbortSignal to cancel a pending/active utterance. */
  signal?: AbortSignal;
};

/**
 * Speak the given text. Currently a no-op placeholder (Gemini TTS pending).
 * Returns a resolved promise so callers can `await` it unconditionally.
 */
export async function speak(text: string, options: SpeakOptions = {}): Promise<void> {
  void text;
  void options;
  // TODO(gemini-tts): synthesize + play audio for `text`.
  return Promise.resolve();
}

/** Stop any in-flight speech. No-op until TTS is implemented. */
export function cancel(): void {
  // TODO(gemini-tts): cancel active playback.
}
