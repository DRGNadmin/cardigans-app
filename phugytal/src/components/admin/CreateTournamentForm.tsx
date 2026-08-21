"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { FORMAT_LABELS, getPreset, type Format, type SeedingMode } from "@/lib/brackets";

const FORMATS = Object.keys(FORMAT_LABELS) as Format[];

export function CreateTournamentForm({
  discipline,
  accent,
}: {
  discipline: string;
  accent: string;
}) {
  const router = useRouter();
  const preset = getPreset(discipline);
  const [name, setName] = useState(`${discipline.toUpperCase()} Bracket`);
  const [usePreset, setUsePreset] = useState(true);
  const [format, setFormat] = useState<Format>("GROUPS_PLAYOFFS");
  const [seedingMode, setSeedingMode] = useState<SeedingMode>("snake");
  const [streamUrl, setStreamUrl] = useState("");
  const defaultCount = preset
    ? preset.groupCount * Math.max(2, preset.groupSizeHint)
    : 8;
  const [participantsText, setParticipantsText] = useState(
    Array.from({ length: defaultCount }, (_, i) => `Участник ${i + 1}`).join(
      "\n",
    ),
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
          format: usePreset ? "GROUPS_PLAYOFFS" : format,
          seedingMode,
          participants,
          streamUrl: streamUrl || undefined,
          useDisciplinePreset: usePreset,
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
      {preset ? (
        <label className="flex items-start gap-3 text-sm text-white/80">
          <input
            type="checkbox"
            className="mt-1"
            checked={usePreset}
            onChange={(e) => setUsePreset(e.target.checked)}
          />
          <span>
            Пресет дисциплины:{" "}
            <span style={{ color: accent }}>{preset.label}</span>
          </span>
        </label>
      ) : null}

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
        Ссылка на стрим (общая)
        <input
          className="focus-ring mt-2 w-full border border-white/15 bg-black px-3 py-2.5"
          value={streamUrl}
          onChange={(e) => setStreamUrl(e.target.value)}
          placeholder="https://..."
        />
      </label>

      {!usePreset ? (
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
      ) : null}

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
        className="focus-ring rounded-2xl px-5 py-3 text-sm font-semibold uppercase tracking-wider text-black disabled:opacity-40"
        style={{ background: accent }}
      >
        {loading ? "Создаём…" : "Создать турнир"}
      </button>
    </form>
  );
}
