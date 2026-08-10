import type { GeneratedBracket, GeneratedMatch, GeneratedRound } from "./types";

/** Circle method round-robin. */
export function generateRoundRobin(participantCount: number): GeneratedBracket {
  if (participantCount < 2) throw new Error("Нужно минимум 2 участника");

  const seeds = Array.from({ length: participantCount }, (_, i) => i + 1);
  const isOdd = seeds.length % 2 === 1;
  const list = isOdd ? [...seeds, null] : [...seeds];
  const n = list.length;
  const roundsCount = n - 1;
  const half = n / 2;

  const rounds: GeneratedRound[] = [];
  const matches: GeneratedMatch[] = [];

  let arr = [...list];
  for (let r = 0; r < roundsCount; r++) {
    rounds.push({ name: `Round ${r + 1}`, kind: "GROUP", order: r });
    let orderInRound = 0;
    for (let i = 0; i < half; i++) {
      const a = arr[i];
      const b = arr[n - 1 - i];
      if (a == null || b == null) continue;
      matches.push({
        tempId: `rr-${r}-${orderInRound}`,
        roundOrder: r,
        orderInRound,
        participant1Seed: a,
        participant2Seed: b,
        isBye: false,
      });
      orderInRound += 1;
    }
    // rotate
    arr = [arr[0], arr[n - 1], ...arr.slice(1, n - 1)];
  }

  return { rounds, matches };
}
