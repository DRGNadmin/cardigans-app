"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { FORMAT_LABELS, type Format, type SeedingMode } from "@/lib/brackets";

const FORMATS = Object.keys(FORMAT_LABELS) as Format[];

export function CreateTournamentForm({
  discipline,
  accent,
}: {
  discipline: string;
  accent: string;
}) {
  const router = useRouter();
  const [name, setName] = useState(`${discipline.toUpperCase()} Bracket`);
  const [format, setFormat] = useState<Format>("SINGLE_ELIMINATION");
  const [seedingMode, setSeedingMode] = useState<SeedingMode>("order");
  const [participantsText, setParticipantsText] = useState(
    "Team Alpha\nTeam Bravo\nTeam Charlie\nTeam Delta\nTeam Echo\nTeam Foxtrot\nTeam Golf\nTeam Hotel",
  );
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const participants = useMemo(
    () =>
      participantsText
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean),
    [participantsText],
  );

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/tournaments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          discipline,
          name,
          format,
          seedingMode,
          participants,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Ошибка создания");
        return;
      }
      router.push(`/admin/tournaments/${data.tournament.id}`);
      router.refresh();
    } catch {
      setError("Ошибка сети");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-4 space-y-4 border border-white/12 p-5">
      <label className="block text-sm text-white/70">
        Название
        <input
          className="focus-ring mt-2 w-full border border-white/15 bg-black px-3 py-2.5"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </label>

      <label className="block text-sm text-white/70">
        Формат
        <select
          className="focus-ring mt-2 w-full border border-white/15 bg-black px-3 py-2.5"
          value={format}
          onChange={(e) => setFormat(e.target.value as Format)}
        >
          {FORMATS.map((f) => (
            <option key={f} value={f}>
              {FORMAT_LABELS[f]}
            </option>
          ))}
        </select>
      </label>

      <label className="block text-sm text-white/70">
        Посев
        <select
          className="focus-ring mt-2 w-full border border-white/15 bg-black px-3 py-2.5"
          value={seedingMode}
          onChange={(e) => setSeedingMode(e.target.value as SeedingMode)}
        >
          <option value="manual">Ручной (как в списке)</option>
          <option value="order">По порядку списка</option>
          <option value="random">Случайный</option>
          <option value="snake">Snake</option>
        </select>
      </label>

      <label className="block text-sm text-white/70">
        Участники (по одному на строку) — {participants.length}
        <textarea
          className="focus-ring mt-2 min-h-40 w-full border border-white/15 bg-black px-3 py-2.5 font-mono text-sm"
          value={participantsText}
          onChange={(e) => setParticipantsText(e.target.value)}
          required
        />
      </label>

      {error ? <p className="text-sm text-[#FF006E]">{error}</p> : null}

      <button
        type="submit"
        disabled={loading || participants.length < 2}
        className="focus-ring px-5 py-3 font-semibold text-black disabled:opacity-50"
        style={{ background: accent }}
      >
        {loading ? "Создаём…" : "Создать сетку"}
      </button>
    </form>
  );
}
