"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { formatMatchDateShort, formatMatchDateTime } from "@/lib/dateTime";
import {
  assignMatchNumbers,
  compareScheduleRows,
  formatMatchCode,
  matchDisplayName,
} from "@/lib/matchNumbers";
import type { SerializedTournament } from "@/lib/tournamentQuery";

type Row = {
  id: string;
  matchNo: number | null;
  matchCode: string | null;
  roundName: string;
  p1: string;
  p2: string;
  p1Id: string | null;
  p2Id: string | null;
  p1Logo: string | null;
  p2Logo: string | null;
  score1: number | null;
  score2: number | null;
  scheduledAt: string | null;
  isLive?: boolean;
  streamUrl?: string | null;
};

function buildRows(data: SerializedTournament): Row[] {
  const byRound = new Map(data.rounds.map((r) => [r.id, r.name]));
  const byP = new Map(
    data.participants.map((p) => [p.id, { name: p.name, logoUrl: p.logoUrl }]),
  );
  const numById = assignMatchNumbers(data.matches, data.rounds);

  return [...data.matches]
    .filter((m) => !m.isBye)
    .map((m) => {
      const a = m.participant1Id ? byP.get(m.participant1Id) : undefined;
      const b = m.participant2Id ? byP.get(m.participant2Id) : undefined;
      const matchNo = numById.get(m.id) ?? null;
      return {
        id: m.id,
        matchNo,
        matchCode: matchNo != null ? formatMatchCode(matchNo) : null,
        roundName: byRound.get(m.roundId) ?? "—",
        p1: matchDisplayName(m.participant1Id, a?.name, m.slotLabel1),
        p2: matchDisplayName(m.participant2Id, b?.name, m.slotLabel2),
        p1Id: m.participant1Id,
        p2Id: m.participant2Id,
        p1Logo: a?.logoUrl ?? null,
        p2Logo: b?.logoUrl ?? null,
        score1: m.score1,
        score2: m.score2,
        scheduledAt: m.scheduledAt,
        isLive: m.isLive,
        streamUrl: m.streamUrl || data.streamUrl,
      };
    })
    .sort(compareScheduleRows);
}

/** Next by schedule time; if all past — most recent; else live / first. */
function pickNearestMatch(rows: Row[]): Row | null {
  if (!rows.length) return null;
  const now = Date.now();
  const timed = rows
    .filter((r) => r.scheduledAt)
    .map((r) => ({ r, t: new Date(r.scheduledAt!).getTime() }))
    .filter((x) => Number.isFinite(x.t));

  const upcoming = timed.filter((x) => x.t >= now).sort((a, b) => a.t - b.t);
  if (upcoming[0]) return upcoming[0].r;

  const past = [...timed].sort((a, b) => b.t - a.t);
  if (past[0]) return past[0].r;

  return rows.find((r) => r.isLive) ?? rows[0] ?? null;
}

export function ArenaSidebar({
  data: initial,
  accent,
  title = "Расписание",
  highlightTeamId = null,
}: {
  data: SerializedTournament;
  accent: string;
  title?: string;
  highlightTeamId?: string | null;
}) {
  const [data, setData] = useState(initial);
  const [, setTick] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);
  const rows = buildRows(data);
  const featured = pickNearestMatch(rows);
  const stream = featured?.streamUrl || data.streamUrl;

  const refresh = useCallback(async () => {
    const res = await fetch(`/api/tournaments/${initial.id}`, {
      cache: "no-store",
    });
    if (!res.ok) return;
    setData((await res.json()) as SerializedTournament);
  }, [initial.id]);

  useEffect(() => {
    setData(initial);
  }, [initial]);

  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const es = new EventSource(`/api/events/tournament/${initial.id}`);
    es.onmessage = (ev) => {
      try {
        const payload = JSON.parse(ev.data) as { type?: string };
        if (payload.type === "tournament:update") void refresh();
      } catch {
        /* ignore */
      }
    };
    return () => es.close();
  }, [initial.id, refresh]);

  useEffect(() => {
    if (!highlightTeamId || !listRef.current) return;
    const el = listRef.current.querySelector(
      `[data-team-hit="true"]`,
    ) as HTMLElement | null;
    el?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [highlightTeamId, rows]);

  return (
    <aside className="flex w-full flex-col gap-4 lg:w-[300px] xl:w-[320px]">
      <div className="ui-panel overflow-hidden">
        <div className="flex items-center justify-between border-b border-white/10 px-3 py-2.5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/50">
            Ближайший матч
          </p>
          {featured?.isLive ? (
            <span
              className="inline-flex items-center gap-1.5 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-black"
              style={{ background: accent }}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-black" />
              Live
            </span>
          ) : null}
        </div>

        {featured ? (
          <div className="space-y-4 p-4">
            <p className="text-center text-[11px] uppercase tracking-[0.14em] text-white/40">
              {featured.matchCode ? `${featured.matchCode} · ` : ""}
              {featured.roundName}
            </p>
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-center">
              {featured.p1Logo && featured.p2Logo ? (
                <>
                  <TeamSide
                    name={featured.p1}
                    logoUrl={featured.p1Logo}
                    accent={accent}
                  />
                  <p className="font-display text-sm text-white/35">VS</p>
                  <TeamSide
                    name={featured.p2}
                    logoUrl={featured.p2Logo}
                    accent={accent}
                  />
                </>
              ) : (
                <>
                  <div>
                    <p className="font-display text-lg leading-tight text-white">
                      {featured.p1}
                    </p>
                  </div>
                  <p className="font-display text-sm text-white/35">VS</p>
                  <div>
                    <p className="font-display text-lg leading-tight text-white">
                      {featured.p2}
                    </p>
                  </div>
                </>
              )}
            </div>
            <p className="text-center text-xs text-white/50">
              {featured.scheduledAt
                ? formatMatchDateTime(featured.scheduledAt)
                : "Время не назначено"}
              {featured.score1 != null && featured.score2 != null
                ? ` · ${featured.score1}:${featured.score2}`
                : null}
            </p>
            {stream ? (
              <a
                href={stream}
                target="_blank"
                rel="noopener noreferrer"
                className="focus-ring btn-primary flex w-full items-center justify-center gap-2"
                style={{ ["--disc" as string]: accent }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <path d="M8 5v14l11-7L8 5z" />
                </svg>
                Смотреть трансляцию
              </a>
            ) : (
              <button
                type="button"
                disabled
                className="btn-primary flex w-full items-center justify-center gap-2 opacity-45"
                style={{ ["--disc" as string]: accent }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <path d="M8 5v14l11-7L8 5z" />
                </svg>
                Смотреть трансляцию
              </button>
            )}
          </div>
        ) : (
          <p className="px-4 py-8 text-center text-sm text-white/45">
            Матчей пока нет
          </p>
        )}
      </div>

      <div className="ui-panel overflow-hidden">
        <div className="border-b border-white/10 px-3 py-2.5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/50">
            {title}
          </p>
        </div>
        <ul ref={listRef} className="scroll-dark max-h-[420px] overflow-y-auto">
          {rows.slice(0, 40).map((r) => {
            const hit =
              Boolean(highlightTeamId) &&
              (r.p1Id === highlightTeamId || r.p2Id === highlightTeamId);
            const dimmed = Boolean(highlightTeamId) && !hit;
            return (
              <li
                key={r.id}
                data-team-hit={hit ? "true" : undefined}
                className="border-b border-white/[0.08] px-3 py-2.5 last:border-0"
                style={
                  hit
                    ? {
                        background: `color-mix(in srgb, ${accent} 18%, transparent)`,
                        boxShadow: `inset 3px 0 0 ${accent}`,
                      }
                    : r.isLive
                      ? {
                          background: `color-mix(in srgb, ${accent} 18%, transparent)`,
                        }
                      : dimmed
                        ? { opacity: 0.35 }
                        : undefined
                }
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm text-white">
                      {r.matchCode ? (
                        <span
                          className="mr-1.5 font-display text-[11px] tabular-nums"
                          style={{ color: accent }}
                        >
                          {r.matchCode}
                        </span>
                      ) : null}
                      <span
                        className={
                          hit && r.p1Id === highlightTeamId
                            ? "font-semibold"
                            : undefined
                        }
                      >
                        {r.p1}
                      </span>{" "}
                      <span className="text-white/35">vs</span>{" "}
                      <span
                        className={
                          hit && r.p2Id === highlightTeamId
                            ? "font-semibold"
                            : undefined
                        }
                      >
                        {r.p2}
                      </span>
                    </p>
                    <p className="mt-0.5 text-[11px] uppercase tracking-wider text-white/40">
                      {r.roundName}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    {r.isLive ? (
                      <span
                        className="text-[10px] font-bold uppercase"
                        style={{ color: accent }}
                      >
                        Live
                      </span>
                    ) : null}
                    <span
                      className={`block text-[11px] tabular-nums text-white/45 ${
                        r.isLive ? "mt-0.5" : ""
                      }`}
                    >
                      {r.scheduledAt
                        ? formatMatchDateShort(r.scheduledAt)
                        : "—"}
                    </span>
                    {r.score1 != null && r.score2 != null ? (
                      <p className="mt-0.5 text-xs tabular-nums text-white/70">
                        {r.score1}:{r.score2}
                      </p>
                    ) : null}
                  </div>
                </div>
              </li>
            );
          })}
          {!rows.length ? (
            <li className="px-3 py-8 text-center text-sm text-white/40">
              Расписание пусто
            </li>
          ) : null}
        </ul>
      </div>
    </aside>
  );
}

function TeamSide({
  name,
  logoUrl,
  accent,
}: {
  name: string;
  logoUrl: string;
  accent: string;
}) {
  return (
    <div className="flex min-w-0 flex-col items-center gap-2">
      <span
        className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-[10px] border border-white/10 bg-black/45 sm:h-16 sm:w-16"
        style={{
          boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${accent} 28%, transparent)`,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={logoUrl}
          alt=""
          className="h-full w-full object-contain p-1"
        />
      </span>
      <p className="font-display text-lg leading-tight text-white">{name}</p>
    </div>
  );
}
