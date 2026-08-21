import { annotateAdvancementLabels } from "./playoffSeeding";
import { nextPowerOfTwo, roundNameForWb, seedPositions } from "./seeding";
import type { GeneratedBracket, GeneratedMatch, GeneratedRound } from "./types";

export function generateSingleElimination(participantCount: number): GeneratedBracket {
  if (participantCount < 2) throw new Error("Нужно минимум 2 участника");

  const size = nextPowerOfTwo(participantCount);
  const totalRounds = Math.log2(size);
  const positions = seedPositions(size);

  // Map bracket slot (0..size-1) -> seed or null (bye)
  const slotSeeds: (number | null)[] = positions.map((seed) =>
    seed <= participantCount ? seed : null,
  );

  const rounds: GeneratedRound[] = [];
  for (let r = 0; r < totalRounds; r++) {
    rounds.push({
      name: roundNameForWb(r, totalRounds),
      kind: r === totalRounds - 1 ? "FINAL" : "WB",
      order: r,
    });
  }

  const matches: GeneratedMatch[] = [];
  const matchIdsByRound: string[][] = [];

  // Round 0
  const r0: string[] = [];
  const r0Count = size / 2;
  for (let i = 0; i < r0Count; i++) {
    const p1 = slotSeeds[i * 2];
    const p2 = slotSeeds[i * 2 + 1];
    const tempId = `m-0-${i}`;
    const isBye = p1 == null || p2 == null;
    matches.push({
      tempId,
      roundOrder: 0,
      orderInRound: i,
      participant1Seed: p1,
      participant2Seed: p2,
      isBye,
    });
    r0.push(tempId);
  }
  matchIdsByRound.push(r0);

  for (let r = 1; r < totalRounds; r++) {
    const prev = matchIdsByRound[r - 1];
    const ids: string[] = [];
    const count = prev.length / 2;
    for (let i = 0; i < count; i++) {
      const tempId = `m-${r}-${i}`;
      matches.push({
        tempId,
        roundOrder: r,
        orderInRound: i,
        participant1Seed: null,
        participant2Seed: null,
        isBye: false,
      });
      ids.push(tempId);

      const left = matches.find((m) => m.tempId === prev[i * 2])!;
      const right = matches.find((m) => m.tempId === prev[i * 2 + 1])!;
      left.nextTempId = tempId;
      left.nextSlot = 1;
      right.nextTempId = tempId;
      right.nextSlot = 2;
    }
    matchIdsByRound.push(ids);
  }

  annotateAdvancementLabels(matches);
  return { rounds, matches };
}
