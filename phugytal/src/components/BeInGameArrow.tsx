/** Hand-drawn purple zigzag arrow from mockup (before «Будь в игре»). */
export function BeInGameArrow({
  className = "",
  color = "#7946E2",
}: {
  className?: string;
  color?: string;
}) {
  return (
    <svg
      className={className}
      width="110"
      height="48"
      viewBox="0 0 110 48"
      fill="none"
      aria-hidden
    >
      <path
        d="M6 34
           C14 38, 20 28, 26 24
           C34 18, 38 34, 48 30
           C56 26, 58 14, 68 18
           C76 21, 78 30, 88 26
           C94 24, 96 18, 100 16"
        stroke={color}
        strokeWidth="3.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M88 8 L102 15 L90 26"
        stroke={color}
        strokeWidth="3.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
