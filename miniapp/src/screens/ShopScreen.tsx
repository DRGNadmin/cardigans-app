import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getMe, getShop, purchase } from "../api";
import { BrandBackdrop } from "../components/BrandBackdrop";
import { SadEmptyState } from "../components/SadEmptyState";
import { ShopItemDetailModal } from "../components/ShopItemDetailModal";
import { GemIcon } from "../components/GemIcon";
import { formatGems } from "../lib/format";
import { rarityVisual, shopCardShimmer } from "../lib/shopRarity";

type Tab = "all" | "CS2" | "DOTA2";

function purchaseErrorMessage(err: unknown): string {
  const msg = err instanceof Error ? err.message : "";
  if (/insufficient gems/i.test(msg)) return "Недостаточно гемов";
  if (/item unavailable/i.test(msg)) return "Товар недоступен";
  if (/sold out/i.test(msg)) return "Товар распродан";
  return msg.trim() || "Не удалось оформить покупку";
}

/** Цена в одну строку: уменьшает шрифт, если не помещается рядом с кнопкой «Купить». */
function FitGemsPrice({ gems }: { gems: number }) {
  const text = formatGems(gems);
  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const outer = outerRef.current;
    const inner = innerRef.current;
    if (!outer || !inner) return;

    const fit = () => {
      const maxPx = 13;
      const minPx = 8;
      let px = maxPx;
      inner.style.fontSize = `${px}px`;
      const available = outer.clientWidth;
      if (available <= 0) return;
      while (px > minPx && inner.scrollWidth > available) {
        px -= 0.5;
        inner.style.fontSize = `${px}px`;
      }
    };

    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(outer);
    return () => ro.disconnect();
  }, [text]);

  return (
    <div ref={outerRef} className="min-w-0 flex-1 overflow-hidden">
      <span
        ref={innerRef}
        className="inline-block whitespace-nowrap font-bold tabular-nums leading-none text-[--accent]"
        style={{ fontSize: 13 }}
      >
        {text}
      </span>
    </div>
  );
}

function ShopEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center px-6 text-center">
      <div
        className="mb-5 flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-full border border-[--panel-border] bg-white/[0.04] shadow-[0_0_28px_rgba(233,141,43,0.12)]"
        aria-hidden
      >
        <svg
          viewBox="0 0 64 64"
          className="h-[3.25rem] w-[3.25rem] text-[--accent]"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle cx="32" cy="32" r="27" stroke="currentColor" strokeWidth="1.75" opacity="0.45" />
          <circle cx="24" cy="27" r="3.25" fill="currentColor" opacity="0.85" />
          <circle cx="40" cy="27" r="3.25" fill="currentColor" opacity="0.85" />
          <path
            d="M23 43c3.2-4.2 6.8-6.5 9-6.5s5.8 2.3 9 6.5"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            opacity="0.75"
          />
        </svg>
      </div>
      <p className="max-w-[300px] text-center text-sm font-medium leading-relaxed tracking-wide text-[--text-muted]">
        В настоящий момент магазин пуст
      </p>
    </div>
  );
}

export function ShopScreen() {
  const [tab, setTab] = useState<Tab>("all");
  const [detailId, setDetailId] = useState<string | null>(null);
  const qc = useQueryClient();
  const { data: me } = useQuery({ queryKey: ["me"], queryFn: getMe });
  const { data: items, isSuccess: shopLoaded, isPending: shopPending } = useQuery({
    queryKey: ["shop"],
    queryFn: getShop,
  });

  useEffect(() => {
    void qc.invalidateQueries({ queryKey: ["tasks"] });
  }, [qc, items]);
  const buy = useMutation({
    mutationFn: (id: string) => purchase(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["shop"] });
      void qc.invalidateQueries({ queryKey: ["me"] });
      void qc.invalidateQueries({ queryKey: ["orders"] });
      void qc.invalidateQueries({ queryKey: ["tasks"] });
    },
  });

  const filtered =
    items?.filter((i) => (tab === "all" ? true : i.game === tab)) ?? [];

  const detailItem =
    detailId && items ? items.find((i) => i.id === detailId) ?? null : null;

  useEffect(() => {
    if (detailId && shopLoaded && items && !items.some((i) => i.id === detailId)) {
      setDetailId(null);
    }
  }, [detailId, shopLoaded, items]);

  const buyErrorInDetail =
    detailItem && buy.isError && buy.variables === detailItem.id
      ? purchaseErrorMessage(buy.error)
      : null;

  return (
    <div className="relative flex min-h-0 w-full flex-1 flex-col">
      <BrandBackdrop />
      <div className="relative z-[1] flex min-h-0 flex-1 flex-col">
      <header className="sticky top-0 z-40 flex shrink-0 flex-col gap-4 border-b border-[--panel-border] bg-black/60 px-4 pb-4 pt-10 backdrop-blur-md">
        <div className="flex items-center justify-between">
          <h1 className="head-text flex items-center gap-2 text-2xl tracking-wider text-white">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 256 256"
              className="text-[--accent]"
            >
              <path
                fill="currentColor"
                d="M216,40H40A16,16,0,0,0,24,56V200a16,16,0,0,0,16,16H216a16,16,0,0,0,16-16V56A16,16,0,0,0,216,40Zm0,160H40V56H216V200ZM176,88a48,48,0,0,1-96,0,8,8,0,0,1,16,0,32,32,0,0,0,64,0,8,8,0,0,1,16,0Z"
              />
            </svg>
            Магазин
          </h1>
          <div className="flex items-center gap-1.5 rounded-full border border-[--accent]/30 bg-black/40 px-3 py-1.5 shadow-[0_0_15px_rgba(233,141,43,0.1)]">
            <span className="text-sm font-bold tracking-wide text-[--accent]">
              {me != null ? formatGems(me.gemsBalance) : "—"}
            </span>
            <GemIcon size={14} className="text-[--accent]" />
          </div>
        </div>
        <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
          {(
            [
              ["all", "Все"],
              ["CS2", "CS2"],
              ["DOTA2", "Dota 2"],
            ] as const
          ).map(([k, label]) => (
            <button
              key={k}
              type="button"
              className={`tab-btn tab-btn--press shrink-0 ${tab === k ? "active" : ""}`}
              onClick={() => setTab(k)}
            >
              {label}
            </button>
          ))}
        </div>
      </header>

      <main className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 pb-28 pt-4">
        {buy.isError ? (
          <p className="mb-3 rounded-md border border-red-400/25 bg-red-400/10 px-3 py-2 text-center text-xs text-red-300">
            {purchaseErrorMessage(buy.error)}
          </p>
        ) : null}
        {shopPending ? (
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 6 }).map((_, idx) => (
              <div key={idx} className="shop-skeleton-card" aria-hidden />
            ))}
          </div>
        ) : shopLoaded && filtered.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center py-12 min-h-[min(360px,50dvh)]">
            <SadEmptyState message="В настоящий момент магазин пуст" />
          </div>
        ) : (
        <div className="grid grid-cols-2 gap-3">
          {filtered.map((i) => {
            const r = rarityVisual(i.rarity);
            const shimmer = shopCardShimmer(i.rarity);
            const badge = i.game === "DOTA2" ? "DOTA 2" : "CS2";
            const badgeColor = i.game === "DOTA2" ? "var(--game-dota)" : "var(--game-cs2)";
            const ph = i.title.slice(0, 4).toUpperCase() || r.placeholder;
            return (
              <article
                key={i.id}
                role="button"
                tabIndex={0}
                data-game={i.game}
                data-rarity={i.rarity}
                className="item-card item-card--interactive cursor-pointer"
                style={
                  {
                    "--card-color": r.color,
                    "--badge-color": badgeColor,
                  } as CSSProperties
                }
                onClick={() => setDetailId(i.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setDetailId(i.id);
                  }
                }}
              >
                {shimmer === "high" ? (
                  <span className="item-card-glare item-card-glare--high" aria-hidden />
                ) : null}
                {shimmer === "elite" ? (
                  <span className="item-card-glare item-card-glare--elite" aria-hidden />
                ) : null}
                <div className="image-box">
                  <div className="image-glow" />
                  <div className="game-badge game-badge--pill">{badge}</div>
                  {i.imageUrl ? (
                    <img
                      src={i.imageUrl}
                      alt=""
                      className="absolute inset-0 z-[1] h-full w-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="item-placeholder">{ph}</div>
                  )}
                </div>
                <div className="flex flex-1 flex-col gap-1 p-3">
                  <h3 className="line-clamp-1 font-head text-[13px] leading-tight text-white" title={i.title}>
                    {i.title}
                  </h3>
                  <span
                    className="text-[10px] font-medium uppercase tracking-wider"
                    style={{ color: r.color }}
                  >
                    {r.label}
                  </span>
                  <div className="mt-auto flex items-center gap-2 border-t border-white/5 pt-2">
                    <div className="flex min-w-0 flex-1 items-center gap-1">
                      <FitGemsPrice gems={i.priceGems} />
                      <GemIcon size={10} className="shrink-0 text-[--accent]" />
                    </div>
                    <button
                      type="button"
                      className="btn-buy shrink-0"
                      disabled={i.stock <= 0 || buy.isPending}
                      onClick={(e) => {
                        e.stopPropagation();
                        buy.mutate(i.id);
                      }}
                    >
                      Купить
                    </button>
                  </div>
                  <span className="text-[9px] text-[--text-muted]">В наличии: {i.stock}</span>
                </div>
              </article>
            );
          })}
        </div>
        )}
      </main>
      </div>

      {detailItem ? (
        <ShopItemDetailModal
          item={detailItem}
          onClose={() => setDetailId(null)}
          onBuy={(id) =>
            buy.mutate(id, {
              onSuccess: () => setDetailId(null),
            })
          }
          buying={buy.isPending && buy.variables === detailItem.id}
          buyError={buyErrorInDetail}
        />
      ) : null}
    </div>
  );
}
