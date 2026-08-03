import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getMatch, getMe, getPredictionsMe, postPrediction } from "../api";
import { BrandBackdrop } from "../components/BrandBackdrop";
import { GemIcon } from "../components/GemIcon";
import { BottomNav } from "../components/BottomNav";
import { TeamLogo } from "../components/TeamLogo";
import { formatMatchWhen } from "../lib/format";
import { openTelegramExternalLink } from "../lib/telegramDialog";
import { predictionWinBonusForLevel } from "../lib/predictionLevelBonus";

export function MatchScreen({ isAdmin }: { isAdmin: boolean }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: match, isError, isLoading } = useQuery({
    queryKey: ["match", id],
    queryFn: () => getMatch(id!),
    enabled: !!id,
    retry: false,
  });
  const { data: myPreds } = useQuery({ queryKey: ["predictions-me"], queryFn: getPredictionsMe });
  const { data: me } = useQuery({ queryKey: ["me"], queryFn: getMe });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [doneUi, setDoneUi] = useState(false);

  const existing = useMemo(
    () => myPreds?.find((p) => p.match.id === id),
    [myPreds, id]
  );

  const predict = useMutation({
    mutationFn: async (optionId: string) => {
      const fresh = await getMatch(id!);
      if (Date.now() >= new Date(fresh.predictionEndsAt).getTime()) {
        throw new Error("Приём прогнозов закрыт");
      }
      try {
        return await postPrediction(id!, optionId);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "";
        if (msg.includes("Prediction window closed")) {
          throw new Error("Приём прогнозов закрыт");
        }
        throw e;
      }
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["predictions-me"] });
      void qc.invalidateQueries({ queryKey: ["me"] });
      void qc.invalidateQueries({ queryKey: ["tasks"] });
      void qc.invalidateQueries({ queryKey: ["match", id] });
      setDoneUi(true);
    },
  });

  if (isLoading) {
    return (
      <div className="relative flex min-h-[var(--app-h,100dvh)] flex-1 flex-col items-center justify-center p-6 text-[--text-muted]">
        <BrandBackdrop />
        <span className="relative z-[1]">Загрузка…</span>
      </div>
    );
  }

  if (isError || !match) {
    return (
      <div className="relative flex min-h-[var(--app-h,100dvh)] flex-1 flex-col items-center justify-center gap-4 p-6 text-center text-[--text-muted]">
        <BrandBackdrop />
        <p className="relative z-[1] text-sm">Матч не найден или удалён администратором.</p>
        <button
          type="button"
          className="relative z-[1] rounded border border-[--panel-border] bg-white/5 px-4 py-2 text-sm text-white"
          onClick={() => navigate("/")}
        >
          На главную
        </button>
      </div>
    );
  }

  const closed = Date.now() >= new Date(match.predictionEndsAt).getTime();
  const short = (s: string) => s.slice(0, 4).toUpperCase();
  const opts = match.options.slice(0, 2);
  const logoA = match.teamALogoUrl ?? null;
  const logoB = match.teamBLogoUrl ?? null;
  const effectiveSelected = existing?.optionId ?? selectedId;
  const canSubmit =
    effectiveSelected &&
    !existing &&
    !closed &&
    !predict.isPending &&
    !doneUi;

  const levelBonus = me ? predictionWinBonusForLevel(me.level) : 0;
  const totalIfWin = match.rewardGems + levelBonus;
  const streamHref = match.streamUrl?.trim() ?? "";

  return (
    <div className="relative flex min-h-0 w-full flex-1 flex-col">
      <BrandBackdrop />
      <div className="relative z-[1] flex min-h-0 flex-1 flex-col">
      <header className="sticky top-0 z-40 flex shrink-0 items-center justify-between border-b border-[--panel-border] bg-black/40 px-4 pb-4 pt-6 backdrop-blur-md">
        <button
          type="button"
          className="flex h-10 w-10 items-center justify-start text-[--text-muted] hover:text-white"
          aria-label="Назад"
          onClick={() => navigate(-1)}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 256 256">
            <path
              fill="currentColor"
              d="M224,128a8,8,0,0,1-8,8H59.31l58.35,58.34a8,8,0,0,1-11.32,11.32l-72-72a8,8,0,0,1,0-11.32l72-72a8,8,0,0,1,11.32,11.32L59.31,120H216A8,8,0,0,1,224,128Z"
            />
          </svg>
        </button>
        <div className="flex flex-col items-center">
          <h1 className="head-text flex items-center gap-2 text-lg tracking-wide text-white">
            {short(match.teamA)} <span className="text-sm text-[--accent]">VS</span> {short(match.teamB)}
          </h1>
          {match.status === "live" ? (
            <span className="match-live-badge mt-1 scale-90">LIVE</span>
          ) : null}
          <span className="text-[10px] font-medium uppercase tracking-wider text-[--text-muted]">
            {formatMatchWhen(match.startsAt)}
          </span>
          <span className="mt-0.5 max-w-[200px] text-center text-[9px] leading-tight text-[--text-muted]">
            Прогнозы до:{" "}
            {new Date(match.predictionEndsAt).toLocaleString("ru-RU", {
              day: "2-digit",
              month: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>
        <div className="w-10" />
      </header>

      <main className="flex flex-1 flex-col overflow-y-auto px-4 pb-[calc(200px+env(safe-area-inset-bottom,0px))] pt-6">
        <div className="mb-6 flex justify-center">
          <div className="flex items-center gap-2 rounded-sm border border-[--panel-border] bg-[--panel-bg] px-4 py-1.5 font-head text-[10px] uppercase tracking-widest text-[--text-muted] backdrop-blur-sm">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="12"
              height="12"
              viewBox="0 0 256 256"
              className="text-[--accent]"
            >
              <path
                fill="currentColor"
                d="M231.88,175.08A120.32,120.32,0,0,1,135,247.92a8,8,0,0,1-13.91,0A120.32,120.32,0,0,1,24.12,175.08a8,8,0,0,1,3.46-10.45l22.25-11.59a93.2,93.2,0,0,1,4.78-75L35,54.8a8,8,0,0,1,8.35-11.55l24.4,4.28a96,96,0,0,1,120.57,0l24.4-4.28a8,8,0,0,1,8.35,11.55l-19.55,23.27a93.2,93.2,0,0,1,4.78,75l22.25,11.59A8,8,0,0,1,231.88,175.08Z"
              />
            </svg>
            Комната матча
          </div>
        </div>

        {streamHref ? (
          <div className="mb-5 flex justify-center px-2">
            <button
              type="button"
              className="match-stream-btn flex w-full max-w-sm items-center justify-center gap-2 rounded-[--radius-sm] border border-[--accent]/45 bg-[--accent]/15 py-3 font-head text-[12px] font-bold uppercase tracking-widest text-[--accent] transition duration-200 hover:bg-[--accent]/28 active:scale-[0.98]"
              onClick={() => openTelegramExternalLink(streamHref)}
            >
              <svg
                className="match-stream-btn__icon"
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 256 256"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M240,128a15.74,15.74,0,0,1-7.6,13.51L88.32,229.65a16,16,0,0,1-16.2.3A15.86,15.86,0,0,1,64,216.13V39.87a15.86,15.86,0,0,1,8.12-13.82,16,16,0,0,1,16.2.3L232.4,114.49A15.74,15.74,0,0,1,240,128Z" />
              </svg>
              Смотреть стрим
            </button>
          </div>
        ) : null}

        <div className="mb-10 flex items-center justify-between px-2">
          <div className="flex w-[100px] flex-col items-center gap-3">
            <TeamLogo name={match.teamA} logoUrl={logoA} size="lg" tintClass="bg-[#FFD700]/10 text-[#FFD700]" />
            <span className="text-center text-[13px] font-medium leading-tight text-[--text-main]">
              {match.teamA}
            </span>
          </div>
          <div className="flex flex-col items-center justify-center">
            <span className="mb-1 rounded-sm bg-black/50 px-2 py-0.5 font-head text-[11px] uppercase tracking-widest text-[--text-muted]">
              BO3
            </span>
            <span className="font-head text-4xl font-bold text-[--accent] drop-shadow-[0_0_12px_rgba(233,141,43,0.5)]">
              VS
            </span>
          </div>
          <div className="flex w-[100px] flex-col items-center gap-3">
            <TeamLogo name={match.teamB} logoUrl={logoB} size="lg" tintClass="bg-[#E4002B]/10 text-[#E4002B]" />
            <span className="text-center text-[13px] font-medium leading-tight text-[--text-main]">
              {match.teamB}
            </span>
          </div>
        </div>

        <div className="mb-8 h-px w-full bg-gradient-to-r from-transparent via-[--panel-border] to-transparent" />

        <div className="flex flex-col gap-5">
          <div className="flex flex-col items-center gap-1 px-4 text-center">
            <h2 className="head-text text-xl text-white">Сделайте прогноз</h2>
            <p className="text-xs leading-relaxed text-[--text-muted]">
              Выберите команду-победителя.
              <br />
              За верный прогноз вы получите гемы!
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {opts.map((o) => {
              const sel = effectiveSelected === o.id;
              return (
                <button
                  key={o.id}
                  type="button"
                  disabled={!!existing || closed || doneUi}
                  className={`prediction-card relative flex flex-col items-center justify-center gap-2 p-4 ${sel ? "selected" : ""}`}
                  onClick={() => !existing && !closed && setSelectedId(o.id)}
                >
                  <div className="check-icon absolute right-2 top-2 text-[--accent]">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 256 256">
                      <path
                        fill="currentColor"
                        d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm45.66,85.66-56,56a8,8,0,0,1-11.32,0l-24-24a8,8,0,0,1,11.32-11.32L112,148.69l50.34-50.35a8,8,0,0,1,11.32,11.32Z"
                      />
                    </svg>
                  </div>
                  <span className="mt-1 font-head text-xl tracking-wide text-white">{o.label}</span>
                  <div
                    className={`h-px w-8 ${sel ? "bg-[--accent]/30" : "bg-[--panel-border]"} transition-colors`}
                  />
                  <div className="flex flex-col items-center">
                    <span className="mb-0.5 text-[10px] uppercase tracking-wider text-[--text-muted]">
                      При победе
                    </span>
                    <div className="flex flex-col items-center gap-0.5 text-[--accent]">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-bold">+{totalIfWin}</span>
                        <GemIcon size={14} />
                      </div>
                      <span className="text-[9px] font-medium text-[--text-muted]">
                        база {match.rewardGems} + уровень {levelBonus}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {closed ? (
            <p className="text-center text-xs text-[--accent]">Приём прогнозов закрыт</p>
          ) : null}
          {existing ? (
            <p className="text-center text-xs text-[--text-muted]">
              Ваш прогноз: <span className="text-[--accent]">{existing.optionLabel}</span>
            </p>
          ) : null}
          {predict.isError ? (
            <p className="text-center text-xs text-red-400">{(predict.error as Error).message}</p>
          ) : null}

          <div className="mt-2 flex items-start gap-3 rounded-r-md border-l-2 border-[--panel-border] bg-white/[0.02] p-3">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 256 256"
              className="mt-0.5 shrink-0 text-[--text-muted]"
            >
              <path
                fill="currentColor"
                d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm0,192a88,88,0,1,1,88-88A88.1,88.1,0,0,1,128,216Zm16-40a8,8,0,0,1-8,8,16,16,0,0,1-16-16V128a8,8,0,0,1,0-16,16,16,0,0,1,16,16v40A8,8,0,0,1,144,176ZM112,84a12,12,0,1,1,12,12A12,12,0,0,1,112,84Z"
              />
            </svg>
            <p className="text-[11px] leading-relaxed text-[--text-muted]">
              В случае неверного прогноза ваш баланс не уменьшается.
            </p>
          </div>
        </div>
      </main>
      </div>

      <div className="pointer-events-none fixed bottom-0 left-1/2 z-50 flex w-full max-w-md -translate-x-1/2 flex-col bg-transparent shadow-[0_-12px_40px_rgba(0,0,0,0.2)]">
        <div className="pointer-events-none h-8 w-full shrink-0 bg-gradient-to-t from-black/30 via-black/5 to-transparent" />
        <div className="pointer-events-auto relative z-[3] px-4 pb-2 pt-1">
          <button
            type="button"
            disabled={!canSubmit}
            className={`btn-confirm ${canSubmit ? "ready" : ""} ${doneUi || existing ? "success" : ""}`}
            onClick={() => {
              if (effectiveSelected && canSubmit) predict.mutate(effectiveSelected);
            }}
          >
            {doneUi || existing
              ? "ПРОГНОЗ ПРИНЯТ"
              : predict.isPending
                ? "ОБРАБОТКА…"
                : "Подтвердить прогноз"}
          </button>
        </div>
        <div className="pointer-events-auto">
          <BottomNav isAdmin={isAdmin} layout="embedded" />
        </div>
      </div>
    </div>
  );
}
