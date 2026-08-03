/** В WebView Telegram `window.confirm` / `alert` часто не работают — используем Bot API диалоги. */

export function telegramConfirm(message: string): Promise<boolean> {
  const w = window.Telegram?.WebApp;
  if (w && typeof w.showConfirm === "function") {
    return new Promise((resolve) => {
      try {
        w.showConfirm!(message, (ok: boolean) => {
          resolve(Boolean(ok));
        });
      } catch {
        resolve(window.confirm(message));
      }
    });
  }
  return Promise.resolve(window.confirm(message));
}

export function telegramAlert(message: string): Promise<void> {
  const w = window.Telegram?.WebApp;
  if (w && typeof w.showAlert === "function") {
    return new Promise((resolve) => {
      try {
        w.showAlert!(message, () => resolve());
      } catch {
        window.alert(message);
        resolve();
      }
    });
  }
  window.alert(message);
  return Promise.resolve();
}

export function openTelegramExternalLink(url: string) {
  const w = window.Telegram?.WebApp;
  if (w && typeof w.openLink === "function") {
    try {
      w.openLink(url, { try_instant_view: false });
      return;
    } catch {
      /* fallback */
    }
  }
  window.open(url, "_blank", "noopener,noreferrer");
}
