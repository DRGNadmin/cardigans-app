import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { claimTask, getMe, getTasks } from "../api";
import { BrandBackdrop } from "../components/BrandBackdrop";
import { GemIcon } from "../components/GemIcon";
import { TaskTypeIcon } from "../components/TaskTypeIcon";
import { formatGems } from "../lib/format";

function formatCooldownUntil(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return null;
  const h = Math.floor(ms / 3600000);
  const min = Math.max(1, Math.ceil(ms / 60000));
  if (h >= 1) return `Снова через ~${h} ч`;
  return `Снова через ~${min} мин`;
}

function taskSubtitle(t: {
  description: string | null;
  type: string;
  targetCount: number | null;
  game: string | null;
}): string {
  if (t.description?.trim()) return t.description;
  if (t.type === "predictions_count") return `Сделайте ${t.targetCount ?? 1} прогнозов на матчи`;
  if (t.type === "predictions_game") {
    const g = t.game === "DOTA2" ? "Dota 2" : t.game === "CS2" ? "CS2" : "игру";
    return `Сделайте ${t.targetCount ?? 1} прогнозов на матчи ${g}`;
  }
  if (t.type === "trade_url") return "Укажите Trade URL в профиле.";
  if (t.type === "onboarding") return "Выполните условие один раз.";
  if (t.type === "weekly_streak") return "7 дней подряд (UTC). Пропуск — сброс.";
  if (t.type === "correct_streak") return "Верные исходы подряд после завершения матчей.";
  if (t.type === "daily_login") return "Награда раз в 24 часа.";
  return "Выполните условия задания";
}

export function TasksScreen() {
  const qc = useQueryClient();
  const { data: me } = useQuery({ queryKey: ["me"], queryFn: getMe });
  const { data: tasks } = useQuery({ queryKey: ["tasks"], queryFn: getTasks });

  const sortedTasks = useMemo(() => {
    if (!tasks?.length) return [];
    const priority = (type: string) => {
      if (type === "daily_login") return 0;
      if (type === "weekly_streak") return 1;
      return 2;
    };
    return [...tasks]
      .map((t, index) => ({ t, index }))
      .sort((a, b) => {
        const pa = priority(a.t.type);
        const pb = priority(b.t.type);
        if (pa !== pb) return pa - pb;
        if (pa === 2) {
          if (a.t.claimed !== b.t.claimed) return a.t.claimed ? 1 : -1;
        }
        return a.index - b.index;
      })
      .map(({ t }) => t);
  }, [tasks]);

  const claim = useMutation({
    mutationFn: (taskId: string) => claimTask(taskId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["tasks"] });
      void qc.invalidateQueries({ queryKey: ["me"] });
    },
  });

  return (
    <div className="relative flex min-h-0 w-full flex-1 flex-col overflow-hidden">
      <BrandBackdrop />
      <div className="relative z-[1] flex min-h-0 flex-1 flex-col overflow-hidden">
      <header className="shrink-0 flex flex-col gap-4 border-b border-[--panel-border] bg-black/50 px-4 pb-5 pt-10 backdrop-blur-xl">
        <div className="flex items-center justify-between">
          <h1 className="head-text flex items-center gap-2 text-2xl tracking-wider text-white">Задания</h1>
          <div className="flex items-center gap-1.5 rounded-full border border-[--accent]/30 bg-black/40 px-3 py-1.5 shadow-[0_0_15px_rgba(233,141,43,0.1)]">
            <span className="text-sm font-bold tracking-wide text-[--accent]">
              {me != null ? formatGems(me.gemsBalance) : "—"}
            </span>
            <GemIcon size={14} className="text-[--accent]" />
          </div>
        </div>
      </header>

      <main className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 pb-28 pt-2">
        {sortedTasks.map((t) => {
          const pct =
            t.targetCount != null
              ? Math.min(100, (t.progress / Math.max(t.targetCount, 1)) * 100)
              : t.completed
                ? 100
                : 0;
          const showProgress = t.targetCount != null && !t.claimed;
          const canClaim = t.completed && !t.claimed;
          const isManual = t.type === "manual";
          const cooldownHint = t.type === "daily_login" ? formatCooldownUntil(t.cooldownUntil) : null;
          const isDaily = t.type === "daily_login";
          const isWeekly = t.type === "weekly_streak";

          return (
            <div
              key={t.id}
              className={`relative flex gap-3 rounded-[--radius-md] border p-3 transition-all duration-200 motion-reduce:transition-colors ${
                isDaily
                  ? "border-[--accent]/55 bg-gradient-to-br from-amber-500/20 via-[--panel-bg] to-[--panel-bg] shadow-[0_0_28px_rgba(233,141,43,0.14)] ring-1 ring-inset ring-[--accent]/30"
                  : isWeekly
                    ? "border-amber-500/25 bg-[--panel-bg] ring-1 ring-inset ring-amber-500/15"
                    : "border-[--panel-border] bg-[--panel-bg]"
              } ${
                canClaim
                  ? isDaily
                    ? "cursor-pointer hover:-translate-y-0.5 hover:shadow-[0_8px_28px_rgba(233,141,43,0.18)] hover:ring-[--accent]/45 active:translate-y-0 active:scale-[0.99] motion-reduce:hover:translate-y-0 motion-reduce:active:scale-100"
                    : "cursor-pointer hover:-translate-y-0.5 hover:border-[--accent]/50 hover:shadow-[0_8px_24px_rgba(0,0,0,0.25)] active:translate-y-0 active:scale-[0.99] motion-reduce:hover:translate-y-0 motion-reduce:active:scale-100"
                  : ""
              }`}
            >
              <div
                className={`glass-plaque flex h-12 w-12 shrink-0 items-center justify-center text-[--accent] shadow-[inset_0_0_12px_rgba(233,141,43,0.1)] [border-color:rgba(233,141,43,0.28)] ${
                  isDaily ? "shadow-[inset_0_0_16px_rgba(233,141,43,0.22)] [border-color:rgba(233,141,43,0.45)]" : ""
                }`}
              >
                <TaskTypeIcon type={t.type} />
              </div>
              <div className="flex min-w-0 flex-1 flex-col">
                <div className="flex flex-wrap items-center gap-2 gap-y-1">
                  {isDaily ? (
                    <span className="shrink-0 rounded-sm border border-[--accent]/40 bg-[--accent]/25 px-2 py-0.5 font-head text-[9px] font-bold uppercase tracking-widest text-[--accent] shadow-[0_0_12px_rgba(233,141,43,0.25)]">
                      Сегодня
                    </span>
                  ) : null}
                  {isWeekly ? (
                    <span className="shrink-0 rounded-sm border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 font-head text-[9px] font-bold uppercase tracking-widest text-amber-400/95">
                      7 дней
                    </span>
                  ) : null}
                  <span className="min-w-0 truncate font-head text-[15px] tracking-wide text-white">{t.title}</span>
                </div>
                <span className="mt-0.5 line-clamp-4 text-[11px] leading-tight text-[--text-muted]">
                  {taskSubtitle(t)}
                </span>
              </div>
              <div className="flex min-w-[60px] shrink-0 flex-col items-end justify-center border-l border-[--panel-border] pl-2">
                <div className="flex items-center gap-1 text-[--accent]">
                  <span className="text-sm font-bold">+{t.rewardGems}</span>
                  <GemIcon size={12} />
                </div>
                {showProgress ? (
                  <>
                    <span className="mt-1 rounded border border-[--panel-border] bg-white/5 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[--text-muted]">
                      {t.progress}/{t.targetCount}
                    </span>
                    <div className="mt-2 flex w-full max-w-[120px] items-center gap-3">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full border border-[--panel-border]/50 bg-black/80">
                        <div className="h-full rounded-full bg-[--accent]" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  </>
                ) : null}
                {canClaim ? (
                  <button
                    type="button"
                    className="mt-1.5 rounded px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-black shadow-[0_0_10px_rgba(233,141,43,0.3)] transition-all hover:brightness-110 active:scale-95 bg-[--accent]"
                    disabled={claim.isPending}
                    onClick={() => claim.mutate(t.id)}
                  >
                    Забрать
                  </button>
                ) : null}
                {t.claimed ? (
                  <span className="mt-1 text-center text-[9px] font-bold uppercase text-green-400">
                    Получено
                    {cooldownHint ? (
                      <span className="mt-0.5 block font-body font-medium normal-case text-[--text-muted]">
                        {cooldownHint}
                      </span>
                    ) : null}
                  </span>
                ) : null}
                {!canClaim && !showProgress && !t.claimed && isManual ? (
                  <span className="mt-1 text-[9px] font-bold uppercase text-[--text-muted]">Ожидание</span>
                ) : null}
                {!canClaim && !showProgress && !t.claimed && !isManual && !t.completed ? (
                  <button
                    type="button"
                    className="mt-1.5 rounded px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-black opacity-50 bg-[--accent]"
                    disabled
                  >
                    В процессе
                  </button>
                ) : null}
              </div>
            </div>
          );
        })}
      </main>
      </div>
    </div>
  );
}
