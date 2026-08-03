import { useCallback, useEffect, useLayoutEffect, useState, type MouseEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useLevelRanksModal } from "../context/LevelRanksModalContext";

const SELECTORS = [
  null,
  '[data-tour="nav-home"]',
  '[data-tour="nav-tasks"]',
  '[data-tour="nav-shop"]',
  '[data-tour="nav-profile"]',
  '[data-tour="level-badge"]',
] as const;

const COPY: { title: string; body: string }[] = [
  {
    title: "Добро пожаловать",
    body: "Brand Battle — прогнозы на матчи, задания за гемы и магазин призов. Коротко покажем основные разделы.",
  },
  {
    title: "Матчи",
    body: "Главный экран: расписание матчей и прогнозы исходов.",
  },
  {
    title: "Задания",
    body: "Выполняйте задания и получайте Cardigans Gems.",
  },
  {
    title: "Магазин",
    body: "Обменивайте гемы на цифровые призы.",
  },
  {
    title: "Профиль",
    body: "Настройки, баланс и история операций.",
  },
  {
    title: "Уровень",
    body: "Ваш ранг и прогресс до следующего уровня. Нажмите на блок или откройте полный список рангов.",
  },
];

const PANEL =
  "rounded border border-[--panel-border] bg-[#111111] shadow-[0_8px_32px_rgba(0,0,0,0.92)]";

type Props = {
  onComplete: () => void;
};

export function OnboardingOverlay({ onComplete }: Props) {
  const navigate = useNavigate();
  const { openLevelsModal, levelsModalOpen } = useLevelRanksModal();
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);

  const updateRect = useCallback(() => {
    if (step === 0) {
      setRect(null);
      return;
    }
    const sel = SELECTORS[step];
    if (!sel) {
      setRect(null);
      return;
    }
    const el = document.querySelector(sel);
    setRect(el?.getBoundingClientRect() ?? null);
  }, [step]);

  useLayoutEffect(() => {
    updateRect();
  }, [updateRect]);

  useEffect(() => {
    window.addEventListener("resize", updateRect);
    window.addEventListener("scroll", updateRect, true);
    return () => {
      window.removeEventListener("resize", updateRect);
      window.removeEventListener("scroll", updateRect, true);
    };
  }, [updateRect]);

  useEffect(() => {
    if (step >= 1) navigate("/");
  }, [step, navigate]);

  const maxStep = COPY.length - 1;
  const isLast = step >= maxStep;

  const next = useCallback(() => {
    if (isLast) {
      onComplete();
      return;
    }
    setStep((s) => s + 1);
  }, [isLast, onComplete]);

  /** Пока открыта модалка уровней — не рисуем онбординг, чтобы плашки не перекрывали друг друга */
  if (levelsModalOpen) return null;

  const onOverlayClick = (e: MouseEvent) => {
    if ((e.target as HTMLElement).closest("[data-onboarding-stop]")) return;
    next();
  };

  const pad = 8;
  const spotlight =
    rect != null ? (
      <div
        className="pointer-events-none fixed z-[801] rounded-xl border-2 border-[--accent] shadow-[0_0_0_9999px_rgba(0,0,0,0.72),0_0_24px_rgba(233,141,43,0.35)]"
        style={{
          left: rect.left - pad,
          top: rect.top - pad,
          width: rect.width + pad * 2,
          height: rect.height + pad * 2,
        }}
      />
    ) : null;

  const tooltipPos =
    rect != null && step >= 1
      ? (() => {
          const belowNav = rect.top > window.innerHeight * 0.45;
          const cardW = Math.min(320, window.innerWidth - 32);
          const left = Math.max(16, Math.min(window.innerWidth - cardW - 16, rect.left + rect.width / 2 - cardW / 2));
          if (belowNav) {
            return { left, top: rect.top - 12, transform: "translateY(-100%)" as const, arrow: "bottom" as const };
          }
          return { left, top: rect.bottom + 12, transform: "none" as const, arrow: "top" as const };
        })()
      : null;

  const c = COPY[step]!;

  return (
    <div
      className="fixed inset-0 z-[800] flex cursor-pointer flex-col touch-manipulation"
      onClick={onOverlayClick}
      role="presentation"
      aria-label="Онбординг: нажмите на экран для продолжения"
    >
      {step === 0 ? (
        <div className="pointer-events-none absolute inset-0 bg-black/75" aria-hidden />
      ) : (
        <div className="pointer-events-none absolute inset-0 bg-black/45" aria-hidden />
      )}
      {spotlight}

      {step === 0 ? (
        <div className="pointer-events-none relative z-[802] flex flex-1 flex-col items-center justify-center p-6">
          <div className={`w-full max-w-sm p-5 ${PANEL}`}>
            <h2 className="head-text mb-2 text-center text-lg text-[--text-main]">{c.title}</h2>
            <p className="text-center text-sm leading-relaxed text-[#c4c4c4]">{c.body}</p>
          </div>
        </div>
      ) : (
        <>
          {tooltipPos != null ? (
            <div
              className={`pointer-events-none fixed z-[802] w-[min(320px,calc(100vw-32px))] p-4 ${PANEL}`}
              style={{
                left: tooltipPos.left,
                top: tooltipPos.top,
                transform: tooltipPos.transform,
              }}
            >
              {tooltipPos.arrow === "top" ? (
                <div
                  className={`pointer-events-none absolute -top-2 left-1/2 h-4 w-4 -translate-x-1/2 rotate-45 border-l border-t border-[--panel-border] bg-[#111111]`}
                />
              ) : (
                <div
                  className={`pointer-events-none absolute -bottom-2 left-1/2 h-4 w-4 -translate-x-1/2 rotate-45 border-r border-b border-[--panel-border] bg-[#111111]`}
                />
              )}
              <h3 className="head-text mb-1.5 text-base text-[--text-main]">{c.title}</h3>
              <p className="text-sm leading-relaxed text-[#c4c4c4]">{c.body}</p>
              {step === 5 ? (
                <button
                  type="button"
                  data-onboarding-stop
                  className="pointer-events-auto mt-3 w-full rounded border border-[--accent] bg-[#1a1a1a] py-2 font-head text-xs font-bold uppercase text-[--accent]"
                  onClick={(e) => {
                    e.stopPropagation();
                    openLevelsModal();
                  }}
                >
                  Открыть список уровней
                </button>
              ) : null}
            </div>
          ) : (
            <div
              className={`pointer-events-none fixed bottom-28 left-1/2 z-[802] w-[min(320px,calc(100vw-32px))] -translate-x-1/2 p-4 ${PANEL}`}
            >
              <h3 className="head-text mb-1.5 text-base text-[--text-main]">{c.title}</h3>
              <p className="text-sm leading-relaxed text-[#c4c4c4]">{c.body}</p>
              {step === 5 ? (
                <button
                  type="button"
                  data-onboarding-stop
                  className="pointer-events-auto mt-3 w-full rounded border border-[--accent] bg-[#1a1a1a] py-2 font-head text-xs font-bold uppercase text-[--accent]"
                  onClick={(e) => {
                    e.stopPropagation();
                    openLevelsModal();
                  }}
                >
                  Открыть список уровней
                </button>
              ) : null}
            </div>
          )}
        </>
      )}

      <p className="pointer-events-none absolute bottom-0 left-0 right-0 z-[803] select-none px-6 pb-safe pt-2 text-center text-[11px] text-[#888]">
        {isLast ? "Нажмите на экран, чтобы завершить" : "Нажмите на экран, чтобы продолжить"}
      </p>
    </div>
  );
}
