import type { SeedingMode } from "./types";

export type NamedEntry = { name: string };

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Assign seeds 1..n according to mode. Manual keeps input order as seed order. */
export function applySeeding(
  entries: NamedEntry[],
  mode: SeedingMode,
): { name: string; seed: number }[] {
  if (entries.length < 2) {
    throw new Error("Нужно минимум 2 участника");
  }

  let ordered: NamedEntry[];
  switch (mode) {
    case "random":
      ordered = shuffle(entries);
      break;
    case "snake": {
      // Snake: 1,2,3,... then reverse pairs for visual balance prep
      const base = [...entries];
      ordered = [];
      let left = 0;
      let right = base.length - 1;
      let takeLeft = true;
      while (left <= right) {
        if (takeLeft) {
          ordered.push(base[left++]);
        } else {
          ordered.push(base[right--]);
        }
        takeLeft = !takeLeft;
      }
      break;
    }
    case "manual":
    case "order":
    default:
      ordered = [...entries];
      break;
  }

  return ordered.map((e, i) => ({ name: e.name.trim(), seed: i + 1 }));
}

/** Standard single-elim bracket positions for seeds (1 plays last, etc.) */
export function seedPositions(size: number): number[] {
  const n = nextPowerOfTwo(size);
  const positions = [1, 2];
  let current = 2;
  while (current < n) {
    const next: number[] = [];
    const sum = current * 2 + 1;
    for (const p of positions) {
      next.push(p);
      next.push(sum - p);
    }
    positions.splice(0, positions.length, ...next);
    current *= 2;
  }
  return positions;
}

export function nextPowerOfTwo(n: number): number {
  let p = 1;
  while (p < n) p *= 2;
  return p;
}

export function roundNameForWb(roundIndexFromFinal: number, totalRounds: number): string {
  const fromEnd = totalRounds - roundIndexFromFinal;
  if (fromEnd === 1) return "Grand Final";
  if (fromEnd === 2) return "Semifinals";
  if (fromEnd === 3) return "Quarterfinals";
  return `Round ${roundIndexFromFinal + 1}`;
}
