import { annotateAdvancementLabels } from "./playoffSeeding";
import { generateSingleElimination } from "./singleElimination";
import { nextPowerOfTwo } from "./seeding";
import type { GeneratedBracket, GeneratedMatch, GeneratedRound } from "./types";

/**
 * Practical double-elim: winners bracket = SE, losers bracket rounds,
 * then grand final. Advancement links set for WB→LB and LB progression.
 */
export function generateDoubleElimination(participantCount: number): GeneratedBracket {
  const wb = generateSingleElimination(participantCount);
  const size = nextPowerOfTwo(participantCount);
  const wbRounds = Math.log2(size);

  const rounds: GeneratedRound[] = wb.rounds.map((r) => ({
    ...r,
    name: r.kind === "FINAL" ? "WB Final" : `WB ${r.name}`,
    kind: "WB" as const,
  }));

  const matches: GeneratedMatch[] = wb.matches.map((m) => ({ ...m }));

  // Losers bracket: for each WB round after first, one LB round absorbs losers
  let lbOrder = wbRounds;
  const lbRoundIds: string[][] = [];

  for (let w = 0; w < wbRounds - 1; w++) {
    const feeders = matches.filter((m) => m.roundOrder === w);
    const lbMatchesCount = Math.max(1, feeders.length / 2);

    rounds.push({
      name: `LB Round ${w + 1}`,
      kind: "LB",
      order: lbOrder,
    });

    const ids: string[] = [];
    for (let i = 0; i < lbMatchesCount; i++) {
      const tempId = `lb-${w}-${i}`;
      matches.push({
        tempId,
        roundOrder: lbOrder,
        orderInRound: i,
        participant1Seed: null,
        participant2Seed: null,
        isBye: false,
      });
      ids.push(tempId);
    }
    lbRoundIds.push(ids);

    // Wire WB losers into LB
    feeders.forEach((fm, idx) => {
      const target = ids[Math.floor(idx / 2)];
      if (!target) return;
      fm.loserNextTempId = target;
      fm.loserNextSlot = (idx % 2 === 0 ? 1 : 2) as 1 | 2;
    });

    // Chain previous LB winners into this round where applicable
    if (w > 0) {
      const prev = lbRoundIds[w - 1];
      prev.forEach((pid, idx) => {
        const target = ids[Math.floor(idx / 2)] ?? ids[idx % ids.length];
        const pm = matches.find((m) => m.tempId === pid)!;
        // If slot already taken by WB loser feed, use nextSlot winner path when free
        if (!pm.nextTempId) {
          pm.nextTempId = target;
          pm.nextSlot = (idx % 2 === 0 ? 1 : 2) as 1 | 2;
        }
      });
    }

    lbOrder += 1;
  }

  // Grand Final: WB winner vs LB winner
  rounds.push({ name: "Grand Final", kind: "FINAL", order: lbOrder });
  const gfId = "gf-0";
  matches.push({
    tempId: gfId,
    roundOrder: lbOrder,
    orderInRound: 0,
    participant1Seed: null,
    participant2Seed: null,
    isBye: false,
  });

  const wbFinal = matches.find((m) => m.roundOrder === wbRounds - 1 && !m.tempId.startsWith("lb"));
  if (wbFinal) {
    wbFinal.nextTempId = gfId;
    wbFinal.nextSlot = 1;
  }
  const lastLb = lbRoundIds[lbRoundIds.length - 1]?.[0];
  if (lastLb) {
    const lm = matches.find((m) => m.tempId === lastLb)!;
    lm.nextTempId = gfId;
    lm.nextSlot = 2;
  }

  // Nested SE already annotated WB; refresh after LB/GF wiring + renamed rounds.
  for (const m of matches) {
    if (m.slotLabel1?.startsWith("Поб.") || m.slotLabel1?.startsWith("Проигр.")) {
      m.slotLabel1 = undefined;
    }
    if (m.slotLabel2?.startsWith("Поб.") || m.slotLabel2?.startsWith("Проигр.")) {
      m.slotLabel2 = undefined;
    }
  }
  annotateAdvancementLabels(matches, rounds);
  return { rounds, matches };
}
