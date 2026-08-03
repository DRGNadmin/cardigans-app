import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getMatches, getMe, getPredictionsMe } from "../api";
import { GemIcon } from "../components/GemIcon";
import { formatGems, formatMatchWhen } from "../lib/format";
import { timeGreetingPrefix } from "../lib/greeting";
import { BrandBackdrop } from "../components/BrandBackdrop";
import { SadEmptyState } from "../components/SadEmptyState";
import { PREVIEW_USER_LIST, ShowMoreRow } from "../components/ShowMoreRow";
import { LevelProgress } from "../components/LevelProgress";
import { TeamLogo } from "../components/TeamLogo";
import { useLevelRanksModal } from "../context/LevelRanksModalContext";

type Tab = "all" | "CS2" | "DOTA2";

function tag(game: string) {
  if (game === "DOTA2") return { label: "Dota 2", className: "font-bold text-[#FF4500]" };
  return { label: "CS2", className: "font-bold text-[--accent]" };
}

export function HomeScreen() {
  const navigate = useNavigate();
  const { openLevelsModal } = useLevelRanksModal();
  const [tab, setTab] = useState<Tab>("all");
  const [expandMatches, setExpandMatches] = useState(false);
  const { data: me } = useQuery({ queryKey: ["me"], queryFn: getMe });
  const { data: myPreds } = useQuery({ queryKey: ["predictions-me"], queryFn: getPredictionsMe });
  const { data: matches, isSuccess: matchesLoaded } = useQuery({
    queryKey: ["matches", tab],
    queryFn: () => getMatches(tab === "all" ? undefined : tab),
  });

  useEffect(() => {
    setExpandMatches(false);
  }, [tab]);

  const matchList = matches ?? [];
  const visibleMatches =
    expandMatches || matchList.length <= PREVIEW_USER_LIST
      ? matchList
      : matchList.slice(0, PREVIEW_USER_LIST);

  return (
    <div className="relative flex min-h-0 w-full flex-1 flex-col overflow-hidden">
      <BrandBackdrop />
      <div className="relative z-[1] flex min-h-0 flex-1 flex-col overflow-hidden">
      <header className="shrink-0 space-y-4 px-4 pb-4 pt-6">
        <div className="glass-plaque px-4 py-3.5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1 flex flex-col gap-0.5">
              <span className="text-sm text-[--text-muted]">{timeGreetingPrefix()}</span>
              <h1 className="head-text text-xl">
                {me?.firstName ?? (me?.username ? `@${me.username}` : "Игрок")}!
              </h1>
            </div>
            {me != null ? (
              <button
                type="button"
                data-tour="level-badge"
                className="-m-1 shrink-0 rounded border border-transparent p-1 text-left transition-all duration-150 hover:border-[--accent]/40 hover:bg-white/5 active:scale-[0.97] motion-reduce:active:scale-100"
                onClick={() => openLevelsModal()}
                aria-label="Показать все уровни и ранги"
              >
                <LevelProgress
                  level={me.level}
                  progressPct={me.levelProgressPct}
                  xpToNextLevel={me.xpToNextLevel}
                />
              </button>
            ) : null}
          </div>
        </div>
        <div className="glass-plaque px-4 py-3.5">
          <span className="mb-2 block font-head text-[11px] uppercase tracking-widest text-[--text-muted]">
            Ваш баланс
          </span>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center text-[--accent] drop-shadow-[0_0_8px_rgba(233,141,43,0.4)]">
              <GemIcon size={32} />
            </div>
            <div className="flex flex-col leading-none">
              <span className="font-head text-2xl font-bold tracking-wide text-[--text-main]">
                {me != null ? formatGems(me.gemsBalance) : "—"}
              </span>
              <span className="font-head text-[10px] uppercase tracking-widest text-[--accent]">
                Cardigans Gems
              </span>
            </div>
          </div>
        </div>
      </header>

      <div className="mb-4 shrink-0 px-4">
        <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
          {(
            [
              ["all", "Все матчи"],
              ["CS2", "CS2"],
              ["DOTA2", "Dota 2"],
            ] as const
          ).map(([k, label]) => (
            <button
              key={k}
              type="button"
              className={`tab-btn tab-btn--press shrink-0 ${tab === k ? "active" : ""}`}
              onClick={() => setTab(k)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <main className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 pb-28">
        {matchesLoaded && (matches?.length ?? 0) === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center py-12 min-h-[min(360px,50dvh)]">
            <SadEmptyState message="Матчей нет" />
          </div>
        ) : (
        <div className="flex flex-col gap-3">
        {visibleMatches.map((m) => {
          const g = tag(m.game);
          const existingPred = myPreds?.find((p) => p.match.id === m.id);
          const isLive = m.status === "live";
          const isFinished = m.status === "finished";
          const statusMod = isLive ? "rule-card--live" : isFinished ? "rule-card--finished" : "";
          return (
            <article key={m.id} className={`rule-card ${statusMod}`.trim()}>
              <header className="flex items-center justify-between border-b border-[--panel-border] bg-black/40 px-4 py-2">
                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                  {isLive ? (
                    <span className="match-live-badge shrink-0" aria-label="Идёт матч">
                      LIVE
                    </span>
                  ) : null}
                  <span className={`text-[11px] uppercase tracking-wider ${g.className}`}>{g.label}</span>
                  <span className="text-[11px] uppercase tracking-wider text-[--text-muted]">Турнир</span>
                </div>
                <div className="font-head text-[12px] tracking-wider text-[--text-main]">
                  {formatMatchWhen(m.startsAt)}
                </div>
              </header>
              <div className="flex flex-col gap-4 p-4">
                <div className="grid grid-cols-3 items-center gap-2">
                  <div className="flex flex-col items-center gap-2">
                    <TeamLogo name={m.teamA} logoUrl={m.teamALogoUrl} size="sm" tintClass="bg-[#FFD700]/10 text-[#FFD700]" />
                    <span className="w-full truncate text-center text-[11px] font-medium text-[--text-main]">
                      {m.teamA}
                    </span>
                  </div>
                  <div className="flex h-full flex-col items-center justify-center">
                    <span className="mb-1 font-head text-[10px] uppercase tracking-widest text-[--text-muted]">
                      BO3
                    </span>
                    <span className="font-head text-xl font-bold text-[--accent]">VS</span>
                  </div>
                  <div className="flex flex-col items-center gap-2">
                    <TeamLogo name={m.teamB} logoUrl={m.teamBLogoUrl} size="sm" tintClass="bg-[#E4002B]/10 text-[#E4002B]" />
                    <span className="w-full truncate text-center text-[11px] font-medium text-[--text-main]">
                      {m.teamB}
                    </span>
                  </div>
                </div>
                {existingPred ? (
                  <button
                    type="button"
                    className="flex w-full flex-col items-center justify-center gap-1 rounded-md border border-green-500/40 bg-green-500/[0.12] py-3 shadow-[0_0_20px_rgba(34,197,94,0.08)] transition-all duration-150 hover:border-green-500/55 hover:bg-green-500/[0.18] active:scale-[0.985] motion-reduce:active:scale-100"
                    onClick={() => navigate(`/matches/${m.id}`)}
                  >
                    <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-green-400/95">
                      Вы выбрали
                    </span>
                    <span className="px-2 text-center font-head text-[15px] font-semibold leading-tight tracking-wide text-white">
                      {existingPred.optionLabel}
                    </span>
                  </button>
                ) : (
                  <button
                    type="button"
                    className="predict-btn"
                    onClick={() => navigate(`/matches/${m.id}`)}
                  >
                    Сделать прогноз
                  </button>
                )}
              </div>
            </article>
          );
        })}
        {matchList.length > PREVIEW_USER_LIST ? (
          <ShowMoreRow
            expanded={expandMatches}
            onToggle={() => setExpandMatches((v) => !v)}
            totalHidden={expandMatches ? 0 : matchList.length - PREVIEW_USER_LIST}
          />
        ) : null}
        </div>
        )}
      </main>
      </div>
    </div>
  );
}
