export function parseAdminTelegramIds(raw: string): string[] {
  return raw
    .split(",")
    .map((id) => id.trim().replace(/[^\d]/g, ""))
    .filter(Boolean);
}
