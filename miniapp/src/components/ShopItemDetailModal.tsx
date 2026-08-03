import { useEffect, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import type { ShopListItem } from "../api";
import { GemIcon } from "./GemIcon";
import { formatGems } from "../lib/format";
import { rarityVisual } from "../lib/shopRarity";

type Props = {
  item: ShopListItem;
  onClose: () => void;
  onBuy: (id: string) => void;
  buying: boolean;
  buyError: string | null;
};

export function ShopItemDetailModal({ item, onClose, onBuy, buying, buyError }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const r = rarityVisual(item.rarity);
  const badge = item.game === "DOTA2" ? "DOTA 2" : "CS2";
  const badgeColor = item.game === "DOTA2" ? "var(--game-dota)" : "var(--game-cs2)";
  const ph = item.title.slice(0, 4).toUpperCase() || r.placeholder;
  const cardStyle = {
    "--card-color": r.color,
    "--badge-color": badgeColor,
  } as CSSProperties;

  return createPortal(
    <div
      className="fixed inset-0 z-[1990] flex items-center justify-center bg-black/88 p-4 pb-safe backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby="shop-item-detail-title"
      onClick={onClose}
    >
      <div
        className="flex max-h-[min(92dvh,640px)] w-full max-w-md flex-col overflow-hidden rounded-lg border border-[--panel-border] bg-[#141414] shadow-[0_20px_60px_rgba(0,0,0,0.75)]"
        style={cardStyle}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-[--panel-border] px-3 py-2.5">
          <span
            className="font-head text-[10px] font-bold uppercase tracking-[0.12em]"
            style={{ color: badgeColor, textShadow: "0 0 8px rgba(0,0,0,0.9), 0 1px 2px rgba(0,0,0,0.85)" }}
          >
            {badge}
          </span>
          <button
            type="button"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-[--text-muted] transition-colors hover:bg-white/5 hover:text-white"
            aria-label="Закрыть"
            onClick={onClose}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 256 256" fill="currentColor">
              <path d="M208.49,191.51a12,12,0,0,1-17,17L128,145,64.49,208.49a12,12,0,0,1-17-17L111,128,47.51,64.49a12,12,0,0,1,17-17L128,111l63.51-63.52a12,12,0,0,1,17,17L145,128Z" />
            </svg>
          </button>
        </div>

        <div className="relative min-h-[min(48dvh,360px)] w-full shrink-0 bg-black/45">
          <div className="image-glow pointer-events-none absolute inset-0 opacity-25" />
          {item.imageUrl ? (
            <img
              src={item.imageUrl}
              alt=""
              className="relative z-[1] mx-auto block h-full max-h-[min(48dvh,360px)] w-full object-contain p-4"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="flex h-[min(48dvh,360px)] items-center justify-center">
              <div className="item-placeholder text-4xl">{ph}</div>
            </div>
          )}
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto border-t border-[--panel-border] p-4">
          <h2 id="shop-item-detail-title" className="font-head text-lg font-bold leading-tight tracking-wide text-white">
            {item.title}
          </h2>
          <span className="text-xs font-medium uppercase tracking-wider" style={{ color: r.color }}>
            {r.label}
          </span>
          <div
            className="mt-1 h-0.5 w-12 rounded-full opacity-70"
            style={{ backgroundColor: r.color }}
            aria-hidden
          />

          {buyError ? (
            <p className="rounded-md border border-red-400/25 bg-red-400/10 px-3 py-2 text-center text-xs text-red-300">
              {buyError}
            </p>
          ) : null}

          <div className="mt-2 flex flex-wrap items-center gap-3 border-t border-white/5 pt-3">
            <div className="flex items-center gap-2">
              <span className="font-head text-xl font-bold tabular-nums text-[--accent]">{formatGems(item.priceGems)}</span>
              <GemIcon size={20} className="text-[--accent]" />
            </div>
            <button
              type="button"
              className="btn-buy ml-auto min-w-[7rem] py-2.5 text-[11px]"
              disabled={item.stock <= 0 || buying}
              onClick={() => onBuy(item.id)}
            >
              {buying ? "Оформление…" : "Купить"}
            </button>
          </div>
          <p className="text-[11px] text-[--text-muted]">В наличии: {item.stock}</p>
        </div>

        <div
          className="h-1 w-full shrink-0 opacity-70"
          style={{ background: `linear-gradient(90deg, transparent, ${r.color}, transparent)` }}
          aria-hidden
        />
      </div>
    </div>,
    document.body
  );
}
