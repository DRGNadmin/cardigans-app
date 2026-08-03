/**
 * Высота мини-приложения в Telegram Desktop/Web часто приходит неверной, если брать только
 * viewportStableHeight. Берём максимум из доступных метрик и обновляем при resize / viewportChanged.
 */
export function syncAppHeight() {
  const wa = window.Telegram?.WebApp;
  try {
    wa?.ready();
    wa?.expand();
  } catch {
    /* ignore */
  }

  const candidates: number[] = [];
  if (wa && typeof wa.viewportStableHeight === "number" && wa.viewportStableHeight > 0) {
    candidates.push(wa.viewportStableHeight);
  }
  if (wa && typeof wa.viewportHeight === "number" && wa.viewportHeight > 0) {
    candidates.push(wa.viewportHeight);
  }
  const vv = window.visualViewport?.height;
  if (typeof vv === "number" && vv > 0) candidates.push(vv);
  if (window.innerHeight > 0) candidates.push(window.innerHeight);

  const h = candidates.length > 0 ? Math.max(...candidates) : 600;
  document.documentElement.style.setProperty("--app-h", `${Math.round(h)}px`);
}
