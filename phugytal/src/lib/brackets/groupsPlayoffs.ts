import { generateSingleElimination } from "./singleElimination";
import type { GeneratedBracket, GeneratedMatch, GeneratedRound } from "./types";

export function generateGroupsPlayoffs(
  participantCount: number,
  groupCount = 4,
  advancePerGroup = 2,
): GeneratedBracket {
  if (participantCount < groupCount * 2) {
    throw new Error("Слишком мало участников для групп");
  }

  const groups: { name: string; order: number; seeds: number[] }[] = [];
  for (let g = 0; g < groupCount; g++) {
    groups.push({ name: `Group ${String.fromCharCode(65 + g)}`, order: g, seeds: [] });
  }

  // Snake draft into groups
  for (let seed = 1; seed <= participantCount; seed++) {
    const cycle = Math.floor((seed - 1) / groupCount);
    const idxInCycle = (seed - 1) % groupCount;
    const gIndex = cycle % 2 === 0 ? idxInCycle : groupCount - 1 - idxInCycle;
    groups[gIndex].seeds.push(seed);
  }

  const rounds: GeneratedRound[] = [
    { name: "Group Stage", kind: "GROUP", order: 0 },
  ];
  const matches: GeneratedMatch[] = [];

  let orderInRound = 0;
  for (const group of groups) {
    const seeds = group.seeds;
    for (let i = 0; i < seeds.length; i++) {
      for (let j = i + 1; j < seeds.length; j++) {
        matches.push({
          tempId: `g-${group.order}-${i}-${j}`,
          roundOrder: 0,
          orderInRound: orderInRound++,
          participant1Seed: seeds[i],
          participant2Seed: seeds[j],
          isBye: false,
          groupName: group.name,
        });
      }
    }
  }

  const playoffSlots = groupCount * advancePerGroup;
  const playoff = generateSingleElimination(Math.max(2, playoffSlots));
  const orderOffset = 1;

  for (const r of playoff.rounds) {
    rounds.push({
      name: r.name.startsWith("Round") || r.name.includes("final") || r.name.includes("Final")
        ? `Playoff ${r.name}`
        : `Playoff ${r.name}`,
      kind: r.kind === "FINAL" ? "FINAL" : "PLAYOFF",
      order: r.order + orderOffset,
    });
  }

  for (const m of playoff.matches) {
    matches.push({
      ...m,
      tempId: `po-${m.tempId}`,
      roundOrder: m.roundOrder + orderOffset,
      // Playoff slots filled manually / by standings later
      participant1Seed: null,
      participant2Seed: null,
      isBye: false,
      nextTempId: m.nextTempId ? `po-${m.nextTempId}` : undefined,
      loserNextTempId: m.loserNextTempId ? `po-${m.loserNextTempId}` : undefined,
    });
  }

  return { rounds, matches, groups };
}
