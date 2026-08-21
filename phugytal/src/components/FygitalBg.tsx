/** Full-bleed brand background image (fixed, cover). */
export function FygitalBg() {
  return (
    <div className="fygital-bg" aria-hidden>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/brand/site-bg.png"
        alt=""
        className="fygital-bg__img"
        decoding="async"
        fetchPriority="high"
      />
    </div>
  );
}
