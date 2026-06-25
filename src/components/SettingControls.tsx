"use client";

// Small presentational primitives shared by the Settings page: a labeled row,
// a teal toggle switch, and a segmented (pill) control. All on semantic
// Theme_Token utilities so they re-theme in light/dark Color_Modes.

import type { ReactNode } from "react";

export function SettingRow({
  title,
  description,
  children,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`flex items-center justify-between gap-5 border-b border-border/70 py-[18px] last:border-b-0 ${className ?? ""}`}
    >
      <div className="min-w-0">
        <div className="text-sm font-semibold text-text">{title}</div>
        {description ? (
          <div className="mt-0.5 text-[12.5px] text-text-muted">{description}</div>
        ) : null}
      </div>
      {children ? <div className="shrink-0">{children}</div> : null}
    </div>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative h-[26px] w-11 rounded-full transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 ${
        checked ? "bg-brand" : "bg-star-empty"
      }`}
    >
      <span
        className={`absolute top-[3px] h-5 w-5 rounded-full bg-white shadow transition-all ${
          checked ? "start-[21px]" : "start-[3px]"
        }`}
      />
    </button>
  );
}

export type SegmentOption<T extends string> = { value: T; label: ReactNode; ariaLabel?: string };

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
}: {
  value: T;
  options: SegmentOption<T>[];
  onChange: (next: T) => void;
  ariaLabel?: string;
}) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className="flex items-center gap-0.5 rounded-[10px] border border-border bg-bg p-[3px]"
    >
      {options.map((opt) => {
        const selected = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            aria-pressed={selected}
            aria-label={opt.ariaLabel}
            onClick={() => onChange(opt.value)}
            className={`rounded-[7px] px-3.5 py-[7px] text-[13px] font-semibold transition ${
              selected ? "bg-brand text-white shadow-sm" : "text-text-muted hover:text-text"
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
