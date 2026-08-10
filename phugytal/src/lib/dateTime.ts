import { format } from "date-fns";
import { ru } from "date-fns/locale";

/** Parse datetime-local (`YYYY-MM-DDTHH:mm`) as local wall time → Date. */
export function parseLocalDateTime(value: string): Date | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  // datetime-local: 2026-08-10T18:30 or with seconds
  const m = trimmed.match(
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/,
  );
  if (m) {
    const [, ys, mos, ds, hs, mins, ss] = m;
    const d = new Date(
      Number(ys),
      Number(mos) - 1,
      Number(ds),
      Number(hs),
      Number(mins),
      Number(ss ?? "0"),
      0,
    );
    return Number.isNaN(d.getTime()) ? null : d;
  }

  const d = new Date(trimmed);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function toLocalInputValue(isoOrDate: string | Date): string {
  const d = typeof isoOrDate === "string" ? new Date(isoOrDate) : isoOrDate;
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Spectator-facing date + time, e.g. «10 августа 2026, 18:30» */
export function formatMatchDateTime(value: string | Date): string {
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "—";
  return format(d, "d MMMM yyyy, HH:mm", { locale: ru });
}
