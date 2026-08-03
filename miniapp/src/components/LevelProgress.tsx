import { levelVisual } from "../lib/levelStyle";

export function LevelProgress({
  level,
  progressPct,
  xpToNextLevel,
}: {
  level: number;
  progressPct: number;
  xpToNextLevel: number;
}) {
  const L = Math.min(10, Math.max(1, level));
  const v = levelVisual(L);
  const pct = Math.min(100, Math.max(0, progressPct * 100));
  const maxLevel = L >= 10;

  return (
    <div className="flex min-w-[120px] max-w-[148px] shrink-0 flex-col items-end gap-1">
      <div className="flex items-baseline gap-1.5">
        <span className="font-head text-[9px] font-bold uppercase tracking-widest text-[--text-muted]">
          Ур.
        </span>
        <span
          className="font-head text-xl font-bold leading-none tabular-nums text-white drop-shadow-[0_0_10px_rgba(233,141,43,0.35)]"
          style={{ textShadow: `0 0 14px ${v.glow}` }}
        >
          {L}
        </span>
        <span className="text-[8px] font-medium uppercase tracking-wider text-[--text-muted]">/10</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-sm border border-white/10 bg-black/50">
        <div
          className="h-full rounded-sm transition-[width] duration-500 ease-out"
          style={{
            width: `${pct}%`,
            background: `linear-gradient(90deg, ${v.from}, ${v.to})`,
            boxShadow: `0 0 14px ${v.glow}`,
          }}
        />
      </div>
      <span className="text-right text-[8px] leading-tight text-[--text-muted]">
        {maxLevel
          ? "Макс. уровень"
          : xpToNextLevel > 0
            ? `до след.: ${xpToNextLevel} XP`
            : ""}
      </span>
      <span className="max-w-full truncate text-right text-[10px] font-bold uppercase tracking-wide text-[--text-main]">
        {v.label}
      </span>
    </div>
  );
}
