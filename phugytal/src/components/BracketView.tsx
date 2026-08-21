"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { assignMatchNumbers } from "@/lib/matchNumbers";

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
  isLive?: boolean;
  streamUrl?: string | null;
  slotLabel1?: string | null;
  slotLabel2?: string | null;
  isBye?: boolean;
  nextMatchId?: string | null;
  nextSlot?: number | null;
  loserNextMatchId?: string | null;
  loserNextSlot?: number | null;
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
const TRACK_GAP = 56;
/** Space under round title for M# labels above match cells. */
const MATCH_NUM_GAP = 20;

type Placed = {
  match: Match;
  x: number;
  y: number;
};

type Header = {
  id: string;
  name: string;
  x: number;
  y: number;
};

type Connector = {
  d: string;
  key: string;
  dashed?: boolean;
};

function colX(col: number) {
  return PAD + col * (MATCH_W + ROUND_GAP);
}

function placeElimTrack(
  trackRounds: { round: Round; matches: Match[] }[],
  y0: number,
  colOffset: number,
): { placed: Placed[]; headers: Header[]; bandH: number } {
  const unit = MATCH_H + ROUND0_GAP;
  const r0Count = Math.max(1, trackRounds[0]?.matches.length ?? 1);
  const placed: Placed[] = [];
  const headers: Header[] = [];
  const top = HEADER_H + MATCH_NUM_GAP;

  trackRounds.forEach((col, ri) => {
    const span = 2 ** ri;
    const x = colX(colOffset + ri);
    headers.push({
      id: col.round.id,
      name: col.round.name,
      x,
      y: y0,
    });
    col.matches.forEach((match, i) => {
      const y =
        y0 + top + i * span * unit + ((span - 1) * unit) / 2;
      placed.push({ match, x, y });
    });
  });

  const bandH = top + PAD + r0Count * unit - ROUND0_GAP + MATCH_H;
  return { placed, headers, bandH };
}

function linkPath(from: Placed, to: Placed): string {
  const x1 = from.x + MATCH_W;
  const y1 = from.y + MATCH_H / 2;
  const x2 = to.x;
  const y2 = to.y + MATCH_H / 2;
  const midX = x1 + Math.max(24, (x2 - x1) / 2);
  return `M ${x1} ${y1} H ${midX} V ${y2} H ${x2}`;
}

function pairConnectors(sources: Placed[], targets: Placed[]): Connector[] {
  const out: Connector[] = [];
  for (let i = 0; i < sources.length; i += 2) {
    const a = sources[i];
    const b = sources[i + 1];
    const target = targets[Math.floor(i / 2)];
    if (!a || !target) continue;
    const x1 = a.x + MATCH_W;
    const y1 = a.y + MATCH_H / 2;
    const midX = x1 + ROUND_GAP / 2;
    const x2 = target.x;
    if (b) {
      const yB = b.y + MATCH_H / 2;
      const d = [
        `M ${x1} ${y1}`,
        `H ${midX}`,
        `M ${x1} ${yB}`,
        `H ${midX}`,
        `M ${midX} ${Math.min(y1, yB)}`,
        `V ${Math.max(y1, yB)}`,
        `M ${midX} ${(y1 + yB) / 2}`,
        `H ${x2}`,
      ].join(" ");
      out.push({ d, key: `${a.match.id}-${target.match.id}` });
    } else {
      const y2 = target.y + MATCH_H / 2;
      out.push({
        d: `M ${x1} ${y1} H ${midX} V ${y2} H ${x2}`,
        key: `${a.match.id}-${target.match.id}`,
      });
    }
  }
  return out;
}

function buildConnectorsFromLinks(placed: Placed[]): Connector[] {
  const byId = new Map(placed.map((p) => [p.match.id, p]));
  const out: Connector[] = [];
  const seen = new Set<string>();

  for (const p of placed) {
    if (p.match.nextMatchId) {
      const t = byId.get(p.match.nextMatchId);
      if (t) {
        const key = `w-${p.match.id}-${t.match.id}`;
        if (!seen.has(key)) {
          seen.add(key);
          out.push({ d: linkPath(p, t), key });
        }
      }
    }
    if (p.match.loserNextMatchId) {
      const t = byId.get(p.match.loserNextMatchId);
      if (t) {
        const key = `l-${p.match.id}-${t.match.id}`;
        if (!seen.has(key)) {
          seen.add(key);
          out.push({ d: linkPath(p, t), key, dashed: true });
        }
      }
    }
  }
  return out;
}

/** Keep A1/B2 (and standings "1") — replace other stored advancement text via derived labels. */
function isOpeningFeedLabel(s?: string | null): boolean {
  if (!s) return false;
  if (
    s.startsWith("Поб.") ||
    s.startsWith("Проигр.") ||
    s.startsWith("Проигравший")
  ) {
    return false;
  }
  return true;
}

export type BracketSlotRef = { matchId: string; slot: 1 | 2 };

export function BracketView({
  rounds,
  matches,
  participants,
  accent,
  tournamentStreamUrl,
  canEdit = false,
  onMatchClick,
  onSlotSwap,
  pickSlot = null,
  /** Full tournament matches for continuous M1… numbering (byes skipped). */
  numberingMatches,
  numberingRounds,
  highlightTeamId = null,
}: {
  rounds: Round[];
  matches: Match[];
  participants: Participant[];
  accent: string;
  tournamentStreamUrl?: string | null;
  canEdit?: boolean;
  onMatchClick?: (matchId: string) => void;
  onSlotSwap?: (slot: BracketSlotRef) => void;
  pickSlot?: BracketSlotRef | null;
  numberingMatches?: Match[];
  numberingRounds?: Round[];
  highlightTeamId?: string | null;
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

    const wbCols = roundsWithMatches.filter((c) => c.round.kind === "WB");
    const lbCols = roundsWithMatches.filter((c) => c.round.kind === "LB");
    const gfCols = roundsWithMatches.filter((c) => c.round.kind === "FINAL");
    const thirdCols = roundsWithMatches.filter(
      (c) => c.round.kind === "THIRD_PLACE",
    );
    const isDe = lbCols.length > 0;

    let placed: Placed[] = [];
    let headers: Header[] = [];
    let connectors: Connector[] = [];
    let contentW = 0;
    let contentH = 0;

    /** Grand Final column; 3rd-place match stacked directly under it. */
    function placeFinalsColumn(colIndex: number, centerY: number) {
      const x = colX(colIndex);
      let cursorY = Math.max(HEADER_H + MATCH_NUM_GAP, centerY - MATCH_H / 2);

      gfCols.forEach((col) => {
        headers.push({
          id: col.round.id,
          name: col.round.name,
          x,
          y: Math.max(0, cursorY - HEADER_H),
        });
        col.matches.forEach((match, mi) => {
          const y = cursorY + mi * (MATCH_H + ROUND0_GAP);
          placed.push({ match, x, y });
        });
        cursorY +=
          col.matches.length * MATCH_H +
          Math.max(0, col.matches.length - 1) * ROUND0_GAP +
          28;
      });

      thirdCols.forEach((col) => {
        headers.push({
          id: col.round.id,
          name: col.round.name,
          x,
          y: cursorY,
        });
        const y0 = cursorY + HEADER_H;
        col.matches.forEach((match, mi) => {
          placed.push({
            match,
            x,
            y: y0 + mi * (MATCH_H + ROUND0_GAP),
          });
        });
        cursorY =
          y0 +
          col.matches.length * MATCH_H +
          Math.max(0, col.matches.length - 1) * ROUND0_GAP +
          16;
      });
    }

    if (isDe) {
      const lbColOffset = wbCols.length > 1 ? 1 : 0;
      const wb = placeElimTrack(wbCols, 0, 0);
      const lbY0 = wb.bandH + TRACK_GAP;
      const lb = placeElimTrack(lbCols, lbY0, lbColOffset);

      placed = [...wb.placed, ...lb.placed];
      headers = [...wb.headers, ...lb.headers];

      const finalsCol = Math.max(
        wbCols.length,
        lbColOffset + lbCols.length,
      );
      const wbCenterY = HEADER_H + PAD + (wb.bandH - HEADER_H - PAD * 2) / 2;
      const lbCenterY =
        lbY0 + HEADER_H + PAD + (lb.bandH - HEADER_H - PAD * 2) / 2;
      const finalsCenterY = (wbCenterY + lbCenterY) / 2;

      placeFinalsColumn(finalsCol, finalsCenterY);

      connectors = buildConnectorsFromLinks(placed);

      const colCount = finalsCol + (gfCols.length || thirdCols.length ? 1 : 0);
      contentW =
        PAD * 2 +
        Math.max(1, colCount) * MATCH_W +
        Math.max(0, colCount - 1) * ROUND_GAP;
      contentH =
        Math.max(
          ...placed.map((p) => p.y + MATCH_H),
          lbY0 + lb.bandH,
          wb.bandH,
        ) + PAD;
    } else {
      // SE / playoff: main elim track without 3rd place (that goes under final)
      const mainCols = roundsWithMatches.filter(
        (c) => c.round.kind !== "THIRD_PLACE",
      );
      const track = placeElimTrack(mainCols, 0, 0);
      placed = track.placed;
      headers = track.headers;

      if (thirdCols.length && gfCols.length) {
        const gfPlaced = placed.filter((p) =>
          gfCols.some((c) => c.matches.some((m) => m.id === p.match.id)),
        );
        const gf = gfPlaced[0];
        if (gf) {
          // Remove GF from flat track positions and re-stack with 3rd under it
          const gfIds = new Set(
            gfCols.flatMap((c) => c.matches.map((m) => m.id)),
          );
          placed = placed.filter((p) => !gfIds.has(p.match.id));
          headers = headers.filter((h) => !gfCols.some((c) => c.round.id === h.id));
          placeFinalsColumn(mainCols.length - 1, gf.y + MATCH_H / 2);
        }
      } else if (thirdCols.length) {
        // No FINAL kind — put 3rd under last column
        const last = mainCols[mainCols.length - 1];
        const lastPlaced = placed.filter((p) =>
          last?.matches.some((m) => m.id === p.match.id),
        );
        const anchor = lastPlaced[lastPlaced.length - 1];
        if (anchor) {
          const x = anchor.x;
          let y = anchor.y + MATCH_H + 36;
          thirdCols.forEach((col) => {
            headers.push({
              id: col.round.id,
              name: col.round.name,
              x,
              y,
            });
            y += HEADER_H;
            col.matches.forEach((match, mi) => {
              placed.push({
                match,
                x,
                y: y + mi * (MATCH_H + ROUND0_GAP),
              });
            });
            y +=
              col.matches.length * MATCH_H +
              Math.max(0, col.matches.length - 1) * ROUND0_GAP +
              16;
          });
        }
      }

      for (let r = 0; r < mainCols.length - 1; r++) {
        const curr = placed.filter((p) =>
          mainCols[r].matches.some((m) => m.id === p.match.id),
        );
        const next = placed.filter((p) =>
          mainCols[r + 1].matches.some((m) => m.id === p.match.id),
        );
        connectors.push(...pairConnectors(curr, next));
      }
      if (!connectors.length) {
        connectors = buildConnectorsFromLinks(placed);
      }
      contentW =
        PAD * 2 +
        mainCols.length * MATCH_W +
        Math.max(0, mainCols.length - 1) * ROUND_GAP;
      contentH = Math.max(
        track.bandH,
        ...placed.map((p) => p.y + MATCH_H + PAD),
      );
    }

    return { headers, placed, connectors, contentW, contentH };
  }, [matches, sortedRounds]);

  /** Global M-numbers + derived Поб./Проигр. M# from next/loser links. */
  const feedMeta = useMemo(() => {
    const srcMatches = numberingMatches ?? matches;
    const srcRounds = numberingRounds ?? sortedRounds;
    const numById = assignMatchNumbers(srcMatches, srcRounds);
    const orderOf = new Map(srcRounds.map((r) => [r.id, r.order]));
    const ordered = [...srcMatches].sort((a, b) => {
      const ao = orderOf.get(a.roundId) ?? 0;
      const bo = orderOf.get(b.roundId) ?? 0;
      if (ao !== bo) return ao - bo;
      return a.orderInRound - b.orderInRound;
    });
    const derived = new Map<string, { s1?: string; s2?: string }>();
    const slot = (id: string) => {
      let row = derived.get(id);
      if (!row) {
        row = {};
        derived.set(id, row);
      }
      return row;
    };
    for (const m of ordered) {
      const num = numById.get(m.id);
      if (num == null) continue;
      const code = `M${num}`;
      if (m.nextMatchId && m.nextSlot) {
        const row = slot(m.nextMatchId);
        if (m.nextSlot === 1) row.s1 ??= `Поб. ${code}`;
        if (m.nextSlot === 2) row.s2 ??= `Поб. ${code}`;
      }
      if (m.loserNextMatchId && m.loserNextSlot) {
        const row = slot(m.loserNextMatchId);
        if (m.loserNextSlot === 1) row.s1 ??= `Проигр. ${code}`;
        if (m.loserNextSlot === 2) row.s2 ??= `Проигр. ${code}`;
      }
    }
    return { numById, derived };
  }, [matches, numberingMatches, numberingRounds, sortedRounds]);

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

  useEffect(() => {
    if (!highlightTeamId || !layout || viewportSize.w < 40) return;
    const target = layout.placed.find(
      (p) =>
        p.match.participant1Id === highlightTeamId ||
        p.match.participant2Id === highlightTeamId,
    );
    if (!target) return;
    const cx = target.x + MATCH_W / 2;
    const cy = target.y + MATCH_H / 2;
    setOffset(
      clampOffset(
        viewportSize.w / 2 - cx * zoom,
        viewportSize.h / 2 - cy * zoom,
      ),
    );
  }, [
    highlightTeamId,
    layout,
    viewportSize.w,
    viewportSize.h,
    zoom,
    clampOffset,
  ]);

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
    const target = e.target as HTMLElement | null;
    // Don't steal clicks from match cards / controls (swap slots, edit, links).
    if (
      target?.closest(
        "button, a, input, select, textarea, .match-node, [data-no-pan]",
      )
    ) {
      return;
    }
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
      <div className="ui-panel px-6 py-16 text-center">
        <p className="font-display text-2xl text-white/80">Сетка ещё не создана</p>
        <p className="mt-2 text-sm text-white/45">Матчи появятся после публикации турнира.</p>
      </div>
    );
  }

  return (
    <div
      className="bracket-shell"
      style={{ ["--disc" as string]: accent }}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 px-3 py-2.5 sm:px-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/45">
          Вид сетки
        </p>
        <div className="flex flex-wrap items-center gap-2">
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
      </div>

      <div
        ref={viewportRef}
        className={`bracket-viewport relative h-[min(78vh,820px)] touch-none overflow-hidden ${
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
          {layout.headers.map((h) => (
            <div
              key={h.id}
              className="absolute flex items-center font-display text-sm tracking-wide text-white/75"
              style={{
                left: h.x,
                top: h.y,
                width: MATCH_W,
                height: HEADER_H,
              }}
            >
              <span
                className="truncate border-b pb-1"
                style={{ borderColor: `${accent}66` }}
              >
                {h.name}
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
                strokeOpacity={c.dashed ? 0.45 : 0.75}
                strokeDasharray={c.dashed ? "6 5" : undefined}
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
            const stream =
              match.streamUrl || tournamentStreamUrl || null;
            const derived = feedMeta.derived.get(match.id);
            const matchNo = feedMeta.numById.get(match.id);
            const name1 =
              p1?.name ??
              (isOpeningFeedLabel(match.slotLabel1)
                ? match.slotLabel1
                : null) ??
              derived?.s1 ??
              match.slotLabel1 ??
              (match.isBye && !match.participant1Id ? "BYE" : "TBD");
            const name2 =
              p2?.name ??
              (isOpeningFeedLabel(match.slotLabel2)
                ? match.slotLabel2
                : null) ??
              derived?.s2 ??
              match.slotLabel2 ??
              (match.isBye && !match.participant2Id ? "BYE" : "TBD");
            const placeholder1 =
              !p1 && name1 !== "TBD" && name1 !== "BYE";
            const placeholder2 =
              !p2 && name2 !== "TBD" && name2 !== "BYE";
            const highlighted =
              Boolean(highlightTeamId) &&
              (match.participant1Id === highlightTeamId ||
                match.participant2Id === highlightTeamId);
            const dimmed = Boolean(highlightTeamId) && !highlighted;
            return (
              <div key={match.id}>
                {matchNo != null ? (
                  <button
                    type="button"
                    className={`absolute flex items-end justify-end font-display text-[11px] font-semibold tabular-nums tracking-wide ${
                      canEdit && onMatchClick
                        ? "cursor-pointer hover:underline"
                        : "pointer-events-none"
                    }`}
                    style={{
                      left: x,
                      top: y - 18,
                      width: MATCH_W,
                      height: 16,
                      paddingRight: 2,
                      color: accent,
                      opacity: dimmed ? 0.35 : 1,
                      background: "transparent",
                      border: "none",
                    }}
                    data-no-pan
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (canEdit && onMatchClick) onMatchClick(match.id);
                    }}
                    title={canEdit ? "Редактировать матч" : undefined}
                  >
                    M{matchNo}
                  </button>
                ) : null}
                <article
                  className={`match-node absolute overflow-hidden rounded-xl ${
                    canEdit || match.isLive ? "cursor-pointer" : ""
                  } ${highlighted ? "match-team-highlight" : ""}`}
                  data-live={match.isLive ? "true" : undefined}
                  data-highlight={highlighted ? "true" : undefined}
                  style={{
                    left: x,
                    top: y,
                    width: MATCH_W,
                    height: MATCH_H,
                    ["--disc" as string]: accent,
                    opacity: dimmed ? 0.38 : 1,
                    borderColor: highlighted
                      ? accent
                      : pickSlot?.matchId === match.id
                        ? accent
                        : undefined,
                    boxShadow: highlighted
                      ? `0 0 0 1px ${accent}, 0 0 18px color-mix(in srgb, ${accent} 35%, transparent)`
                      : pickSlot?.matchId === match.id
                        ? `0 0 0 1px ${accent}`
                        : undefined,
                    transition: "opacity 0.2s ease, box-shadow 0.2s ease",
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    // Admin: slots handle swap; M# opens editor. Card click must not steal picks.
                    if (canEdit) return;
                    if (match.isLive && stream) {
                      window.open(stream, "_blank", "noopener,noreferrer");
                    }
                  }}
                >
                  {match.isLive ? (
                    <span
                      className="absolute right-1.5 top-1 z-10 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-black"
                      style={{ background: accent }}
                    >
                      Live
                    </span>
                  ) : null}
                  <Slot
                    seed={p1?.seed}
                    name={name1}
                    score={match.score1}
                    winner={
                      match.winnerId != null &&
                      match.winnerId === match.participant1Id
                    }
                    accent={accent}
                    placeholder={placeholder1}
                    selected={
                      pickSlot?.matchId === match.id && pickSlot.slot === 1
                    }
                    canPick={Boolean(canEdit && onSlotSwap)}
                    onPick={(e) => {
                      e.stopPropagation();
                      onSlotSwap?.({ matchId: match.id, slot: 1 });
                    }}
                  />
                  <div className="h-px" style={{ background: `${accent}33` }} />
                  <Slot
                    seed={p2?.seed}
                    name={name2}
                    score={match.score2}
                    winner={
                      match.winnerId != null &&
                      match.winnerId === match.participant2Id
                    }
                    accent={accent}
                    placeholder={placeholder2}
                    selected={
                      pickSlot?.matchId === match.id && pickSlot.slot === 2
                    }
                    canPick={Boolean(canEdit && onSlotSwap)}
                    onPick={(e) => {
                      e.stopPropagation();
                      onSlotSwap?.({ matchId: match.id, slot: 2 });
                    }}
                  />
                </article>
              </div>
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
  placeholder = false,
  selected = false,
  canPick = false,
  onPick,
}: {
  seed?: number;
  name: string;
  score: number | null;
  winner: boolean;
  accent: string;
  placeholder?: boolean;
  selected?: boolean;
  canPick?: boolean;
  onPick?: (e: React.MouseEvent) => void;
}) {
  const style = {
    color: winner ? accent : undefined,
    background: selected
      ? `color-mix(in srgb, ${accent} 28%, transparent)`
      : undefined,
    boxShadow: selected ? `inset 2px 0 0 ${accent}` : undefined,
  } as const;

  const inner = (
    <>
      <span
        className="w-5 shrink-0 text-center text-[11px] tabular-nums"
        style={{ color: winner ? accent : "rgba(255,255,255,0.35)" }}
      >
        {placeholder ? "↓" : (seed ?? "·")}
      </span>
      <span
        className={`min-w-0 flex-1 truncate ${
          placeholder
            ? "font-semibold uppercase tracking-wide"
            : winner
              ? "font-semibold"
              : "text-white/85"
        }`}
        style={placeholder ? { color: accent } : undefined}
      >
        {name}
      </span>
      <span className="w-6 shrink-0 text-right tabular-nums text-white/70">
        {score ?? ""}
      </span>
    </>
  );

  if (canPick) {
    return (
      <button
        type="button"
        className="flex h-[35px] w-full items-center gap-2 px-2.5 text-left text-sm hover:bg-white/[0.06]"
        style={style}
        data-no-pan
        onPointerDown={(e) => e.stopPropagation()}
        onClick={onPick}
      >
        {inner}
      </button>
    );
  }

  return (
    <div className="flex h-[35px] items-center gap-2 px-2.5 text-sm" style={style}>
      {inner}
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
      className="focus-ring flex h-9 w-9 items-center justify-center border text-sm font-semibold disabled:opacity-35"
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
    <div className="bracket-nav flex items-center gap-2 px-3 py-3 sm:gap-3 sm:px-4">
      <button
        type="button"
        aria-label="Влево"
        disabled={disabled}
        onClick={() => onStep(-1)}
        className="focus-ring flex h-10 w-10 shrink-0 items-center justify-center border text-lg disabled:opacity-35"
        style={{ borderColor: `${accent}66`, color: accent }}
      >
        ‹
      </button>
      <div
        ref={trackRef}
        className="relative h-2 flex-1 cursor-pointer"
        style={{
          background: "rgba(255,255,255,0.08)",
          boxShadow: `inset 0 0 0 1px ${accent}33`,
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
          className="absolute top-1/2 h-3.5 -translate-y-1/2"
          style={{
            width: `${thumbWidth}%`,
            left: `calc(${scrollRatio} * (100% - ${thumbWidth}%))`,
            background: accent,
          }}
        />
      </div>
      <button
        type="button"
        aria-label="Вправо"
        disabled={disabled}
        onClick={() => onStep(1)}
        className="focus-ring flex h-10 w-10 shrink-0 items-center justify-center border text-lg disabled:opacity-35"
        style={{ borderColor: `${accent}66`, color: accent }}
      >
        ›
      </button>
    </div>
  );
}
