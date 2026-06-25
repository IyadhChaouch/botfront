"use client";

// Voice mode (design canvas "03/04 · Mode vocal"). A full-screen, immersive
// view with an organic morphing teal "orb", expanding sound rings, a live
// waveform, the recognized transcript, and the mic / end / speaker controls.
//
// Speech-to-text uses the browser Web Speech API as a progressive enhancement
// (see `useSpeechRecognition`); the recognized question is handed back to the
// chat page through sessionStorage on "end", where it is sent through the
// normal chat path. Spoken replies (TTS) go through the `speak()` seam, which
// is a no-op until Gemini TTS is wired in.

import { useEffect, useState } from "react";

import { useRouter } from "next/navigation";

import {
  ChevronLeftIcon,
  MicrophoneIcon,
  SpeakerWaveIcon,
  SpeakerXMarkIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

import { usePreferences, useT } from "@/lib/preferences";
import { useSpeechRecognition } from "@/lib/voice/useSpeechRecognition";
import { cancel as cancelTts, speak } from "@/lib/voice/tts";

const VOICE_HANDOFF_KEY = "mgb-voice-pending";
const WAVE_DELAYS = [0, 0.15, 0.3, 0.45, 0.6, 0.3, 0.15];

/** The morphing orb glyph with two expanding sound rings. */
function VoiceOrb() {
  return (
    <div className="relative mb-8 flex h-[240px] w-[240px] items-center justify-center">
      <span
        aria-hidden="true"
        className="animate-ring-out absolute h-full w-full rounded-full border border-brand/30"
      />
      <span
        aria-hidden="true"
        className="animate-ring-out absolute h-full w-full rounded-full border border-brand/30"
        style={{ animationDelay: "1.4s" }}
      />
      <div className="animate-orb-pulse relative h-[172px] w-[172px]">
        <div
          className="animate-orb-core absolute inset-0"
          style={{
            background:
              "radial-gradient(circle at 32% 30%, #2BC2B3 0%, #00857A 55%, #00655C 100%)",
            boxShadow: "0 18px 50px rgba(0,133,122,.32)",
            borderRadius: "42% 58% 56% 44% / 48% 42% 58% 52%",
          }}
        />
        <div
          className="animate-orb-glow absolute inset-[14px]"
          style={{
            background:
              "radial-gradient(circle at 65% 70%, rgba(245,166,35,.5) 0%, rgba(43,194,179,0) 60%)",
            mixBlendMode: "screen",
            borderRadius: "58% 42% 48% 52% / 46% 56% 44% 54%",
          }}
        />
        <div
          className="animate-orb-sheen absolute inset-[30px]"
          style={{
            background:
              "radial-gradient(circle at 40% 35%, rgba(255,255,255,.55) 0%, rgba(255,255,255,0) 55%)",
            borderRadius: "50% 50% 52% 48% / 52% 46% 54% 48%",
          }}
        />
      </div>
    </div>
  );
}

export function VoiceMode() {
  const t = useT();
  const router = useRouter();
  const { locale } = usePreferences();
  const lang = locale === "ar" ? "ar-TN" : "fr-FR";

  const { supported, listening, transcript, error, start, stop, reset } =
    useSpeechRecognition(lang);
  const [speakerOn, setSpeakerOn] = useState(false);

  // Auto-start listening on entry when supported.
  useEffect(() => {
    if (supported) start();
    return () => stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supported]);

  const goToChat = () => router.push("/");

  // End: hand the recognized question back to the chat page, then return.
  const handleEnd = () => {
    stop();
    const text = transcript.trim();
    if (text && typeof window !== "undefined") {
      window.sessionStorage.setItem(VOICE_HANDOFF_KEY, text);
    }
    goToChat();
  };

  const toggleMic = () => {
    if (listening) stop();
    else {
      reset();
      start();
    }
  };

  const toggleSpeaker = () => {
    setSpeakerOn((on) => {
      if (on) cancelTts();
      else void speak("", { lang });
      return !on;
    });
  };

  const title = listening ? t("voice.listening") : t("voice.idle");
  const subtitle = transcript || (supported ? "" : t("voice.unsupported"));

  return (
    <div className="relative flex h-screen flex-col overflow-hidden bg-bg text-text">
      {/* Ambient glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[320px]"
        style={{
          background:
            "radial-gradient(120% 80% at 50% -10%, color-mix(in srgb, var(--color-brand) 22%, transparent) 0%, transparent 70%)",
        }}
      />

      {/* Header */}
      <header className="relative flex h-[60px] shrink-0 items-center justify-between px-5">
        <button
          type="button"
          onClick={goToChat}
          className="flex items-center gap-2 text-[13px] font-semibold text-text-muted transition hover:text-text focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 rounded-lg"
        >
          <ChevronLeftIcon className="h-[18px] w-[18px]" />
          {t("voice.back")}
        </button>
        {listening ? (
          <div className="flex items-center gap-2 rounded-full border border-brand/30 bg-brand/10 px-3 py-1.5 text-[12.5px] font-semibold text-brand">
            <span className="h-[7px] w-[7px] rounded-full bg-brand" />
            {t("voice.status")}
          </div>
        ) : null}
      </header>

      {/* Orb + transcript */}
      <div className="relative flex flex-1 flex-col items-center justify-center px-8 text-center">
        <VoiceOrb />
        <h2 className="mb-2 text-[22px] font-semibold tracking-tight text-text">{title}</h2>
        {subtitle ? (
          <p
            className={`max-w-[400px] text-[15px] leading-relaxed ${
              error && !transcript ? "text-error" : "text-text-muted"
            }`}
            aria-live="polite"
          >
            {subtitle}
          </p>
        ) : null}

        {/* Waveform */}
        {listening ? (
          <div className="mt-7 flex h-[46px] items-center gap-1.5">
            {WAVE_DELAYS.map((delay, i) => (
              <span
                key={i}
                className="animate-bar-wave block h-[30px] w-[5px] rounded-full bg-brand"
                style={{ animationDelay: `${delay}s` }}
              />
            ))}
          </div>
        ) : null}
      </div>

      {/* Controls */}
      <div className="relative flex shrink-0 items-center justify-center gap-5 px-8 pb-9 pt-6">
        <button
          type="button"
          onClick={toggleMic}
          aria-label={t("voice.mic")}
          aria-pressed={listening}
          disabled={!supported}
          className={`flex h-[54px] w-[54px] items-center justify-center rounded-full border transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 disabled:cursor-not-allowed disabled:opacity-50 ${
            listening
              ? "border-brand bg-brand/10 text-brand"
              : "border-border bg-surface text-text"
          }`}
        >
          <MicrophoneIcon className="h-[22px] w-[22px]" />
        </button>

        <button
          type="button"
          onClick={handleEnd}
          aria-label={t("voice.end")}
          className="flex h-[66px] w-[66px] items-center justify-center rounded-full bg-error text-white shadow-lg transition hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-error/40"
        >
          <XMarkIcon className="h-6 w-6" strokeWidth={2} />
        </button>

        <button
          type="button"
          onClick={toggleSpeaker}
          aria-label={t("voice.speaker")}
          aria-pressed={speakerOn}
          className={`flex h-[54px] w-[54px] items-center justify-center rounded-full border transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 ${
            speakerOn
              ? "border-brand bg-brand/10 text-brand"
              : "border-border bg-surface text-text"
          }`}
        >
          {speakerOn ? (
            <SpeakerWaveIcon className="h-[22px] w-[22px]" />
          ) : (
            <SpeakerXMarkIcon className="h-[22px] w-[22px]" />
          )}
        </button>
      </div>
    </div>
  );
}

export default VoiceMode;
