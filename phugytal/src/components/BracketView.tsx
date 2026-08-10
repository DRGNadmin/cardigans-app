"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";

type Participant = { id: string; name: string; seed: number };
type Round = { id: string; name: string; kind: string; order: number };
type Match = {
  id: string;
  roundId: string;
  orderInRound: number;
  participant1Id: string | null;
  participant2Id: string | null;
  score1: number | null;
  score2: number | null;
  winnerId: string | null;
  scheduledAt: string | null;
};

const MIN_ZOOM = 0.4;
const MAX_ZOOM = 1.75;
const ZOOM_STEP = 0.1;

const MATCH_W = 220;
const MATCH_H = 72;
const ROUND_GAP = 72; // space for connector lines
const ROUND0_GAP = 28; // vertical gap between R1 matches
const HEADER_H = 44;
const PAD = 16;

export function BracketView({
  rounds,
  matches,
  participants,
  accent,
}: {
  rounds: Round[];
  matches: Match[];
  participants: Participant[];
  accent: string;
}) {
  const byId = useMemo(
    () => new Map(participants.map((p) => [p.id, p])),
    [participants],
  );
  const sortedRounds = useMemo(
    () => [...rounds].sort((a, b) => a.order - b.order),
    [rounds],
  );

  const layout = useMemo(() => {
    if (!sortedRounds.length) return null;

    const roundsWithMatches = sortedRounds.map((round) => ({
      round,
      matches: matches
        .filter((m) => m.roundId === round.id)
        .sort((a, b) => a.orderInRound - b.orderInRound),
    }));

    // Prefer classic elim spacing based on first round size
    const r0Count = Math.max(1, roundsWithMatches[0]?.matches.length ?? 1);
    const unit = MATCH_H + ROUND0_GAP;

    type Placed = {
      match: Match;
      roundIndex: number;
      x: number;
      y: number;
    };

    const placed: Placed[] = [];
    roundsWithMatches.forEach((col, roundIndex) => {
      const span = 2 ** roundIndex;
      col.matches.forEach((match, i) => {
        const y =
          HEADER_H +
          PAD +
          i * span * unit +
          ((span - 1) * unit) / 2;
        const x = PAD + roundIndex * (MATCH_W + ROUND_GAP);
        placed.push({ match, roundIndex, x, y });
      });
    });

    const contentW =
      PAD * 2 +
      sortedRounds.length * MATCH_W +
      Math.max(0, sortedRounds.length - 1) * ROUND_GAP;
    const contentH =
      HEADER_H + PAD * 2 + r0Count * unit - ROUND0_GAP + MATCH_H;

    // Connector paths between consecutive rounds
    const connectors: { d: string; key: string }[] = [];
    for (let r = 0; r < roundsWithMatches.length - 1; r++) {
      const curr = placed.filter((p) => p.roundIndex === r);
      const next = placed.filter((p) => p.roundIndex === r + 1);
      for (let i = 0; i < curr.length; i += 2) {
        const a = curr[i];
        const b = curr[i + 1];
        const target = next[Math.floor(i / 2)];
        if (!a || !target) continue;

        const x1 = a.x + MATCH_W;
        const y1 = a.y + MATCH_H / 2;
        const midX = x1 + ROUND_GAP / 2;
        const x2 = target.x;
        const y2 = target.y + MATCH_H / 2;

        if (b) {
          const yB = b.y + MATCH_H / 2;
          const d = [
            `M ${x1} ${y1}`,
            `H ${midX}`,
            `V ${yB}`,
            `M ${x1} ${yB}`,
            `H ${midX}`,
            `M ${midX} ${Math.min(y1, yB)}`,
            `V ${Math.max(y1, yB)}`,
            `M ${midX} ${(y1 + yB) / 2}`,
            `H ${x2}`,
          ].join(" ");
          connectors.push({ d, key: `${a.match.id}-${target.match.id}` });
        } else {
          const d = `M ${x1} ${y1} H ${midX} V ${y2} H ${x2}`;
          connectors.push({ d, key: `${a.match.id}-${target.match.id}` });
        }
      }
    }

    return { roundsWithMatches, placed, connectors, contentW, contentH };
  }, [matches, sortedRounds]);

  const viewportRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(0.8);
  const [offset, setOffset] = useState({ x: 16, y: 16 });
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);
  const pinchRef = useRef<{ dist: number; zoom: number } | null>(null);
  const [contentSize, setContentSize] = useState({ w: 0, h: 0 });
  const [viewportSize, setViewportSize] = useState({ w: 0, h: 0 });

  const measure = useCallback(() => {
    const vp = viewportRef.current;
    const content = contentRef.current;
    if (!vp || !content) return;
    setViewportSize({ w: vp.clientWidth, h: vp.clientHeight });
    setContentSize({
      w: content.scrollWidth,
      h: content.scrollHeight,
    });
  }, []);

  useEffect(() => {
    measure();
    const ro = new ResizeObserver(() => measure());
    if (viewportRef.current) ro.observe(viewportRef.current);
    if (contentRef.current) ro.observe(contentRef.current);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [measure, layout?.contentW, layout?.contentH, zoom]);

  const clampOffset = useCallback(
    (x: number, y: number, nextZoom = zoom) => {
      const scaledW = contentSize.w * nextZoom;
      const scaledH = contentSize.h * nextZoom;
      const minX = Math.min(16, viewportSize.w - scaledW - 16);
      const minY = Math.min(16, viewportSize.h - scaledH - 16);
      return {
        x: Math.min(16, Math.max(minX, x)),
        y: Math.min(16, Math.max(minY, y)),
      };
    },
    [contentSize.h, contentSize.w, viewportSize.h, viewportSize.w, zoom],
  );

  const applyZoom = useCallback(
    (next: number, originX?: number, originY?: number) => {
      const z = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, next));
      setZoom((prev) => {
        if (originX != null && originY != null && viewportRef.current) {
          const rect = viewportRef.current.getBoundingClientRect();
          const cx = originX - rect.left;
          const cy = originY - rect.top;
          setOffset((off) => {
            const worldX = (cx - off.x) / prev;
            const worldY = (cy - off.y) / prev;
            return clampOffset(cx - worldX * z, cy - worldY * z, z);
          });
        } else {
          setOffset((off) => clampOffset(off.x, off.y, z));
        }
        return z;
      });
    },
    [clampOffset],
  );

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    function onWheel(ev: WheelEvent) {
      ev.preventDefault();
      const delta = ev.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
      setZoom((prev) => {
        const z = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, prev + delta));
        if (viewportRef.current) {
          const rect = viewportRef.current.getBoundingClientRect();
          const cx = ev.clientX - rect.left;
          const cy = ev.clientY - rect.top;
          setOffset((off) => {
            const worldX = (cx - off.x) / prev;
            const worldY = (cy - off.y) / prev;
            return clampOffset(cx - worldX * z, cy - worldY * z, z);
          });
        }
        return z;
      });
    }
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [clampOffset]);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    function distance(a: Touch, b: Touch) {
      return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
    }
    function onTouchStart(ev: TouchEvent) {
      if (ev.touches.length === 2) {
        pinchRef.current = {
          dist: distance(ev.touches[0], ev.touches[1]),
          zoom,
        };
      }
    }
    function onTouchMove(ev: TouchEvent) {
      if (ev.touches.length === 2 && pinchRef.current) {
        ev.preventDefault();
        const d = distance(ev.touches[0], ev.touches[1]);
        const ratio = d / pinchRef.current.dist;
        const midX = (ev.touches[0].clientX + ev.touches[1].clientX) / 2;
        const midY = (ev.touches[0].clientY + ev.touches[1].clientY) / 2;
        applyZoom(pinchRef.current.zoom * ratio, midX, midY);
      }
    }
    function onTouchEnd(ev: TouchEvent) {
      if (ev.touches.length < 2) pinchRef.current = null;
    }
    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd);
    el.addEventListener("touchcancel", onTouchEnd);
    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
      el.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [applyZoom, zoom]);

  function onPointerDown(e: ReactPointerEvent) {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      originX: offset.x,
      originY: offset.y,
    };
    setDragging(true);
  }
  function onPointerMove(e: ReactPointerEvent) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    setOffset(
      clampOffset(
        drag.originX + (e.clientX - drag.startX),
        drag.originY + (e.clientY - drag.startY),
      ),
    );
  }
  function onPointerUp(e: ReactPointerEvent) {
    if (dragRef.current?.pointerId === e.pointerId) {
      dragRef.current = null;
      setDragging(false);
    }
  }

  const scaledW = Math.max(contentSize.w * zoom, 1);
  const overflowX = Math.max(scaledW - viewportSize.w + 32, 0);
  const scrollRatio =
    overflowX <= 0 ? 1 : Math.min(1, Math.max(0, (16 - offset.x) / overflowX));
  const thumbWidth =
    overflowX <= 0 ? 100 : Math.max(18, (viewportSize.w / scaledW) * 100);

  if (!layout) {
    return (
      <div className="rounded-3xl border border-dashed border-white/15 px-6 py-16 text-center text-white/55">
        Сетка ещё не создана
      </div>
    );
  }

  return (
    <div
      className="bracket-shell rounded-3xl border border-white/10 bg-black/40"
      style={{ ["--disc" as string]: accent }}
    >
      <div className="flex flex-wrap items-center justify-end gap-2 border-b border-white/10 px-3 py-2.5 sm:px-4">
        <ZoomBtn
          label="−"
          accent={accent}
          onClick={() => applyZoom(zoom - ZOOM_STEP)}
          disabled={zoom <= MIN_ZOOM}
        />
        <span className="min-w-12 text-center text-xs tabular-nums text-white/70">
          {Math.round(zoom * 100)}%
        </span>
        <ZoomBtn
          label="+"
          accent={accent}
          onClick={() => applyZoom(zoom + ZOOM_STEP)}
          disabled={zoom >= MAX_ZOOM}
        />
        <ZoomBtn
          label="⌂"
          accent={accent}
          onClick={() => {
            setZoom(0.8);
            setOffset({ x: 16, y: 16 });
          }}
        />
      </div>

      <div
        ref={viewportRef}
        className={`bracket-viewport relative h-[min(70vh,680px)] touch-none overflow-hidden ${
          dragging ? "cursor-grabbing" : "cursor-grab"
        }`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <div
          ref={contentRef}
          className="absolute left-0 top-0 origin-top-left will-change-transform"
          style={{
            width: layout.contentW,
            height: layout.contentH,
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
          }}
        >
          {/* Round headers */}
          {layout.roundsWithMatches.map((col, i) => (
            <div
              key={col.round.id}
              className="absolute top-0 flex items-center font-display text-sm tracking-wide text-white/75"
              style={{
                left: PAD + i * (MATCH_W + ROUND_GAP),
                width: MATCH_W,
                height: HEADER_H,
              }}
            >
              <span
                className="truncate border-b pb-1"
                style={{ borderColor: `${accent}66` }}
              >
                {col.round.name}
              </span>
            </div>
          ))}

          {/* Connectors */}
          <svg
            className="pointer-events-none absolute left-0 top-0"
            width={layout.contentW}
            height={layout.contentH}
            aria-hidden
          >
            {layout.connectors.map((c) => (
              <path
                key={c.key}
                d={c.d}
                fill="none"
                stroke={accent}
                strokeWidth="2"
                strokeOpacity="0.75"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            ))}
          </svg>

          {/* Matches */}
          {layout.placed.map(({ match, x, y }) => {
            const p1 = match.participant1Id
              ? byId.get(match.participant1Id)
              : null;
            const p2 = match.participant2Id
              ? byId.get(match.participant2Id)
              : null;
            return (
              <article
                key={match.id}
                className="match-node absolute overflow-hidden rounded-xl"
                style={{
                  left: x,
                  top: y,
                  width: MATCH_W,
                  height: MATCH_H,
                  ["--disc" as string]: accent,
                  boxShadow: `0 0 0 1px ${accent}55`,
                }}
              >
                <Slot
                  seed={p1?.seed}
                  name={p1?.name ?? "TBD"}
                  score={match.score1}
                  winner={
                    match.winnerId != null &&
                    match.winnerId === match.participant1Id
                  }
                  accent={accent}
                />
                <div className="h-px" style={{ background: `${accent}33` }} />
                <Slot
                  seed={p2?.seed}
                  name={p2?.name ?? "TBD"}
                  score={match.score2}
                  winner={
                    match.winnerId != null &&
                    match.winnerId === match.participant2Id
                  }
                  accent={accent}
                />
              </article>
            );
          })}
        </div>
      </div>

      <BracketNav
        accent={accent}
        thumbWidth={thumbWidth}
        scrollRatio={scrollRatio}
        disabled={overflowX <= 0}
        onScrub={(ratio) => {
          if (overflowX <= 0) return;
          setOffset((off) => clampOffset(16 - ratio * overflowX, off.y));
        }}
        onStep={(dir) => {
          setOffset((off) =>
            clampOffset(off.x - dir * viewportSize.w * 0.35, off.y),
          );
        }}
      />
    </div>
  );
}

function Slot({
  seed,
  name,
  score,
  winner,
  accent,
}: {
  seed?: number;
  name: string;
  score: number | null;
  winner: boolean;
  accent: string;
}) {
  return (
    <div
      className="flex h-[35px] items-center gap-2 px-2.5 text-sm"
      style={{ color: winner ? accent : undefined }}
    >
      <span
        className="w-5 shrink-0 text-center text-[11px] tabular-nums"
        style={{ color: winner ? accent : "rgba(255,255,255,0.35)" }}
      >
        {seed ?? "·"}
      </span>
      <span
        className={`min-w-0 flex-1 truncate ${
          winner ? "font-semibold" : "text-white/85"
        }`}
      >
        {name}
      </span>
      <span className="w-6 shrink-0 text-right tabular-nums text-white/70">
        {score ?? ""}
      </span>
    </div>
  );
}

function ZoomBtn({
  label,
  accent,
  onClick,
  disabled,
}: {
  label: string;
  accent: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="focus-ring flex h-8 w-8 items-center justify-center rounded-full border text-sm font-semibold disabled:opacity-35"
      style={{ borderColor: `${accent}88`, color: accent }}
    >
      {label}
    </button>
  );
}

function BracketNav({
  accent,
  thumbWidth,
  scrollRatio,
  disabled,
  onScrub,
  onStep,
}: {
  accent: string;
  thumbWidth: number;
  scrollRatio: number;
  disabled: boolean;
  onScrub: (ratio: number) => void;
  onStep: (dir: -1 | 1) => void;
}) {
  const trackRef = useRef<HTMLDivElement>(null);

  function ratioFromClientX(clientX: number) {
    const track = trackRef.current;
    if (!track) return 0;
    const rect = track.getBoundingClientRect();
    const usable = rect.width * (1 - thumbWidth / 100);
    if (usable <= 0) return 0;
    const x = clientX - rect.left - (rect.width * thumbWidth) / 200;
    return Math.min(1, Math.max(0, x / usable));
  }

  return (
    <div className="bracket-nav flex items-center gap-2 border-t border-white/10 px-3 py-3 sm:gap-3 sm:px-4">
      <button
        type="button"
        aria-label="Влево"
        disabled={disabled}
        onClick={() => onStep(-1)}
        className="focus-ring flex h-9 w-9 shrink-0 items-center justify-center rounded-full border disabled:opacity-35"
        style={{ borderColor: `${accent}66`, color: accent }}
      >
        ‹
      </button>
      <div
        ref={trackRef}
        className="relative h-3 flex-1 cursor-pointer rounded-full"
        style={{
          background: `linear-gradient(90deg, ${accent}33, rgba(255,255,255,0.08) 45%, ${accent}22)`,
          boxShadow: `inset 0 0 0 1px ${accent}44`,
        }}
        onPointerDown={(e) => {
          if (disabled) return;
          (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
          onScrub(ratioFromClientX(e.clientX));
        }}
        onPointerMove={(e) => {
          if (disabled || !e.currentTarget.hasPointerCapture(e.pointerId))
            return;
          onScrub(ratioFromClientX(e.clientX));
        }}
      >
        <div
          className="absolute top-1/2 h-5 -translate-y-1/2 rounded-full"
          style={{
            width: `${thumbWidth}%`,
            left: `calc(${scrollRatio} * (100% - ${thumbWidth}%))`,
            background: `linear-gradient(90deg, ${accent}, #7946E2)`,
            boxShadow: `0 0 16px ${accent}66`,
          }}
        />
      </div>
      <button
        type="button"
        aria-label="Вправо"
        disabled={disabled}
        onClick={() => onStep(1)}
        className="focus-ring flex h-9 w-9 shrink-0 items-center justify-center rounded-full border disabled:opacity-35"
        style={{ borderColor: `${accent}66`, color: accent }}
      >
        ›
      </button>
    </div>
  );
}
