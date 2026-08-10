export type Format =
  | "SINGLE_ELIMINATION"
  | "DOUBLE_ELIMINATION"
  | "ROUND_ROBIN"
  | "SWISS"
  | "GROUPS_PLAYOFFS";

export type RoundKind =
  | "WB"
  | "LB"
  | "FINAL"
  | "GROUP"
  | "SWISS"
  | "PLAYOFF";

export type SeedParticipant = {
  id: string;
  name: string;
  seed: number;
};

export type GeneratedRound = {
  name: string;
  kind: RoundKind;
  order: number;
};

export type GeneratedMatch = {
  tempId: string;
  roundOrder: number;
  orderInRound: number;
  participant1Seed: number | null;
  participant2Seed: number | null;
  isBye: boolean;
  nextTempId?: string;
  nextSlot?: 1 | 2;
  loserNextTempId?: string;
  loserNextSlot?: 1 | 2;
  groupName?: string;
};

export type GeneratedBracket = {
  rounds: GeneratedRound[];
  matches: GeneratedMatch[];
  groups?: { name: string; order: number; seeds: number[] }[];
};

export type SeedingMode = "manual" | "order" | "random" | "snake";
