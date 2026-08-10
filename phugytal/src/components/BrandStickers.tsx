type StickerKind =
  | "smiley"
  | "crown"
  | "skull"
  | "ball"
  | "puck"
  | "hoop"
  | "crosshair"
  | "note"
  | "lightning"
  | "diamond"
  | "star"
  | "flame";

type StickerProps = {
  kind: StickerKind;
  color: string;
  className?: string;
  size?: number;
  rotate?: number;
};

/** Gel-border stickers in brandbook style: black core + thick neon rim. */
export function BrandSticker({
  kind,
  color,
  className = "",
  size = 72,
  rotate = 0,
}: StickerProps) {
  const id = `${kind}-${color.replace("#", "")}`;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 80 80"
      className={`pointer-events-none select-none drop-shadow-[0_6px_12px_rgba(0,0,0,0.45)] ${className}`}
      style={{ transform: `rotate(${rotate}deg)` }}
      aria-hidden
    >
      <defs>
        <filter id={`gel-${id}`} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="1.2" result="b" />
          <feOffset dy="1" result="o" />
          <feMerge>
            <feMergeNode in="o" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <g filter={`url(#gel-${id})`}>
        {/* outer gel rim */}
        <circle cx="40" cy="40" r="34" fill={color} opacity="0.95" />
        <circle cx="40" cy="40" r="34" fill="none" stroke={color} strokeWidth="2" opacity="0.55" />
        {/* black sticker face */}
        <circle cx="40" cy="40" r="26" fill="#050505" />
        {/* soft highlight on rim */}
        <path
          d="M18 28c6-10 22-14 34-8"
          fill="none"
          stroke="white"
          strokeWidth="3"
          strokeLinecap="round"
          opacity="0.28"
        />
        <g fill="none" stroke={color} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
          {iconPath(kind)}
        </g>
      </g>
    </svg>
  );
}

function iconPath(kind: StickerKind) {
  switch (kind) {
    case "smiley":
      return (
        <>
          <rect x="28" y="32" width="9" height="5.5" rx="1.2" />
          <rect x="43" y="32" width="9" height="5.5" rx="1.2" />
          <path d="M30 47c3.5 4.5 8 6.5 10 6.5s6.5-2 10-6.5" />
        </>
      );
    case "crown":
      return <path d="M22 48h36L52 30l-8 10-4-14-4 14-8-10z" />;
    case "skull":
      return (
        <>
          <path d="M40 22c-10 0-16 7-16 16 0 6 3 10 6 12v8h6v-4h8v4h6v-8c3-2 6-6 6-12 0-9-6-16-16-16z" />
          <circle cx="33" cy="38" r="3.5" />
          <circle cx="47" cy="38" r="3.5" />
          <path d="M34 52h12M36 56h8" />
        </>
      );
    case "ball":
      return (
        <>
          <circle cx="40" cy="40" r="14" />
          <path d="M40 26c4 4 4 10 0 14s-4 10 0 14M26 40h28M28 32c8 2 16 2 24 0M28 48c8-2 16-2 24 0" />
        </>
      );
    case "puck":
      return (
        <>
          <ellipse cx="40" cy="42" rx="16" ry="8" />
          <path d="M24 42c0-4 7-8 16-8s16 4 16 8" />
          <path d="M28 38c2-1 6-2 12-2" opacity="0.7" />
        </>
      );
    case "hoop":
      return (
        <>
          <ellipse cx="40" cy="34" rx="14" ry="5" />
          <path d="M26 34v6c0 4 6 8 14 8s14-4 14-8v-6" />
          <path d="M30 48v8M50 48v8M30 56h20" />
        </>
      );
    case "crosshair":
      return (
        <>
          <circle cx="40" cy="40" r="12" />
          <path d="M40 22v8M40 50v8M22 40h8M50 40h8" />
          <circle cx="40" cy="40" r="2" />
        </>
      );
    case "note":
      return (
        <>
          <path d="M34 28v22" />
          <ellipse cx="30" cy="50" rx="5" ry="4" />
          <path d="M34 28c8 2 14 4 16 2v18" />
          <ellipse cx="46" cy="46" rx="5" ry="4" />
        </>
      );
    case "lightning":
      return <path d="M44 20L30 42h10l-4 18 18-28H42l2-12z" />;
    case "diamond":
      return <path d="M40 22l14 14-14 22L26 36zM26 36h28" />;
    case "star":
      return <path d="M40 22l4 12h12l-10 8 4 12-10-7-10 7 4-12-10-8h12z" />;
    case "flame":
      return <path d="M40 22c2 10-8 12-8 22a8 8 0 0016 0c0-8-6-12-4-22-6 4-8 10-8 14 0 2 1 4 2 5-6-2-8-8-6-16 4 2 6 4 8-3z" />;
  }
}

/** Floating brandbook stickers on the home hero: crown, cool emoji under it, skull. */
export function HeroStickerCluster() {
  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden"
      aria-hidden
    >
      {/* 1 — crown */}
      <span
        className="sticker-float absolute right-[6%] top-2 sm:right-[10%] sm:top-4 md:right-[14%] md:top-6"
        style={{ animationDelay: "0s" }}
      >
        <img
          src="/stickers/crown.png"
          alt=""
          width={111}
          height={102}
          className="h-16 w-auto object-contain sm:h-20 md:h-24"
          style={{
            transform: "rotate(12deg)",
            filter: "drop-shadow(0 0 14px rgba(0,255,0,0.55))",
          }}
        />
      </span>

      {/* 2 — cool emoji under crown */}
      <span
        className="sticker-float absolute right-[10%] top-[5.5rem] sm:right-[14%] sm:top-28 md:right-[18%] md:top-32"
        style={{ animationDelay: "0.55s" }}
      >
        <img
          src="/stickers/cool.png"
          alt=""
          width={121}
          height={105}
          className="h-14 w-auto object-contain sm:h-[4.5rem] md:h-20"
          style={{
            transform: "rotate(8deg)",
            filter: "drop-shadow(0 0 14px rgba(0,255,0,0.55))",
          }}
        />
      </span>

      {/* 3 — skull */}
      <span
        className="sticker-float absolute bottom-2 left-[8%] sm:bottom-4 sm:left-[14%] md:left-[18%]"
        style={{ animationDelay: "1.1s" }}
      >
        <img
          src="/stickers/skull.png"
          alt=""
          width={129}
          height={125}
          className="h-16 w-auto object-contain sm:h-[4.75rem] md:h-24"
          style={{
            transform: "rotate(-10deg)",
            filter: "drop-shadow(0 0 14px rgba(0,255,0,0.55))",
          }}
        />
      </span>
    </div>
  );
}

const DISCIPLINE_STICKERS: Record<
  string,
  { kind: StickerKind; color: string; rotate: number }
> = {
  fifa: { kind: "ball", color: "#00FF00", rotate: -8 },
  nhl: { kind: "puck", color: "#00E6FF", rotate: 10 },
  nba: { kind: "hoop", color: "#FB5608", rotate: -6 },
  cs2: { kind: "crosshair", color: "#FFD31C", rotate: 12 },
  rhythm: { kind: "note", color: "#FF006E", rotate: -10 },
};

export function DisciplineSticker({
  slug,
  className = "",
}: {
  slug: string;
  className?: string;
}) {
  const conf = DISCIPLINE_STICKERS[slug] ?? {
    kind: "diamond" as const,
    color: "#7946E2",
    rotate: 0,
  };
  return (
    <BrandSticker
      kind={conf.kind}
      color={conf.color}
      rotate={conf.rotate}
      size={56}
      className={className}
    />
  );
}
