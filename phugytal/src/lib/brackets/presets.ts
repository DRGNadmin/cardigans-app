import type { DisciplineSlug } from "@/lib/disciplines";
import type { GroupStageFormat, PlayoffFormat } from "./types";

export type DisciplinePreset = {
  id: DisciplineSlug;
  label: string;
  groupCount: number;
  /** Expected size hint; actual = names.length / groupCount when groups used */
  groupSizeHint: number;
  groupFormat: GroupStageFormat;
  advancePerGroup: number;
  playoffFormat: PlayoffFormat;
  thirdPlace: boolean;
  /** Rhythm-style standings table as stage 1 */
  standingsTable: boolean;
  /** Optional note under group stage (e.g. hockey 5–8 by group table). */
  placementNote?: string;
};

export const DISCIPLINE_PRESETS: Record<DisciplineSlug, DisciplinePreset> = {
  cs2: {
    id: "cs2",
    label: "CS2 · 4×6 DE · топ-2 · плей-офф DE 1/4 + 3-е",
    groupCount: 4,
    groupSizeHint: 6,
    groupFormat: "DE",
    advancePerGroup: 2,
    playoffFormat: "DE",
    thirdPlace: true,
    standingsTable: false,
  },
  nba: {
    id: "nba",
    label: "Баскетбол · 8×3 RR · топ-2 · плей-офф 1/8 + 3-е",
    groupCount: 8,
    groupSizeHint: 3,
    groupFormat: "RR",
    advancePerGroup: 2,
    playoffFormat: "DE",
    thirdPlace: true,
    standingsTable: false,
  },
  fifa: {
    id: "fifa",
    label: "Футбол · 4×6 RR (5 туров) · топ-2 · SE + 3-е",
    groupCount: 4,
    groupSizeHint: 6,
    groupFormat: "RR",
    advancePerGroup: 2,
    playoffFormat: "SE",
    thirdPlace: true,
    standingsTable: false,
  },
  nhl: {
    id: "nhl",
    label: "Хоккей · 2×4 RR · 1/4 крест A↔B · SE + 3-е · 5–8 по группам",
    groupCount: 2,
    groupSizeHint: 4,
    groupFormat: "RR",
    /** Все из группы в плей-офф (8 → 1/4); места 5–8 — по группе, без доп. сетки */
    advancePerGroup: 4,
    playoffFormat: "SE",
    thirdPlace: true,
    standingsTable: false,
    placementNote:
      "Места 5–8 определяются по итогам групп (без отдельной сетки).",
  },
  rhythm: {
    id: "rhythm",
    label: "Ритм · таблица → SE",
    groupCount: 1,
    groupSizeHint: 16,
    groupFormat: "TABLE",
    advancePerGroup: 0,
    playoffFormat: "SE",
    thirdPlace: false,
    standingsTable: true,
  },
};

export function getPreset(slug: string): DisciplinePreset | undefined {
  return DISCIPLINE_PRESETS[slug as DisciplineSlug];
}
