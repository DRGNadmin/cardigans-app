"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { BracketView } from "@/components/BracketView";
import { RoundRobinBoard } from "@/components/RoundRobinBoard";
import { TeamLogoManager } from "@/components/TeamLogoManager";
import {
  assignMatchNumbers,
  compareScheduleRows,
  formatMatchCode,
  matchDisplayName,
} from "@/lib/matchNumbers";
import type { SerializedTournament } from "@/lib/tournamentQuery";

type Props = {
  initial: SerializedTournament;
  accent: string;
  canEdit: boolean;
  mode?: "bracket" | "schedule";
  title?: string;
  subtitle?: string;
  scheduleHref?: string;
  highlightTeamId?: string | null;
};

export function TournamentArena({
  initial,
  accent,
  canEdit,
  mode = "bracket",
  title,
  subtitle,
  scheduleHref,
  highlightTeamId = null,
}: Props) {
  const [data, setData] = useState(initial);
  const [tab, setTab] = useState<"groups" | "playoff" | "table">("groups");
  const [groupId, setGroupId] = useState<string | null>(
    initial.groups[0]?.id ?? null,
  );
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [pickSlot, setPickSlot] = useState<{
    matchId: string;
    slot: 1 | 2;
  } | null>(null);

  const refresh = useCallback(async () => {
    const res = await fetch(`/api/tournaments/${initial.id}`, {
      cache: "no-store",
    });
    if (!res.ok) return;
    const next = (await res.json()) as SerializedTournament;
    setData(next);
  }, [initial.id]);

  useEffect(() => {
    setData(initial);
  }, [initial]);

  useEffect(() => {
    const es = new EventSource(`/api/events/tournament/${initial.id}`);
    es.onmessage = (ev) => {
      try {
        const payload = JSON.parse(ev.data) as { type?: string };
        if (payload.type === "tournament:update" || payload.type === "connected") {
          if (payload.type === "tournament:update") void refresh();
        }
      } catch {
        /* ignore */
      }
    };
    return () => es.close();
  }, [initial.id, refresh]);

  const settings = data.settings as {
    standingsTable?: boolean;
    groupFormat?: string;
    playoffFormat?: string;
    placementNote?: string;
  };

  const hasGroups = data.groups.length > 0;
  const hasTable = Boolean(settings.standingsTable);
  const playoffRounds = useMemo(
    () =>
      data.rounds.filter(
        (r) =>
          !r.groupId &&
          (r.kind === "PLAYOFF" ||
            r.kind === "WB" ||
            r.kind === "LB" ||
            r.kind === "FINAL" ||
            r.kind === "THIRD_PLACE"),
      ),
    [data.rounds],
  );

  useEffect(() => {
    if (hasTable) setTab("table");
    else if (hasGroups) setTab("groups");
    else setTab("playoff");
  }, [hasTable, hasGroups]);

  useEffect(() => {
    if (!highlightTeamId) return;
    const p = data.participants.find((x) => x.id === highlightTeamId);
    if (!p) return;
    if (p.groupId && hasGroups) {
      setGroupId(p.groupId);
      setTab("groups");
      return;
    }
    const inPlayoff = data.matches.some((m) => {
      if (
        m.participant1Id !== highlightTeamId &&
        m.participant2Id !== highlightTeamId
      ) {
        return false;
      }
      const r = data.rounds.find((x) => x.id === m.roundId);
      return Boolean(
        r &&
          !r.groupId &&
          (r.kind === "PLAYOFF" ||
            r.kind === "WB" ||
            r.kind === "LB" ||
            r.kind === "FINAL" ||
            r.kind === "THIRD_PLACE"),
      );
    });
    if (inPlayoff) setTab("playoff");
  }, [highlightTeamId, data.participants, data.matches, data.rounds, hasGroups]);

  const viewRounds = useMemo(() => {
    if (tab === "table") return [];
    if (tab === "playoff") return playoffRounds;
    if (groupId) {
      return data.rounds.filter(
        (r) => r.groupId === groupId || (r.kind === "GROUP" && !r.groupId),
      );
    }
    return data.rounds.filter((r) => r.kind === "GROUP" || r.groupId);
  }, [tab, playoffRounds, data.rounds, groupId]);

  const viewMatches = useMemo(() => {
    const roundIds = new Set(viewRounds.map((r) => r.id));
    let list = data.matches.filter((m) => roundIds.has(m.roundId));
    if (tab === "groups" && groupId) {
      list = list.filter(
        (m) => m.groupId === groupId || (!m.groupId && viewRounds.some((r) => r.kind === "GROUP")),
      );
      // For shared GROUP round, filter by groupId
      if (viewRounds.some((r) => r.kind === "GROUP" && !r.groupId)) {
        list = data.matches.filter(
          (m) =>
            m.groupId === groupId &&
            data.rounds.some((r) => r.id === m.roundId && r.kind === "GROUP"),
        );
      }
    }
    return list;
  }, [viewRounds, data.matches, data.rounds, tab, groupId]);

  const editing = editingId
    ? data.matches.find((m) => m.id === editingId)
    : null;

  async function saveMatch(patch: Record<string, unknown>) {
    if (!editingId) return;
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/admin/matches/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const body = await res.json();
      if (!res.ok) {
        setMsg(body.error ?? "Ошибка");
        return;
      }
      await refresh();
      setEditingId(null);
    } catch {
      setMsg("Сеть");
    } finally {
      setBusy(false);
    }
  }

  async function handleSlotPick(next: { matchId: string; slot: 1 | 2 }) {
    if (!pickSlot) {
      setPickSlot(next);
      setMsg(null);
      return;
    }
    if (pickSlot.matchId === next.matchId && pickSlot.slot === next.slot) {
      setPickSlot(null);
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/matches/swap-slots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matchAId: pickSlot.matchId,
          slotA: pickSlot.slot,
          matchBId: next.matchId,
          slotB: next.slot,
        }),
      });
      const body = (await res.json().catch(() => null)) as {
        error?: string;
      } | null;
      if (!res.ok) {
        setMsg(body?.error ?? "Не удалось поменять слоты");
        return;
      }
      setPickSlot(null);
      await refresh();
    } catch {
      setMsg("Сеть");
    } finally {
      setBusy(false);
    }
  }

  async function saveParticipant(
    id: string,
    patch: { name?: string; points?: number; statusText?: string },
  ) {
    setBusy(true);
    try {
      await fetch(`/api/admin/participants/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  async function qualify() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/admin/tournaments/${data.id}/qualify`, {
        method: "POST",
      });
      const body = await res.json();
      if (!res.ok) {
        setMsg(body.error ?? "Ошибка квалификации");
        return;
      }
      setMsg(`Заполнено слотов: ${body.filled}`);
      await refresh();
      setTab("playoff");
    } finally {
      setBusy(false);
    }
  }

  async function saveStreamDefault(url: string) {
    await fetch(`/api/tournaments/${data.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ streamUrl: url }),
    });
    await refresh();
  }

  const scheduleRows = useMemo(() => {
    const byRound = new Map(data.rounds.map((r) => [r.id, r.name]));
    const byP = new Map(data.participants.map((p) => [p.id, p.name]));
    const numById = assignMatchNumbers(data.matches, data.rounds);
    return [...data.matches]
      .filter((m) => !m.isBye)
      .map((m) => {
        const matchNo = numById.get(m.id) ?? null;
        return {
          id: m.id,
          matchNo,
          matchCode: matchNo != null ? formatMatchCode(matchNo) : null,
          roundName: byRound.get(m.roundId) ?? "—",
          p1: matchDisplayName(
            m.participant1Id,
            m.participant1Id ? byP.get(m.participant1Id) : undefined,
            m.slotLabel1,
          ),
          p2: matchDisplayName(
            m.participant2Id,
            m.participant2Id ? byP.get(m.participant2Id) : undefined,
            m.slotLabel2,
          ),
          score1: m.score1,
          score2: m.score2,
          scheduledAt: m.scheduledAt,
          venue: m.venue,
          isLive: m.isLive,
        };
      })
      .sort(compareScheduleRows);
  }, [data]);

  const groupMatches = useMemo(() => {
    if (tab !== "groups" || !groupId) return [];
    return data.matches.filter((m) => {
      const round = data.rounds.find((r) => r.id === m.roundId);
      if (round?.groupId) return round.groupId === groupId;
      return m.groupId === groupId;
    });
  }, [tab, groupId, data.matches, data.rounds]);

  const groupParticipants = useMemo(
    () => data.participants.filter((p) => p.groupId === groupId),
    [data.participants, groupId],
  );

  const groupIsDe = useMemo(
    () =>
      viewRounds.some((r) => r.kind === "WB" || r.kind === "LB") ||
      settings.groupFormat === "DE",
    [viewRounds, settings.groupFormat],
  );

  if (mode === "schedule") {
    return (
      <div className="space-y-4">
        {canEdit ? (
          <p className="text-xs text-white/45">
            Клик по строке — правка матча (счёт / Live / стрим)
          </p>
        ) : null}
        {canEdit ? (
          <TeamLogoManager
            participants={data.participants}
            accent={accent}
            onUpdated={() => void refresh()}
          />
        ) : null}
        <AdminSchedule
          rows={scheduleRows}
          accent={accent}
          canEdit={canEdit}
          onEdit={setEditingId}
          streamDefault={data.streamUrl}
        />
        {editing ? (
          <MatchEditor
            match={editing}
            participants={data.participants}
            accent={accent}
            busy={busy}
            msg={msg}
            tournamentStreamUrl={data.streamUrl}
            onClose={() => setEditingId(null)}
            onSave={saveMatch}
          />
        ) : null}
      </div>
    );
  }

  return (
    <div
      className="ui-panel space-y-4 overflow-hidden p-3 sm:p-4"
      style={{ ["--disc" as string]: accent }}
    >
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-white/10 px-1 pb-1">
        <div>
          {title ? (
            <div className="mb-1">
              <h2
                className="font-display text-2xl leading-none sm:text-3xl"
                style={{ color: accent }}
              >
                {title}
              </h2>
              {subtitle ? (
                <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-white/40">
                  {subtitle}
                </p>
              ) : null}
            </div>
          ) : null}
          <div className="ui-tabs border-b-0" role="tablist" aria-label="Стадия турнира">
            {hasTable ? (
              <TabBtn active={tab === "table"} onClick={() => setTab("table")}>
                Таблица
              </TabBtn>
            ) : null}
            {hasGroups ? (
              <TabBtn active={tab === "groups"} onClick={() => setTab("groups")}>
                Группы
              </TabBtn>
            ) : null}
            {playoffRounds.length ? (
              <TabBtn active={tab === "playoff"} onClick={() => setTab("playoff")}>
                Плей-офф
              </TabBtn>
            ) : null}
            {scheduleHref ? (
              <Link href={scheduleHref} className="focus-ring ui-tab" data-active="false">
                Расписание
              </Link>
            ) : null}
          </div>
        </div>
        {canEdit && hasGroups ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => void qualify()}
            className="focus-ring btn-ghost text-[0.65rem]"
          >
            Заполнить плей-офф (топ-2)
          </button>
        ) : null}
      </div>

      {tab === "groups" && hasGroups ? (
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Группа">
          {data.groups.map((g) => (
            <button
              key={g.id}
              type="button"
              onClick={() => setGroupId(g.id)}
              className="focus-ring ui-chip"
              data-active={groupId === g.id ? "true" : "false"}
            >
              {g.name}
            </button>
          ))}
        </div>
      ) : null}

      {canEdit ? (
        <p className="text-xs text-white/45">
          {pickSlot
            ? "Выберите второй слот для обмена (клик по тому же — отмена). Номер матча — настройки."
            : "Клик по команде в сетке — перенести в другой слот. Номер матча (M1…) — счёт / Live / время."}
        </p>
      ) : null}

      {canEdit ? (
        <StreamDefault
          value={data.streamUrl ?? ""}
          accent={accent}
          onSave={(url) => void saveStreamDefault(url)}
        />
      ) : null}

      {canEdit ? (
        <TeamLogoManager
          participants={data.participants}
          accent={accent}
          onUpdated={() => void refresh()}
        />
      ) : null}

      {msg ? <p className="text-sm text-white/60">{msg}</p> : null}

      {tab === "groups" &&
      typeof settings.placementNote === "string" &&
      settings.placementNote ? (
        <p className="text-xs text-white/45">{settings.placementNote}</p>
      ) : null}

      {tab === "table" ? (
        <StandingsTable
          participants={data.participants}
          accent={accent}
          canEdit={canEdit}
          onSave={saveParticipant}
        />
      ) : tab === "groups" && !groupIsDe ? (
        <RoundRobinBoard
          participants={groupParticipants}
          matches={groupMatches}
          rounds={data.rounds}
          accent={accent}
          canEdit={canEdit}
          onMatchClick={(id) => {
            setPickSlot(null);
            setEditingId(id);
          }}
          onSlotSwap={(slot) => void handleSlotPick(slot)}
          pickSlot={pickSlot}
          highlightTeamId={highlightTeamId}
          numberingMatches={data.matches}
          numberingRounds={data.rounds}
        />
      ) : (
        <BracketView
          rounds={viewRounds}
          matches={
            tab === "groups" && groupId
              ? groupMatches
              : tab === "playoff"
                ? data.matches.filter((m) =>
                    playoffRounds.some((r) => r.id === m.roundId),
                  )
                : viewMatches
          }
          numberingMatches={data.matches}
          numberingRounds={data.rounds}
          participants={data.participants}
          accent={accent}
          tournamentStreamUrl={data.streamUrl}
          canEdit={canEdit}
          onMatchClick={(id) => {
            setPickSlot(null);
            setEditingId(id);
          }}
          onSlotSwap={(slot) => void handleSlotPick(slot)}
          pickSlot={pickSlot}
          highlightTeamId={highlightTeamId}
        />
      )}

      {editing ? (
        <MatchEditor
          match={editing}
          participants={data.participants}
          accent={accent}
          busy={busy}
          msg={msg}
          tournamentStreamUrl={data.streamUrl}
          onClose={() => setEditingId(null)}
          onSave={saveMatch}
        />
      ) : null}
    </div>
  );
}

function TabBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className="focus-ring ui-tab"
      data-active={active ? "true" : "false"}
    >
      {children}
    </button>
  );
}

function StreamDefault({
  value,
  accent,
  onSave,
}: {
  value: string;
  accent: string;
  onSave: (url: string) => void;
}) {
  const [url, setUrl] = useState(value);
  useEffect(() => setUrl(value), [value]);
  return (
    <label className="flex flex-wrap items-end gap-2 text-xs text-white/55">
      <span className="w-full sm:w-auto">Стрим по умолчанию</span>
      <input
        className="focus-ring field-input min-w-[16rem] flex-1 !mt-0"
        style={{ ["--disc" as string]: accent }}
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="https://..."
      />
      <button
        type="button"
        className="focus-ring btn-primary"
        style={{ ["--disc" as string]: accent }}
        onClick={() => onSave(url)}
      >
        Сохранить
      </button>
    </label>
  );
}

function StandingsTable({
  participants,
  accent,
  canEdit,
  onSave,
}: {
  participants: SerializedTournament["participants"];
  accent: string;
  canEdit: boolean;
  onSave: (
    id: string,
    patch: { name?: string; points?: number; statusText?: string },
  ) => void;
}) {
  const rows = [...participants].sort((a, b) => b.points - a.points);
  return (
    <div className="ui-panel overflow-x-auto">
      <table className="w-full min-w-[640px] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-white/15 text-xs uppercase tracking-[0.16em] text-white/45">
            <th className="px-3 py-3">Место</th>
            <th className="px-3 py-3">ФИО</th>
            <th className="px-3 py-3">Очки</th>
            <th className="px-3 py-3">Статус</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((p, i) => (
            <tr key={p.id} className="border-b border-white/8">
              <td className="px-3 py-3 tabular-nums" style={{ color: accent }}>
                {i + 1}
              </td>
              <td className="px-3 py-3">
                {canEdit ? (
                  <input
                    className="w-full border border-transparent bg-transparent px-1 py-0.5 hover:border-white/20 focus:border-white/30 focus:outline-none"
                    defaultValue={p.name}
                    onBlur={(e) => {
                      if (e.target.value.trim() !== p.name) {
                        onSave(p.id, { name: e.target.value.trim() });
                      }
                    }}
                  />
                ) : (
                  p.name
                )}
              </td>
              <td className="px-3 py-3">
                {canEdit ? (
                  <input
                    type="number"
                    className="w-20 border border-transparent bg-transparent px-1 py-0.5 tabular-nums hover:border-white/20 focus:border-white/30 focus:outline-none"
                    defaultValue={p.points}
                    onBlur={(e) => {
                      const n = Number(e.target.value);
                      if (Number.isFinite(n) && n !== p.points) {
                        onSave(p.id, { points: n });
                      }
                    }}
                  />
                ) : (
                  <span className="tabular-nums">{p.points}</span>
                )}
              </td>
              <td className="px-3 py-3">
                {canEdit ? (
                  <input
                    className="w-full border border-transparent bg-transparent px-1 py-0.5 hover:border-white/20 focus:border-white/30 focus:outline-none"
                    defaultValue={p.statusText}
                    placeholder="любой статус"
                    onBlur={(e) => {
                      if (e.target.value !== p.statusText) {
                        onSave(p.id, { statusText: e.target.value });
                      }
                    }}
                  />
                ) : (
                  p.statusText || "—"
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AdminSchedule({
  rows,
  accent,
  canEdit,
  onEdit,
  streamDefault,
}: {
  rows: {
    id: string;
    matchCode: string | null;
    roundName: string;
    p1: string;
    p2: string;
    score1: number | null;
    score2: number | null;
    scheduledAt: string | null;
    venue: string | null;
    isLive?: boolean;
  }[];
  accent: string;
  canEdit: boolean;
  onEdit: (id: string) => void;
  streamDefault: string | null;
}) {
  return (
    <div className="ui-panel overflow-x-auto">
      <table className="w-full min-w-[720px] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-white/15 text-xs uppercase tracking-[0.16em] text-white/45">
            <th className="px-3 py-3">№</th>
            <th className="px-3 py-3">Дата</th>
            <th className="px-3 py-3">Стадия</th>
            <th className="px-3 py-3">Матч</th>
            <th className="px-3 py-3">Счёт</th>
            <th className="px-3 py-3">Live</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr
              key={r.id}
              className={`border-b border-white/8 hover:bg-white/[0.03] ${
                canEdit || r.isLive ? "cursor-pointer" : ""
              }`}
              onClick={() => {
                if (canEdit) onEdit(r.id);
                else if (r.isLive && streamDefault) {
                  window.open(streamDefault, "_blank", "noopener,noreferrer");
                }
              }}
            >
              <td
                className="px-3 py-3.5 font-display text-xs tabular-nums"
                style={{ color: accent }}
              >
                {r.matchCode ?? "—"}
              </td>
              <td className="px-3 py-3.5 text-white/80">
                {r.scheduledAt
                  ? new Date(r.scheduledAt).toLocaleString("ru-RU")
                  : "—"}
              </td>
              <td className="px-3 py-3.5" style={{ color: accent }}>
                {r.roundName}
              </td>
              <td className="px-3 py-3.5">
                {r.p1} <span className="text-white/35">vs</span> {r.p2}
              </td>
              <td className="px-3 py-3.5 tabular-nums">
                {r.score1 != null && r.score2 != null
                  ? `${r.score1} : ${r.score2}`
                  : "—"}
              </td>
              <td className="px-3 py-3.5">
                {r.isLive ? (
                  <span
                    className="rounded px-2 py-0.5 text-[10px] font-bold uppercase text-black"
                    style={{ background: accent }}
                  >
                    Live
                  </span>
                ) : (
                  "—"
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MatchEditor({
  match,
  participants,
  accent,
  busy,
  msg,
  tournamentStreamUrl,
  onClose,
  onSave,
}: {
  match: SerializedTournament["matches"][number];
  participants: SerializedTournament["participants"];
  accent: string;
  busy: boolean;
  msg: string | null;
  tournamentStreamUrl: string | null;
  onClose: () => void;
  onSave: (patch: Record<string, unknown>) => void;
}) {
  const [score1, setScore1] = useState(String(match.score1 ?? ""));
  const [score2, setScore2] = useState(String(match.score2 ?? ""));
  const [isLive, setIsLive] = useState(Boolean(match.isLive));
  const [streamUrl, setStreamUrl] = useState(match.streamUrl ?? "");
  const [p1, setP1] = useState(match.participant1Id ?? "");
  const [p2, setP2] = useState(match.participant2Id ?? "");
  const [scheduledAt, setScheduledAt] = useState(
    match.scheduledAt ? match.scheduledAt.slice(0, 16) : "",
  );
  const [venue, setVenue] = useState(match.venue ?? "");

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 p-4 sm:items-center"
      role="presentation"
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="match-editor-title"
        className="ui-panel w-full max-w-lg p-5"
        style={{ ["--disc" as string]: accent }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between gap-3 border-b border-white/10 pb-3">
          <h3
            id="match-editor-title"
            className="font-display text-xl"
            style={{ color: accent }}
          >
            Матч
          </h3>
          <button
            type="button"
            className="focus-ring px-2 py-1 text-white/50 hover:text-white"
            aria-label="Закрыть"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-xs text-white/55">
            Участник 1
            <select
              className="field-input"
              value={p1}
              onChange={(e) => setP1(e.target.value)}
            >
              <option value="">TBD</option>
              {participants.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs text-white/55">
            Участник 2
            <select
              className="field-input"
              value={p2}
              onChange={(e) => setP2(e.target.value)}
            >
              <option value="">TBD</option>
              {participants.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs text-white/55">
            Счёт 1
            <input
              type="number"
              className="field-input"
              value={score1}
              onChange={(e) => setScore1(e.target.value)}
            />
          </label>
          <label className="text-xs text-white/55">
            Счёт 2
            <input
              type="number"
              className="field-input"
              value={score2}
              onChange={(e) => setScore2(e.target.value)}
            />
          </label>
          <label className="text-xs text-white/55 sm:col-span-2">
            Время
            <input
              type="datetime-local"
              className="field-input"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
            />
          </label>
          <label className="text-xs text-white/55 sm:col-span-2">
            Площадка
            <input
              className="field-input"
              value={venue}
              onChange={(e) => setVenue(e.target.value)}
            />
          </label>
          <label className="flex min-h-11 items-center gap-2 text-sm text-white/80 sm:col-span-2">
            <input
              type="checkbox"
              checked={isLive}
              onChange={(e) => setIsLive(e.target.checked)}
            />
            Live
          </label>
          <label className="text-xs text-white/55 sm:col-span-2">
            Стрим этого матча (пусто = общая ссылка
            {tournamentStreamUrl ? ` · ${tournamentStreamUrl}` : ""})
            <input
              className="field-input"
              value={streamUrl}
              onChange={(e) => setStreamUrl(e.target.value)}
              placeholder="https://..."
            />
          </label>
        </div>

        {msg ? <p className="mt-3 text-sm text-[#FF006E]">{msg}</p> : null}

        <div className="mt-5 flex justify-end gap-2 border-t border-white/10 pt-4">
          <button type="button" className="focus-ring btn-ghost" onClick={onClose}>
            Отмена
          </button>
          <button
            type="button"
            disabled={busy}
            className="focus-ring btn-primary"
            onClick={() => {
              const patch: Record<string, unknown> = {
                isLive,
                streamUrl: streamUrl.trim() ? streamUrl.trim() : null,
                scheduledAt: scheduledAt || null,
                venue: venue || null,
                participant1Id: p1 || null,
                participant2Id: p2 || null,
              };
              if (score1 !== "" && score2 !== "") {
                patch.score1 = Number(score1);
                patch.score2 = Number(score2);
              }
              onSave(patch);
            }}
          >
            Сохранить изменения
          </button>
        </div>
      </div>
    </div>
  );
}
