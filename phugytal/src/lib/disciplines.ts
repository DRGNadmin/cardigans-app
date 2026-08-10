export type DisciplineSlug = "fifa" | "nhl" | "nba" | "cs2" | "rhythm";

export type Discipline = {
  slug: DisciplineSlug;
  name: string;
  shortName: string;
  color: string;
  colorRgb: string;
  blurb: string;
};

export const DISCIPLINES: Discipline[] = [
  {
    slug: "fifa",
    name: "FIFA",
    shortName: "FIFA",
    color: "#00FF00",
    colorRgb: "0, 255, 0",
    blurb: "Футбольное двоеборье",
  },
  {
    slug: "nhl",
    name: "NHL",
    shortName: "NHL",
    color: "#00E6FF",
    colorRgb: "0, 230, 255",
    blurb: "Хоккейное двоеборье",
  },
  {
    slug: "nba",
    name: "NBA",
    shortName: "NBA",
    color: "#FB5608",
    colorRgb: "251, 86, 8",
    blurb: "Баскетбольное двоеборье",
  },
  {
    slug: "cs2",
    name: "CS2",
    shortName: "CS2",
    color: "#FFD31C",
    colorRgb: "255, 211, 28",
    blurb: "Тактическое двоеборье",
  },
  {
    slug: "rhythm",
    name: "Ритм-симулятор",
    shortName: "Rhythm",
    color: "#FF006E",
    colorRgb: "255, 0, 110",
    blurb: "Ритм-симулятор",
  },
];

export function getDiscipline(slug: string): Discipline | undefined {
  return DISCIPLINES.find((d) => d.slug === slug);
}

export function isDisciplineSlug(slug: string): slug is DisciplineSlug {
  return DISCIPLINES.some((d) => d.slug === slug);
}
