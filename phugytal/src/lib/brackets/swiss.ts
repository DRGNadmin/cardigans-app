import type { GeneratedBracket, GeneratedMatch, GeneratedRound } from "./types";

/** Generate first Swiss round (1v2, 3v4...). Later rounds created when scores are entered. */
export function generateSwiss(
  participantCount: number,
  roundsCount?: number,
): GeneratedBracket {
  if (participantCount < 2) throw new Error("Нужно минимум 2 участника");

  const totalRounds =
    roundsCount ?? Math.max(3, Math.ceil(Math.log2(participantCount)));

  const rounds: GeneratedRound[] = [];
  for (let r = 0; r < totalRounds; r++) {
    rounds.push({ name: `Swiss Round ${r + 1}`, kind: "SWISS", order: r });
  }

  const matches: GeneratedMatch[] = [];
  const pairCount = Math.floor(participantCount / 2);
  for (let i = 0; i < pairCount; i++) {
    const p1 = i * 2 + 1;
    const p2 = i * 2 + 2;
    if (p2 > participantCount) break;
    matches.push({
      tempId: `sw-0-${i}`,
      roundOrder: 0,
      orderInRound: i,
      participant1Seed: p1,
      participant2Seed: p2,
      isBye: false,
    });
  }

  // Bye for odd count
  if (participantCount % 2 === 1) {
    matches.push({
      tempId: `sw-0-bye`,
      roundOrder: 0,
      orderInRound: pairCount,
      participant1Seed: participantCount,
      participant2Seed: null,
      isBye: true,
    });
  }

  return { rounds, matches };
}
