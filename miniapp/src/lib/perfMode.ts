/**
 * Режим облегчённой графики: меньше blur, проще анимации (см. `index.css` → `perf-reduced`).
 *
 * По умолчанию **включён на Android с ОЗУ ≤ 7 ГБ** (или если `navigator.deviceMemory` недоступен):
 * в Telegram / Chrome WebView тяжёлые эффекты часто лагают на средних устройствах.
 * **Android с `deviceMemory > 7`** — полная графика, как на iPhone. iOS и десктоп без изменений.
 *
 * Принудительно: `localStorage.setItem("cg_force_perf_reduced", "1")` + перезагрузка.
 * На Android отключить облегчение: `"0"` (полная графика, может лагать).
 */
const STORAGE_FORCE = "cg_force_perf_reduced";

function computePerfReduced(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (localStorage.getItem(STORAGE_FORCE) === "1") return true;
    if (localStorage.getItem(STORAGE_FORCE) === "0") return false;
  } catch {
    /* private mode */
  }

  try {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return true;
  } catch {
    /* ignore */
  }

  try {
    const c = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    if (c?.saveData) return true;
  } catch {
    /* ignore */
  }

  if (!/Android/i.test(navigator.userAgent)) return false;

  try {
    const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
    if (typeof mem === "number" && mem > 7) return false;
  } catch {
    /* ignore */
  }

  return true;
}

let cached: boolean | null = null;

/** Синхронно до первого кадра: вешает класс на `<html>`. */
export function applyPerfMode(): void {
  if (typeof document === "undefined") return;
  cached = computePerfReduced();
  if (cached) {
    document.documentElement.classList.add("perf-reduced");
  }
}

export function getPerfReduced(): boolean {
  if (cached != null) return cached;
  return typeof document !== "undefined" && document.documentElement.classList.contains("perf-reduced");
}
