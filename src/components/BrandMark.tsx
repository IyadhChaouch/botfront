"use client";

// The Maghrebia shield logo used in the redesign header (matches the design
// canvas: a teal rounded square holding a shield/check glyph). Decorative; the
// adjacent wordmark provides the accessible name.

export type BrandMarkProps = {
  /** Extra classes for the teal tile (size/rounding). */
  className?: string;
  /** Icon size in px. */
  iconSize?: number;
};

export function BrandMark({ className, iconSize = 19 }: BrandMarkProps) {
  return (
    <span
      className={`flex items-center justify-center rounded-[9px] bg-brand text-white ${className ?? "h-9 w-9"}`}
      aria-hidden="true"
    >
      <svg
        width={iconSize}
        height={iconSize}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 3l7 2.5v5c0 4.6-3.1 8.2-7 9.1-3.9-.9-7-4.5-7-9.1v-5L12 3Z" />
        <path d="M9 11.5l2 2 4-4.2" />
      </svg>
    </span>
  );
}

export default BrandMark;
