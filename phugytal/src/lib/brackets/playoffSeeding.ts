import type { GeneratedMatch } from "./types";

/**
 * Professional-style playoff feeds from group standings.
 * Labels like A1 = winner of Group A, B2 = runner-up of Group B.
 *
 * Patterns used by major events (FIFA-style / common Challenger seeding):
 * - 2 groups × top2 → A1–B2, B1–A2
 * - 4 groups × top2 → A1–B2, C1–D2, B1–A2, D1–C2
 * - 8 groups × top2 → A1–H2, B1–G2, C1–F2, D1–E2, E1–D2, F1–C2, G1–B2, H1–A2
 */

function letter(i: number) {
  return String.fromCharCode(65 + i);
}

export type FeedPair = { slot1: string; slot2: string };

export function playoffFeedPairs(
  groupCount: number,
  advancePerGroup: number,
): FeedPair[] {
  if (advancePerGroup <= 0 || groupCount <= 0) return [];

  const slots = groupCount * advancePerGroup;
  const matchCount = Math.floor(slots / 2);
  if (matchCount < 1) return [];

  if (advancePerGroup === 2 && groupCount === 2) {
    return [
      { slot1: "A1", slot2: "B2" },
      { slot1: "B1", slot2: "A2" },
    ];
  }

  /** Hockey-style: 2×4 all advance, quarterfinals cross A↔B */
  if (advancePerGroup === 4 && groupCount === 2) {
    return [
      { slot1: "A1", slot2: "B4" },
      { slot1: "A2", slot2: "B3" },
      { slot1: "B1", slot2: "A4" },
      { slot1: "B2", slot2: "A3" },
    ];
  }

  if (advancePerGroup === 2 && groupCount === 4) {
    return [
      { slot1: "A1", slot2: "B2" },
      { slot1: "C1", slot2: "D2" },
      { slot1: "B1", slot2: "A2" },
      { slot1: "D1", slot2: "C2" },
    ];
  }

  if (advancePerGroup === 2 && groupCount === 8) {
    return [
      { slot1: "A1", slot2: "H2" },
      { slot1: "B1", slot2: "G2" },
      { slot1: "C1", slot2: "F2" },
      { slot1: "D1", slot2: "E2" },
      { slot1: "E1", slot2: "D2" },
      { slot1: "F1", slot2: "C2" },
      { slot1: "G1", slot2: "B2" },
      { slot1: "H1", slot2: "A2" },
    ];
  }

  // Generic: pair 1st of group i with 2nd of opposite group, then remaining places.
  const pairs: FeedPair[] = [];
  if (advancePerGroup >= 2) {
    for (let i = 0; i < groupCount; i++) {
      const opp = groupCount - 1 - i;
      pairs.push({
        slot1: `${letter(i)}1`,
        slot2: `${letter(opp)}2`,
      });
    }
  }
  // Extra advances (3rd etc.): fill remaining match slots
  let place = 3;
  while (pairs.length < matchCount && place <= advancePerGroup) {
    for (let i = 0; i < groupCount && pairs.length < matchCount; i++) {
      const opp = (i + Math.floor(groupCount / 2)) % groupCount;
      pairs.push({
        slot1: `${letter(i)}${place}`,
        slot2: `${letter(opp)}${place}`,
      });
    }
    place += 1;
  }

  return pairs.slice(0, matchCount);
}

/** Standing-table → SE: 1 vs N, 2 vs N-1, ... in classic bracket order. */
export function standingsFeedPairs(slotCount: number): FeedPair[] {
  const size = Math.max(2, slotCount);
  // power of two bracket seeds: 1vsN, 2vsN-1 in SE first-round order
  // Use standard seeding positions for power of two
  const n = nextPow2(size);
  const seeds = standardSeedOrder(n);
  const pairs: FeedPair[] = [];
  for (let i = 0; i < seeds.length; i += 2) {
    const a = seeds[i];
    const b = seeds[i + 1];
    pairs.push({
      slot1: a <= size ? String(a) : `BYE`,
      slot2: b <= size ? String(b) : `BYE`,
    });
  }
  return pairs;
}

function nextPow2(n: number) {
  let p = 1;
  while (p < n) p *= 2;
  return p;
}

/** Classic single-elim seed placement order for first round. */
function standardSeedOrder(n: number): number[] {
  if (n === 1) return [1];
  const half = standardSeedOrder(n / 2);
  const out: number[] = [];
  for (const s of half) {
    out.push(s);
    out.push(n + 1 - s);
  }
  return out;
}

export function parseFeedLabel(
  label: string,
): { groupOrder: number; place: number } | { standing: number } | null {
  const g = label.trim().toUpperCase().match(/^([A-Z])(\d+)$/);
  if (g) {
    return {
      groupOrder: g[1].charCodeAt(0) - 65,
      place: Number(g[2]),
    };
  }
  const s = label.trim().match(/^(\d+)$/);
  if (s) return { standing: Number(s[1]) };
  return null;
}

export function formatMatchCode(n: number) {
  return `M${n}`;
}

/**
 * Global tournament match numbers: skip BYE rows, do not reset between groups.
 * Order = roundOrder, then orderInRound.
 */
export function assignGeneratedMatchNumbers(
  matches: GeneratedMatch[],
): Map<string, number> {
  const ordered = [...matches].sort((a, b) => {
    if (a.roundOrder !== b.roundOrder) return a.roundOrder - b.roundOrder;
    return a.orderInRound - b.orderInRound;
  });
  const numByTemp = new Map<string, number>();
  let n = 0;
  for (const m of ordered) {
    if (m.isBye) continue;
    n += 1;
    numByTemp.set(m.tempId, n);
  }
  return numByTemp;
}

/**
 * Fill empty bracket slots with winner/loser feed labels ("Поб. M3" / "Проигр. M3").
 * Numbering is continuous across the whole tournament (byes excluded).
 */
export function annotateAdvancementLabels(matches: GeneratedMatch[]) {
  const byTemp = new Map(matches.map((m) => [m.tempId, m]));
  const numByTemp = assignGeneratedMatchNumbers(matches);
  const ordered = [...matches].sort((a, b) => {
    if (a.roundOrder !== b.roundOrder) return a.roundOrder - b.roundOrder;
    return a.orderInRound - b.orderInRound;
  });

  for (const m of ordered) {
    const n = numByTemp.get(m.tempId);
    if (n == null) continue; // bye — not a numbered match
    const code = formatMatchCode(n);
    if (m.nextTempId && m.nextSlot) {
      const t = byTemp.get(m.nextTempId);
      if (t) {
        const label = `Поб. ${code}`;
        if (m.nextSlot === 1 && t.participant1Seed == null && !t.slotLabel1) {
          t.slotLabel1 = label;
        }
        if (m.nextSlot === 2 && t.participant2Seed == null && !t.slotLabel2) {
          t.slotLabel2 = label;
        }
      }
    }
    if (m.loserNextTempId && m.loserNextSlot) {
      const t = byTemp.get(m.loserNextTempId);
      if (t) {
        const label = `Проигр. ${code}`;
        if (
          m.loserNextSlot === 1 &&
          t.participant1Seed == null &&
          !t.slotLabel1
        ) {
          t.slotLabel1 = label;
        }
        if (
          m.loserNextSlot === 2 &&
          t.participant2Seed == null &&
          !t.slotLabel2
        ) {
          t.slotLabel2 = label;
        }
      }
    }
  }
}
