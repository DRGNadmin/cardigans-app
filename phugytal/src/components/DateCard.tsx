"use client";

import { useEffect, useState } from "react";

function formatParts(d: Date) {
  return {
    dayMonth: d
      .toLocaleDateString("ru-RU", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
      .toUpperCase(),
    weekday: d
      .toLocaleDateString("ru-RU", { weekday: "long" })
      .toUpperCase(),
  };
}

export function DateCard({
  accent = "#7946E2",
}: {
  accent?: string;
}) {
  const [label, setLabel] = useState<{ dayMonth: string; weekday: string } | null>(
    null,
  );

  useEffect(() => {
    setLabel(formatParts(new Date()));
  }, []);

  return (
    <div className="ui-panel flex items-center gap-3 px-3.5 py-2.5">
      <span
        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px]"
        style={{
          background: `color-mix(in srgb, ${accent} 22%, transparent)`,
          color: accent,
        }}
        aria-hidden
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <rect
            x="4"
            y="5"
            width="16"
            height="15"
            rx="2"
            stroke="currentColor"
            strokeWidth="1.8"
          />
          <path
            d="M8 3v4M16 3v4M4 10h16"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      </span>
      <div className="text-left">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white">
          {label?.dayMonth ?? "\u00A0"}
        </p>
        <p className="mt-0.5 text-[10px] uppercase tracking-[0.14em] text-white/45">
          {label?.weekday ?? "\u00A0"}
        </p>
      </div>
    </div>
  );
}
