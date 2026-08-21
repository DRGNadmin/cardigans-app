import { BeInGameArrow } from "@/components/BeInGameArrow";

type Stat = {
  value: string;
  label: string;
  iconColor?: string;
};

const ICON_COLORS = ["#00FF00", "#7946E2", "#00E6FF", "#FB5608"];

export function StatsBar({
  accent,
  items,
  cta = "Будь в игре",
}: {
  accent: string;
  items: Stat[];
  cta?: string;
}) {
  return (
    <section
      className="relative z-10 border-t border-white/10 bg-black/80 backdrop-blur-sm"
      style={{ ["--disc" as string]: accent }}
    >
      <div className="mx-auto flex max-w-[1400px] flex-col gap-5 px-4 py-5 sm:px-6 md:flex-row md:items-center md:gap-6 lg:px-8">
        <div className="grid flex-1 grid-cols-2 gap-x-4 gap-y-4 md:grid-cols-4 md:gap-5">
          {items.map((item, i) => {
            const color = item.iconColor ?? ICON_COLORS[i % ICON_COLORS.length];
            return (
              <div key={item.label} className="flex items-center gap-3">
                <span
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px]"
                  style={{
                    background: `color-mix(in srgb, ${color} 20%, transparent)`,
                    color,
                    boxShadow: `0 0 0 1px color-mix(in srgb, ${color} 45%, transparent)`,
                  }}
                  aria-hidden
                >
                  <StatIcon index={i} />
                </span>
                <div className="min-w-0">
                  <p className="font-display text-lg leading-none tracking-wide text-white sm:text-xl">
                    {item.value}
                  </p>
                  <p className="mt-1 text-[10px] uppercase tracking-[0.14em] text-white/45 sm:text-[11px]">
                    {item.label}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex shrink-0 items-center gap-2 md:pl-2">
          <BeInGameArrow
            className="hidden h-10 w-[5.5rem] sm:block"
            color={accent === "#FFD31C" ? "#7946E2" : accent}
          />
          <p
            className="font-hand text-[1.65rem] leading-none tracking-wide sm:text-[1.85rem]"
            style={{ color: accent === "#FFD31C" ? "#7946E2" : accent }}
          >
            {cta}
          </p>
        </div>
      </div>
    </section>
  );
}

function StatIcon({ index }: { index: number }) {
  const common = {
    width: 18,
    height: 18,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.9,
  } as const;
  switch (index % 4) {
    case 0:
      return (
        <svg {...common}>
          <circle cx="9" cy="8" r="2.5" />
          <circle cx="15" cy="8" r="2.5" />
          <path
            d="M4.5 18c.8-3 2.8-4.5 4.5-4.5S12.2 15 13 18"
            strokeLinecap="round"
          />
          <path
            d="M11 18c.8-3 2.8-4.5 4.5-4.5S18.7 15 19.5 18"
            strokeLinecap="round"
          />
        </svg>
      );
    case 1:
      return (
        <svg {...common}>
          <rect x="4" y="5" width="16" height="15" rx="2" />
          <path d="M8 3v4M16 3v4M4 10h16" strokeLinecap="round" />
        </svg>
      );
    case 2:
      return (
        <svg {...common}>
          <path
            d="M8 20l4-8 4 8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path d="M7.5 12h9" strokeLinecap="round" />
          <circle cx="12" cy="6" r="2.2" />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="3" />
          <circle cx="12" cy="12" r="7.5" />
          <path
            d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2"
            strokeLinecap="round"
          />
        </svg>
      );
  }
}
