import { generateDoubleElimination } from "./doubleElimination";
import { generateGroupsPlayoffs } from "./groupsPlayoffs";
import { generateRoundRobin } from "./roundRobin";
import { generateSingleElimination } from "./singleElimination";
import { generateSwiss } from "./swiss";
import type { Format, GeneratedBracket } from "./types";

export * from "./types";
export * from "./seeding";
export { generateSingleElimination } from "./singleElimination";
export { generateDoubleElimination } from "./doubleElimination";
export { generateRoundRobin } from "./roundRobin";
export { generateSwiss } from "./swiss";
export { generateGroupsPlayoffs } from "./groupsPlayoffs";

export function generateBracket(
  format: Format,
  participantCount: number,
  options?: { groupCount?: number; swissRounds?: number },
): GeneratedBracket {
  switch (format) {
    case "SINGLE_ELIMINATION":
      return generateSingleElimination(participantCount);
    case "DOUBLE_ELIMINATION":
      return generateDoubleElimination(participantCount);
    case "ROUND_ROBIN":
      return generateRoundRobin(participantCount);
    case "SWISS":
      return generateSwiss(participantCount, options?.swissRounds);
    case "GROUPS_PLAYOFFS":
      return generateGroupsPlayoffs(
        participantCount,
        options?.groupCount ?? 4,
      );
    default:
      throw new Error(`Неизвестный формат: ${format}`);
  }
}

export const FORMAT_LABELS: Record<Format, string> = {
  SINGLE_ELIMINATION: "Single Elimination",
  DOUBLE_ELIMINATION: "Double Elimination",
  ROUND_ROBIN: "Round Robin",
  SWISS: "Swiss",
  GROUPS_PLAYOFFS: "Groups → Playoffs",
};
