/** Типичный тёмный фон области Mini App в клиентах Telegram (когда `bg_color` не пришёл). */
export const TELEGRAM_DEFAULT_DARK_SURFACE = "#17212b";

/** Вне Telegram — как в дизайне миниаппа. */
const BROWSER_FALLBACK = "#111111";

function normalizeHex6(raw: string | undefined): string | null {
  if (!raw) return null;
  const t = raw.replace(/^#/, "");
  if (/^[0-9a-fA-F]{6}$/.test(t)) return `#${t.toLowerCase()}`;
  return null;
}

function resolveSurfaceColor(): string {
  const wa = window.Telegram?.WebApp;
  const fromTg = normalizeHex6(wa?.themeParams?.bg_color);
  if (fromTg) return fromTg;
  if (wa) {
    if (wa.colorScheme === "light") return "#ffffff";
    return TELEGRAM_DEFAULT_DARK_SURFACE;
  }
  return BROWSER_FALLBACK;
}

export function syncTelegramSurfaceBackground(): void {
  const wa = window.Telegram?.WebApp;
  const surface = resolveSurfaceColor();
  document.documentElement.style.setProperty("--app-surface", surface);
  try {
    wa?.setBackgroundColor?.(surface);
  } catch {
    /* WebView может не поддерживать */
  }
}

export function subscribeTelegramThemeSurfaceSync(): () => void {
  const wa = window.Telegram?.WebApp;
  if (!wa?.onEvent) return () => {};
  const cb = () => syncTelegramSurfaceBackground();
  try {
    wa.onEvent("themeChanged", cb);
    return () => {
      try {
        wa.offEvent?.("themeChanged", cb);
      } catch {
        /* */
      }
    };
  } catch {
    return () => {};
  }
}
