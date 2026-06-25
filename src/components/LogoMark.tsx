"use client";

// Presentational brand mark for the Maghrebia Assistant redesign.
//
// A clean, inline SVG that reads as a rounded shield wrapping a chat bubble —
// "trusted insurance" (shield) meets "conversation" (bubble). It is purely
// decorative; callers that use it as the sole identity should provide their own
// visible/accessible label, so the SVG is marked aria-hidden.
//
// Color comes entirely from `currentColor`, so a `text-brand` (or any Theme_Token
// text utility) on the element drives the mark and it re-themes across
// light/dark Color_Modes automatically.

export type LogoMarkProps = {
  /** Extra classes (typically a size + a `text-*` token to color the mark). */
  className?: string;
};

export function LogoMark({ className }: LogoMarkProps) {
  return (
    <svg
      viewBox="0 0 32 32"
      role="img"
      aria-hidden="true"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Rounded shield silhouette */}
      <path
        d="M16 2.5l9.5 3.4c.6.2 1 .8 1 1.4v7.2c0 6.2-3.9 11.7-9.8 13.9a2 2 0 01-1.4 0C9.4 30.2 5.5 24.7 5.5 18.5V7.3c0-.6.4-1.2 1-1.4L16 2.5z"
        fill="currentColor"
        fillOpacity="0.14"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      {/* Chat bubble inside the shield */}
      <path
        d="M11 12.5h10c.8 0 1.5.7 1.5 1.5v4c0 .8-.7 1.5-1.5 1.5h-4.2L13 22.5v-2.9c-1.1-.2-2-1.1-2-2.1v-3.5c0-.8.7-1.5 1-1.5z"
        fill="currentColor"
      />
    </svg>
  );
}

export default LogoMark;
