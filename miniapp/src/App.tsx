import { useEffect, useLayoutEffect, useState, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getMe, getToken } from "./api";
import { AnimatedRoutes } from "./components/AnimatedRoutes";
import { BrandBackdrop } from "./components/BrandBackdrop";
import { SplashScreen } from "./components/SplashScreen";
import { BottomNav } from "./components/BottomNav";
import { OnboardingOverlay } from "./components/OnboardingOverlay";
import { LevelUpCelebrationProvider } from "./context/LevelUpCelebrationContext";
import { LevelRanksModalProvider } from "./context/LevelRanksModalContext";
import { useTelegramAuth } from "./hooks/useTelegramAuth";
import {
  isOnboardingDone,
  isTermsAccepted,
  resetWelcomeFlow,
  setOnboardingDone,
  setTermsAccepted,
} from "./lib/appStorage";
import { TermsScreen } from "./screens/TermsScreen";
import { syncAppHeight } from "./lib/syncAppHeight";
import { subscribeTelegramThemeSurfaceSync, syncTelegramSurfaceBackground } from "./lib/telegramSurface";

export default function App() {
  const location = useLocation();
  const { ready, err, pending, retryAuth } = useTelegramAuth();
  const me = useQuery({ queryKey: ["me"], queryFn: getMe, enabled: ready || !!getToken() });
  const [termsAccepted, setTermsAcceptedState] = useState(() => isTermsAccepted());
  const [showOnboarding, setShowOnboarding] = useState(() => !isOnboardingDone());
  /** Один и тот же сплэш: перед Terms, после согласия с Terms и при входе в приложение. */
  const [splashMounted, setSplashMounted] = useState(true);
  const [splashOpaque, setSplashOpaque] = useState(true);

  useLayoutEffect(() => {
    setSplashMounted(true);
    setSplashOpaque(true);
    /* Синхрон с CSS: полоса ~0.87s delay + ~1s fill → fade чуть раньше конца, unmount после fade (320ms). */
    const fadeAt = window.setTimeout(() => setSplashOpaque(false), 1680);
    const unmountAt = window.setTimeout(() => setSplashMounted(false), 2080);
    return () => {
      window.clearTimeout(fadeAt);
      window.clearTimeout(unmountAt);
    };
  }, [termsAccepted]);

  const wrapWithSplash = (node: ReactNode) => (
    <>
      {splashMounted ? <SplashScreen opaque={splashOpaque} /> : null}
      {node}
    </>
  );

  useEffect(() => {
    syncTelegramSurfaceBackground();
    return subscribeTelegramThemeSurfaceSync();
  }, []);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    if (p.get("reset") === "1") {
      resetWelcomeFlow();
      window.history.replaceState({}, "", window.location.pathname);
      window.location.reload();
    }
  }, []);

  useEffect(() => {
    if (!ready) return;
    syncAppHeight();
    const onResize = () => syncAppHeight();
    window.addEventListener("resize", onResize);
    window.visualViewport?.addEventListener("resize", onResize);
    const wa = window.Telegram?.WebApp;
    const onVp = () => syncAppHeight();
    try {
      wa?.onEvent?.("viewportChanged", onVp);
    } catch {
      /* ignore */
    }
    return () => {
      window.removeEventListener("resize", onResize);
      window.visualViewport?.removeEventListener("resize", onResize);
      try {
        wa?.offEvent?.("viewportChanged", onVp);
      } catch {
        /* ignore */
      }
    };
  }, [ready]);

  const hideNav =
    location.pathname.startsWith("/matches/") ||
    location.pathname.startsWith("/match-room/") ||
    location.pathname === "/admin";

  // Terms после того же загрузочного экрана, что и остальной вход; авторизация — только после согласия
  if (!termsAccepted) {
    return wrapWithSplash(
      <div className="flex min-h-[var(--app-h,100dvh)] min-h-[100dvh] w-full flex-1 flex-col bg-[var(--app-surface)] font-body text-[--text-muted]">
        <TermsScreen
          onAgree={() => {
            setTermsAccepted();
            setTermsAcceptedState(true);
          }}
        />
      </div>
    );
  }

  if (pending && !getToken()) {
    return wrapWithSplash(
      <div className="relative flex min-h-[var(--app-h,100dvh)] min-h-[100dvh] flex-1 items-center justify-center bg-[var(--app-surface)] p-6 text-[--text-muted]">
        <BrandBackdrop />
        <span className="relative z-[1]">Вход…</span>
      </div>
    );
  }
  if (err && !getToken()) {
    return wrapWithSplash(
      <div className="relative flex min-h-[var(--app-h,100dvh)] min-h-[100dvh] flex-1 flex-col items-center justify-center gap-4 bg-[var(--app-surface)] p-6 text-[--text-main]">
        <BrandBackdrop />
        <p className="relative z-[1] text-center text-sm">{err}</p>
        <button
          type="button"
          className="relative z-[1] rounded bg-[--accent] px-4 py-2 font-head text-sm font-bold uppercase text-black"
          onClick={retryAuth}
        >
          Повторить
        </button>
      </div>
    );
  }
  if (!ready && !getToken()) {
    return wrapWithSplash(
      <div className="relative flex min-h-[var(--app-h,100dvh)] min-h-[100dvh] flex-1 items-center justify-center bg-[var(--app-surface)] p-6 text-[--text-muted]">
        <BrandBackdrop />
        <span className="relative z-[1]">Ожидание Telegram…</span>
      </div>
    );
  }

  const onboardingActive = showOnboarding && !hideNav && me.data != null && !isOnboardingDone();

  return wrapWithSplash(
    <LevelRanksModalProvider>
      <LevelUpCelebrationProvider level={me.data?.level}>
        <div className="mx-auto flex min-h-0 w-full max-w-md flex-1 flex-col overflow-hidden bg-[var(--app-surface)] shadow-xl min-h-[var(--app-h,100dvh)] min-h-[100dvh]">
          <AnimatedRoutes />
          {!hideNav ? <BottomNav isAdmin={me.data?.isAdmin ?? false} /> : null}
          {onboardingActive ? (
            <OnboardingOverlay
              onComplete={() => {
                setOnboardingDone();
                setShowOnboarding(false);
              }}
            />
          ) : null}
        </div>
      </LevelUpCelebrationProvider>
    </LevelRanksModalProvider>
  );
}
