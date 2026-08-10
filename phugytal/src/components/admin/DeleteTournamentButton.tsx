"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function DeleteTournamentButton({
  tournamentId,
  tournamentName,
  discipline,
  redirectTo,
}: {
  tournamentId: string;
  tournamentName: string;
  discipline: string;
  /** Where to go after delete. Defaults to discipline admin page. */
  redirectTo?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onDelete() {
    const ok = window.confirm(
      `Удалить сетку «${tournamentName}»?\nЭто действие нельзя отменить.`,
    );
    if (!ok) return;

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/tournaments/${tournamentId}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Не удалось удалить");
        return;
      }
      router.push(redirectTo ?? `/admin/d/${discipline}`);
      router.refresh();
    } catch {
      setError("Ошибка сети");
    } finally {
      setLoading(false);
    }
  }

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={onDelete}
        disabled={loading}
        className="text-sm text-[#FF006E] hover:underline disabled:opacity-50"
      >
        {loading ? "Удаляем…" : "Удалить сетку"}
      </button>
      {error ? <span className="text-xs text-[#FF006E]">{error}</span> : null}
    </span>
  );
}
