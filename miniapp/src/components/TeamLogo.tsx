/** Квадрат с аббревиатурой или картинкой; блик — класс `team-logo-shine` в CSS */
export function TeamLogo({
  name,
  logoUrl,
  size,
  tintClass,
}: {
  name: string;
  logoUrl?: string | null;
  size: "sm" | "lg";
  tintClass: string;
}) {
  const abbr = name.slice(0, 4).toUpperCase();
  const box = size === "lg" ? "team-logo-lg team-logo-shine" : "team-logo team-logo-shine";
  return (
    <div className={`${box} ${tintClass}`}>
      {logoUrl ? (
        <img src={logoUrl} alt="" className="relative z-0 h-full w-full object-contain p-1" loading="lazy" />
      ) : (
        <span className="relative z-0">{abbr}</span>
      )}
    </div>
  );
}
