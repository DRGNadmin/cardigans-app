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
  | "PLAYOFF"
  | "THIRD_PLACE";

export type GroupStageFormat = "RR" | "DE" | "TABLE";
export type PlayoffFormat = "SE" | "DE" | "NONE";

export type SeedParticipant = {
  id: string;
  name: string;
  seed: number;
};

export type GeneratedRound = {
  name: string;
  kind: RoundKind;
  order: number;
  groupName?: string;
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
  /** Display feed when participant not yet filled, e.g. A1 / B2 */
  slotLabel1?: string | null;
  slotLabel2?: string | null;
};

export type GeneratedBracket = {
  rounds: GeneratedRound[];
  matches: GeneratedMatch[];
  groups?: { name: string; order: number; seeds: number[] }[];
};

export type SeedingMode = "manual" | "order" | "random" | "snake";

export type BracketGenerateOptions = {
  groupCount?: number;
  swissRounds?: number;
  advancePerGroup?: number;
  groupFormat?: GroupStageFormat;
  playoffFormat?: PlayoffFormat;
  thirdPlace?: boolean;
  standingsTable?: boolean;
};
