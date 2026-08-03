import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { authTelegram, clearToken, getMe, getToken, setToken } from "../api";
import { syncAppHeight } from "../lib/syncAppHeight";

/** На tdesktop / web клиенте initData и WebView часто приходят медленнее, чем на iOS/Android */
function initDataWaitMs(): number {
  const p = window.Telegram?.WebApp?.platform ?? "";
  if (p === "android" || p === "ios") return 8000;
  return 22000;
}

export function useTelegramAuth() {
  const [ready, setReady] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [retry, setRetry] = useState(0);
  const qc = useQueryClient();

  useEffect(() => {
    let disposed = false;
    window.Telegram?.WebApp?.ready();
    window.Telegram?.WebApp?.expand();

    const waitForInitData = (maxMs: number) =>
      new Promise<string | null>((resolve) => {
        const start = Date.now();
        const tick = () => {
          if (disposed) {
            resolve(null);
            return;
          }
          const initData = window.Telegram?.WebApp?.initData;
          if (initData) {
            resolve(initData);
            return;
          }
          if (Date.now() - start > maxMs) {
            resolve(null);
            return;
          }
          setTimeout(tick, 200);
        };
        tick();
      });

    void (async () => {
      if (getToken()) {
        setPending(true);
        setErr(null);
        try {
          await getMe();
          if (!disposed) {
            setReady(true);
            setPending(false);
            syncAppHeight();
          }
          return;
        } catch {
          clearToken();
          void qc.removeQueries({ queryKey: ["me"] });
        }
      }

      if (!disposed) setPending(true);
      const initData = await waitForInitData(initDataWaitMs());
      if (disposed) return;
      if (!initData) {
        if (!disposed) {
          setPending(false);
          setErr("Telegram initData не получен. Откройте мини-апп через кнопку бота.");
        }
        return;
      }

      setPending(true);
      try {
        const { accessToken } = await authTelegram(initData);
        if (disposed) return;
        setToken(accessToken);
        setReady(true);
        setErr(null);
        syncAppHeight();
        void qc.invalidateQueries({ queryKey: ["me"] });
      } catch (e) {
        if (!disposed) setErr((e as Error).message);
      } finally {
        if (!disposed) setPending(false);
      }
    })();

    return () => {
      disposed = true;
    };
  }, [qc, retry]);

  return { ready, err, pending, retryAuth: () => setRetry((v) => v + 1) };
}
