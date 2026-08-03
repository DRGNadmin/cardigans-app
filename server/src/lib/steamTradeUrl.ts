/** Нормализует и проверяет официальную ссылку «Trade URL» Steam. Пустая строка — не валидна здесь (очистку делайте отдельно как null). */
export function normalizeSteamTradeUrl(raw: string): string | null {
  const s = raw.trim();
  if (!s) return null;

  const withProto = /^https?:\/\//i.test(s) ? s : `https://${s}`;

  let u: URL;
  try {
    u = new URL(withProto);
  } catch {
    return null;
  }

  if (u.protocol !== "http:" && u.protocol !== "https:") return null;

  const host = u.hostname.toLowerCase();
  if (host !== "steamcommunity.com" && host !== "www.steamcommunity.com") return null;

  const path = u.pathname.replace(/\/+$/, "").toLowerCase();
  if (path !== "/tradeoffer/new") return null;

  const partner = u.searchParams.get("partner");
  const token = u.searchParams.get("token");
  if (!partner || !/^\d{1,20}$/.test(partner)) return null;
  if (!token || !/^[a-zA-Z0-9_-]{4,32}$/.test(token)) return null;

  const out = new URL(u.href);
  out.protocol = "https:";
  out.hostname = "steamcommunity.com";
  return out.toString();
}

export const STEAM_TRADE_URL_INVALID = "Некорректная ссылка Steam Trade URL. Скопируйте её из профиля Steam.";
