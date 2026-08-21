"use client";

import { assignMatchNumbers, formatMatchCode } from "@/lib/matchNumbers";

type Participant = {
  id: string;
  name: string;
  seed: number;
  groupId: string | null;
  points: number;
  statusText: string;
};

type Match = {
  id: string;
  roundId: string;
  orderInRound: number;
  participant1Id: string | null;
  participant2Id: string | null;
  score1: number | null;
  score2: number | null;
  winnerId: string | null;
  groupId?: string | null;
  isLive?: boolean;
};

type Round = {
  id: string;
  name: string;
  order: number;
  kind: string;
};

function scoreFromPerspective(
  match: Match,
  selfId: string,
): { self: number; opp: number } | null {
  if (match.score1 == null || match.score2 == null) return null;
  if (match.participant1Id === selfId) {
    return { self: match.score1, opp: match.score2 };
  }
  if (match.participant2Id === selfId) {
    return { self: match.score2, opp: match.score1 };
  }
  return null;
}

export type RobinSlotRef = { matchId: string; slot: 1 | 2 };

export function RoundRobinBoard({
  participants,
  matches,
  rounds = [],
  accent,
  canEdit = false,
  onMatchClick,
  onSlotSwap,
  pickSlot = null,
  highlightTeamId = null,
  numberingMatches,
  numberingRounds,
}: {
  participants: Participant[];
  matches: Match[];
  rounds?: Round[];
  accent: string;
  canEdit?: boolean;
  onMatchClick?: (matchId: string) => void;
  onSlotSwap?: (slot: RobinSlotRef) => void;
  pickSlot?: RobinSlotRef | null;
  highlightTeamId?: string | null;
  numberingMatches?: Match[];
  numberingRounds?: Round[];
}) {
  const byId = new Map(participants.map((p) => [p.id, p]));
  const ordered = [...participants].sort((a, b) => a.seed - b.seed);

  const roundIds = new Set(matches.map((m) => m.roundId));
  const tours = (
    rounds.length
      ? [...rounds]
          .filter((r) => roundIds.has(r.id))
          .sort((a, b) => a.order - b.order)
      : [...new Set(matches.map((m) => m.roundId))].map((id, i) => ({
          id,
          name: `Round ${i + 1}`,
          order: i,
          kind: "GROUP",
        }))
  ).map((r, i) => ({
    ...r,
    label: /^тур\s*\d+/i.test(r.name)
      ? r.name.replace(/^тур/i, "Round")
      : r.name.startsWith("Round")
        ? r.name
        : `Round ${i + 1}`,
  }));

  const numById = assignMatchNumbers(
    numberingMatches ?? matches,
    numberingRounds ?? rounds,
  );

  const tourBlocks = tours.map((tour) => {
    const list = matches
      .filter((m) => m.roundId === tour.id)
      .sort((a, b) => a.orderInRound - b.orderInRound)
      .map((m) => ({
        match: m,
        no: numById.get(m.id) ?? null,
      }));
    return { tour, list };
  });

  const stats = ordered.map((p) => {
    let played = 0;
    let wins = 0;
    let draws = 0;
    let losses = 0;
    let gf = 0;
    let ga = 0;
    for (const m of matches) {
      if (m.participant1Id !== p.id && m.participant2Id !== p.id) continue;
      if (m.score1 == null || m.score2 == null) continue;
      const s = scoreFromPerspective(m, p.id);
      if (!s) continue;
      played += 1;
      gf += s.self;
      ga += s.opp;
      if (s.self > s.opp) wins += 1;
      else if (s.self < s.opp) losses += 1;
      else draws += 1;
    }
    const pts = wins * 3 + draws;
    return { p, played, wins, draws, losses, gf, ga, diff: gf - ga, pts };
  });

  const standings = [...stats].sort((a, b) => {
    if (b.pts !== a.pts) return b.pts - a.pts;
    if (b.diff !== a.diff) return b.diff - a.diff;
    if (b.gf !== a.gf) return b.gf - a.gf;
    return a.p.seed - b.p.seed;
  });

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(15rem,0.85fr)]">
      <div className="space-y-6">
        <p className="text-[11px] uppercase tracking-[0.18em] text-white/40">
          {ordered.length} team · round robin
        </p>

        {tourBlocks.map(({ tour, list }) => (
          <section key={tour.id}>
            <h3 className="font-display mb-3 text-sm tracking-wide text-white/55">
              {tour.label}
            </h3>
            <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
              {list.map(({ match, no }) => (
                <MatchCard
                  key={match.id}
                  no={no}
                  match={match}
                  byId={byId}
                  accent={accent}
                  canEdit={canEdit}
                  onMatchClick={onMatchClick}
                  onSlotSwap={onSlotSwap}
                  pickSlot={pickSlot}
                  highlightTeamId={highlightTeamId}
                />
              ))}
            </div>
          </section>
        ))}

        {!tourBlocks.length ? (
          <p className="text-sm text-white/45">Матчей пока нет</p>
        ) : null}
      </div>

      <div className="ui-panel overflow-x-auto self-start">
        <p className="border-b border-white/10 px-3 py-3 text-[11px] uppercase tracking-[0.18em] text-white/45">
          Турнирная таблица
        </p>
        <table className="w-full min-w-[260px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-white/10 text-[11px] uppercase tracking-[0.14em] text-white/40">
              <th className="px-3 py-2.5">#</th>
              <th className="px-3 py-2.5">Игрок</th>
              <th className="px-2 py-2.5 text-center">И</th>
              <th className="px-2 py-2.5 text-center">В</th>
              <th className="px-2 py-2.5 text-center">Н</th>
              <th className="px-2 py-2.5 text-center">П</th>
              <th className="px-3 py-2.5 text-right">Очки</th>
            </tr>
          </thead>
          <tbody>
            {standings.map((row, i) => (
              <tr key={row.p.id} className="border-b border-white/[0.08]">
                <td
                  className="px-3 py-2.5 tabular-nums"
                  style={{ color: accent }}
                >
                  {i + 1}
                </td>
                <td className="truncate px-3 py-2.5">{row.p.name}</td>
                <td className="px-2 py-2.5 text-center tabular-nums text-white/70">
                  {row.played}
                </td>
                <td className="px-2 py-2.5 text-center tabular-nums text-white/70">
                  {row.wins}
                </td>
                <td className="px-2 py-2.5 text-center tabular-nums text-white/70">
                  {row.draws}
                </td>
                <td className="px-2 py-2.5 text-center tabular-nums text-white/70">
                  {row.losses}
                </td>
                <td className="px-3 py-2.5 text-right font-semibold tabular-nums">
                  {row.pts}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="px-3 py-2 text-[11px] text-white/35">
          Очки: победа 3 · ничья 1 · поражение 0
        </p>
      </div>
    </div>
  );
}

function MatchCard({
  no,
  match,
  byId,
  accent,
  canEdit,
  onMatchClick,
  onSlotSwap,
  pickSlot,
  highlightTeamId,
}: {
  no: number | null;
  match: Match;
  byId: Map<string, Participant>;
  accent: string;
  canEdit?: boolean;
  onMatchClick?: (matchId: string) => void;
  onSlotSwap?: (slot: RobinSlotRef) => void;
  pickSlot?: RobinSlotRef | null;
  highlightTeamId?: string | null;
}) {
  const p1 = match.participant1Id
    ? byId.get(match.participant1Id)
    : undefined;
  const p2 = match.participant2Id
    ? byId.get(match.participant2Id)
    : undefined;
  const canPick = Boolean(canEdit && onSlotSwap);
  const clickableEdit = Boolean(canEdit && onMatchClick);
  const highlighted =
    Boolean(highlightTeamId) &&
    (match.participant1Id === highlightTeamId ||
      match.participant2Id === highlightTeamId);
  const dimmed = Boolean(highlightTeamId) && !highlighted;
  const pickedHere = pickSlot?.matchId === match.id;
  const code = no != null ? formatMatchCode(no) : "—";

  return (
    <div
      className="flex items-center gap-2.5"
      style={{ opacity: dimmed ? 0.35 : 1 }}
    >
      <button
        type="button"
        disabled={!clickableEdit}
        onClick={() => onMatchClick?.(match.id)}
        className={`w-7 shrink-0 text-right font-display text-[11px] tabular-nums ${
          clickableEdit
            ? "cursor-pointer hover:underline"
            : "text-white/35"
        }`}
        style={clickableEdit || no != null ? { color: accent } : undefined}
        title={clickableEdit ? "Редактировать матч" : undefined}
      >
        {code}
      </button>
      <div
        className="match-node min-w-0 flex-1 overflow-hidden rounded-[10px] text-left transition duration-200"
        style={
          highlighted || match.isLive || pickedHere
            ? {
                borderColor: accent,
                boxShadow: highlighted
                  ? `0 0 0 1px ${accent}, 0 0 16px color-mix(in srgb, ${accent} 30%, transparent)`
                  : `0 0 0 1px ${accent}`,
              }
            : undefined
        }
        data-live={match.isLive ? "true" : "false"}
        data-highlight={highlighted ? "true" : undefined}
      >
        <SlotRow
          seed={p1?.seed ?? "—"}
          name={p1?.name ?? "TBD"}
          score={match.score1}
          accent={accent}
          won={
            match.winnerId != null &&
            match.winnerId === match.participant1Id
          }
          teamHighlight={
            Boolean(highlightTeamId) &&
            match.participant1Id === highlightTeamId
          }
          selected={pickedHere && pickSlot?.slot === 1}
          canPick={canPick}
          onPick={() => onSlotSwap?.({ matchId: match.id, slot: 1 })}
          top
        />
        <SlotRow
          seed={p2?.seed ?? "—"}
          name={p2?.name ?? "TBD"}
          score={match.score2}
          accent={accent}
          won={
            match.winnerId != null &&
            match.winnerId === match.participant2Id
          }
          teamHighlight={
            Boolean(highlightTeamId) &&
            match.participant2Id === highlightTeamId
          }
          selected={pickedHere && pickSlot?.slot === 2}
          canPick={canPick}
          onPick={() => onSlotSwap?.({ matchId: match.id, slot: 2 })}
        />
      </div>
    </div>
  );
}

function SlotRow({
  seed,
  name,
  score,
  accent,
  won,
  teamHighlight,
  selected,
  canPick,
  onPick,
  top,
}: {
  seed: number | string;
  name: string;
  score: number | null;
  accent: string;
  won?: boolean;
  teamHighlight?: boolean;
  selected?: boolean;
  canPick?: boolean;
  onPick?: () => void;
  top?: boolean;
}) {
  const className = `flex h-9 w-full items-stretch text-left text-[13px] leading-none ${
    top ? "border-b border-white/10" : ""
  } ${canPick ? "cursor-pointer hover:bg-white/[0.05]" : ""}`;
  const style = {
    background: selected
      ? `color-mix(in srgb, ${accent} 28%, transparent)`
      : teamHighlight
        ? `color-mix(in srgb, ${accent} 14%, transparent)`
        : undefined,
    boxShadow: selected ? `inset 2px 0 0 ${accent}` : undefined,
  } as const;

  const body = (
    <>
      <span
        className="flex w-9 shrink-0 items-center justify-center border-r border-white/10 font-display text-xs tabular-nums"
        style={{
          color: accent,
          background: `color-mix(in srgb, ${accent} 12%, transparent)`,
        }}
      >
        {seed}
      </span>
      <span
        className={`flex min-w-0 flex-1 items-center truncate px-3 ${
          won || teamHighlight || selected ? "text-white" : "text-white/75"
        }`}
      >
        {name}
      </span>
      {score != null ? (
        <span
          className={`flex w-9 shrink-0 items-center justify-center tabular-nums ${
            won || teamHighlight ? "font-semibold text-white" : "text-white/55"
          }`}
        >
          {score}
        </span>
      ) : null}
    </>
  );

  if (canPick) {
    return (
      <button type="button" className={className} style={style} onClick={onPick}>
        {body}
      </button>
    );
  }

  return (
    <div className={className} style={style}>
      {body}
    </div>
  );
}

