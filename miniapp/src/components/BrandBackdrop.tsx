import { useId } from "react";

/**
 * Фон по Brand Book: тонкие дуги + динамический градиент акцента #E98D2B.
 * Линии — только замкнутые эллипсы (нет «обрывов» внутри экрана) + мягкая маска по краям.
 */
export function BrandBackdrop() {
  const gradId = `cg-brand-lines-${useId().replace(/:/g, "")}`;
  return (
    <div className="brand-backdrop-root" aria-hidden>
      <div className="brand-backdrop-base" />
      <svg
        className="brand-backdrop-lines"
        viewBox="0 0 400 900"
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.28)" />
            <stop offset="45%" stopColor="rgba(255,255,255,0.14)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0.22)" />
          </linearGradient>
        </defs>
        <g fill="none" stroke={`url(#${gradId})`} strokeWidth="0.48" vectorEffect="non-scaling-stroke">
          <g transform="rotate(-24 200 450)">
            <ellipse cx="-130" cy="140" rx="600" ry="540" />
          </g>
          <g transform="rotate(17 200 450)">
            <ellipse cx="550" cy="240" rx="640" ry="480" />
          </g>
          <g transform="rotate(-8 200 450)">
            <ellipse cx="170" cy="-220" rx="470" ry="420" />
          </g>
          <g transform="rotate(26 200 450)">
            <ellipse cx="40" cy="980" rx="560" ry="500" />
          </g>
          <g transform="rotate(-36 200 450)">
            <ellipse cx="400" cy="680" rx="720" ry="520" />
          </g>
          <g transform="rotate(11 200 450)">
            <ellipse cx="-220" cy="460" rx="520" ry="450" />
          </g>
          <g transform="rotate(-14 200 450)">
            <ellipse cx="320" cy="-160" rx="480" ry="440" />
          </g>
        </g>
      </svg>
      <div className="brand-backdrop-gradient brand-backdrop-gradient-a" />
      <div className="brand-backdrop-gradient brand-backdrop-gradient-b" />
      <div className="brand-backdrop-vignette" />
    </div>
  );
}
