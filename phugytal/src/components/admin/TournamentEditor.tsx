"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toLocalInputValue } from "@/lib/dateTime";

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
  venue: string | null;
};

export function TournamentEditor({
  tournamentId,
  accent,
  initialRounds,
  initialMatches,
  participants,
}: {
  tournamentId: string;
  accent: string;
  initialRounds: Round[];
  initialMatches: Match[];
  participants: Participant[];
}) {
  const router = useRouter();
  const [rounds, setRounds] = useState(initialRounds);
  const [matches, setMatches] = useState(initialMatches);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const byId = useMemo(
    () => new Map(participants.map((p) => [p.id, p])),
    [participants],
  );

  async function renameRound(roundId: string, name: string) {
    setError(null);
    const res = await fetch(`/api/admin/rounds/${roundId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) {
      setError("Не удалось переименовать стадию");
      return;
    }
    setRounds((prev) => prev.map((r) => (r.id === roundId ? { ...r, name } : r)));
    setMessage("Стадия обновлена");
    router.refresh();
  }

  async function saveScore(matchId: string, score1: number, score2: number) {
    setError(null);
    const res = await fetch(`/api/admin/matches/${matchId}/score`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ score1, score2 }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Ошибка счёта");
      return;
    }
    setMessage("Счёт сохранён — сетка и расписание обновлены");
    // Reload full tournament for advancement
    const tRes = await fetch(`/api/admin/tournaments/${tournamentId}`);
    if (tRes.ok) {
      const tData = await tRes.json();
      setMatches(tData.tournament.matches);
      setRounds(tData.tournament.rounds);
    }
    router.refresh();
  }

  async function saveSchedule(
    matchId: string,
    scheduledAt: string | null,
    venue: string | null,
  ) {
    setError(null);
    const res = await fetch(`/api/admin/matches/${matchId}/schedule`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        // Send datetime-local as-is; server parses as local wall clock
        scheduledAt,
        venue,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "Не удалось сохранить расписание");
      return;
    }
    setMatches((prev) =>
      prev.map((m) =>
        m.id === matchId
          ? {
              ...m,
              scheduledAt: data.match?.scheduledAt ?? null,
              venue: data.match?.venue ?? venue,
            }
          : m,
      ),
    );
    setMessage("Дата и время сохранены — обновилось и в расписании");
    router.refresh();
  }

  const sortedRounds = [...rounds].sort((a, b) => a.order - b.order);

  return (
    <div className="space-y-8">
      {message ? <p className="text-sm" style={{ color: accent }}>{message}</p> : null}
      {error ? <p className="text-sm text-[#FF006E]">{error}</p> : null}

      {sortedRounds.map((round) => {
        const roundMatches = matches
          .filter((m) => m.roundId === round.id)
          .sort((a, b) => a.orderInRound - b.orderInRound);

        return (
          <section key={round.id} className="border border-white/12 p-4">
            <div className="flex flex-wrap items-center gap-3">
              <input
                className="focus-ring min-w-56 border border-white/15 bg-black px-3 py-2 font-display text-lg"
                defaultValue={round.name}
                onBlur={(e) => {
                  const next = e.target.value.trim();
                  if (next && next !== round.name) renameRound(round.id, next);
                }}
              />
              <span className="text-xs uppercase tracking-wider text-white/40">
                {round.kind}
              </span>
            </div>

            <div className="mt-4 space-y-3">
              {roundMatches.map((m) => {
                const p1 = m.participant1Id ? byId.get(m.participant1Id)?.name : "TBD";
                const p2 = m.participant2Id ? byId.get(m.participant2Id)?.name : "TBD";
                const localDate = m.scheduledAt
                  ? toLocalInputValue(m.scheduledAt)
                  : "";
                return (
                  <div
                    key={m.id}
                    className="grid gap-3 border border-white/8 bg-white/[0.02] p-3 lg:grid-cols-[1.2fr_0.7fr_1fr]"
                  >
                    <div>
                      <p className="text-sm">
                        {p1} <span className="text-white/35">vs</span> {p2}
                      </p>
                    </div>
                    <ScoreForm
                      score1={m.score1}
                      score2={m.score2}
                      disabled={!m.participant1Id || !m.participant2Id}
                      accent={accent}
                      onSave={(s1, s2) => saveScore(m.id, s1, s2)}
                    />
                    <ScheduleForm
                      scheduledAt={localDate}
                      venue={m.venue ?? ""}
                      onSave={(dt, venue) => saveSchedule(m.id, dt, venue)}
                    />
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function ScoreForm({
  score1,
  score2,
  disabled,
  accent,
  onSave,
}: {
  score1: number | null;
  score2: number | null;
  disabled: boolean;
  accent: string;
  onSave: (s1: number, s2: number) => void;
}) {
  const [s1, setS1] = useState(score1 ?? 0);
  const [s2, setS2] = useState(score2 ?? 0);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        type="number"
        min={0}
        className="focus-ring w-16 border border-white/15 bg-black px-2 py-1.5"
        value={s1}
        disabled={disabled}
        onChange={(e) => setS1(Number(e.target.value))}
      />
      <span className="text-white/40">:</span>
      <input
        type="number"
        min={0}
        className="focus-ring w-16 border border-white/15 bg-black px-2 py-1.5"
        value={s2}
        disabled={disabled}
        onChange={(e) => setS2(Number(e.target.value))}
      />
      <button
        type="button"
        disabled={disabled}
        onClick={() => onSave(s1, s2)}
        className="px-3 py-1.5 text-sm font-semibold text-black disabled:opacity-40"
        style={{ background: accent }}
      >
        Счёт
      </button>
    </div>
  );
}

function ScheduleForm({
  scheduledAt,
  venue,
  onSave,
}: {
  scheduledAt: string;
  venue: string;
  onSave: (dt: string | null, venue: string | null) => void;
}) {
  const [dt, setDt] = useState(scheduledAt);
  const [v, setV] = useState(venue);

  useEffect(() => {
    setDt(scheduledAt);
  }, [scheduledAt]);

  useEffect(() => {
    setV(venue);
  }, [venue]);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        type="datetime-local"
        className="focus-ring border border-white/15 bg-black px-2 py-1.5 text-sm"
        value={dt}
        onChange={(e) => setDt(e.target.value)}
      />
      <input
        placeholder="Площадка"
        className="focus-ring w-28 border border-white/15 bg-black px-2 py-1.5 text-sm"
        value={v}
        onChange={(e) => setV(e.target.value)}
      />
      <button
        type="button"
        onClick={() => onSave(dt || null, v.trim() || null)}
        className="border border-white/20 px-3 py-1.5 text-sm hover:bg-white/10"
      >
        Сохранить
      </button>
    </div>
  );
}
