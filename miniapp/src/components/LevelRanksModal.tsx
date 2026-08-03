import { useEffect } from "react";
import { createPortal } from "react-dom";
import { LEVEL_VISUAL } from "../lib/levelStyle";
import { predictionWinBonusForLevel } from "../lib/predictionLevelBonus";

export function LevelRanksModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[2000] flex items-center justify-center overflow-hidden overscroll-none bg-black/90 p-4 pb-safe backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby="level-ranks-title"
      onClick={onClose}
    >
      <div
        className="flex max-h-[min(88dvh,600px)] w-full max-w-md min-h-0 flex-col overflow-hidden rounded border border-[--panel-border] bg-[#111111] p-4 shadow-[0_16px_48px_rgba(0,0,0,0.85)]"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="level-ranks-title" className="head-text mb-3 shrink-0 text-center text-lg text-[--text-main]">
          Уровни и ранги
        </h2>
        <p className="mb-3 shrink-0 text-center text-[11px] leading-relaxed text-[--text-muted]">
          К <b>базовой</b> награде за матч при <b>верном</b> прогнозе добавляется бонус уровня,{" "}
          <b>1 уровень + 5</b> к базе (уровни 1–10). Пример: 10-й уровень даёт <b>+50</b> к базе; если база 50 гемов,
          получится <b>100</b>. Уровень берётся <b>в момент подведения итога</b> матча. Рамка вокруг аватара в профиле
          — только оформление ранга, на расчёт гемов не влияет.
        </p>
        <ul className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-y-contain pr-1 [-webkit-overflow-scrolling:touch]">
          {LEVEL_VISUAL.map((v, i) => (
            <li
              key={i}
              className="flex items-center justify-between gap-3 rounded border border-[--panel-border] bg-[#1a1a1a] px-3 py-2"
            >
              <span className="font-head text-sm tabular-nums text-[--accent]">{i + 1}</span>
              <div className="min-w-0 flex-1">
                <span
                  className="font-head text-sm font-bold uppercase tracking-wide text-[--text-main]"
                  style={{ textShadow: `0 0 10px ${v.glow}` }}
                >
                  {v.label}
                </span>
                <p className="mt-0.5 text-[10px] text-[--text-muted]">
                  +{predictionWinBonusForLevel(i + 1)} к награде матча · рамка в профиле
                </p>
              </div>
              <span
                className="h-2 w-12 shrink-0 rounded-sm border border-white/10"
                style={{
                  background: `linear-gradient(90deg, ${v.from}, ${v.to})`,
                  boxShadow: `0 0 8px ${v.glow}`,
                }}
              />
            </li>
          ))}
        </ul>
        <button
          type="button"
          className="mt-3 w-full shrink-0 rounded bg-[--accent] py-2.5 font-head text-sm font-bold uppercase text-black"
          onClick={onClose}
        >
          Закрыть
        </button>
      </div>
    </div>,
    document.body
  );
}
