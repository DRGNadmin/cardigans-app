import { generateDoubleElimination } from "./doubleElimination";
import { generateSingleElimination } from "./singleElimination";
import {
  annotateAdvancementLabels,
  playoffFeedPairs,
  standingsFeedPairs,
} from "./playoffSeeding";
import type {
  GeneratedBracket,
  GeneratedMatch,
  GeneratedRound,
  GroupStageFormat,
  PlayoffFormat,
} from "./types";

function letter(i: number) {
  return String.fromCharCode(65 + i);
}

/** Circle-method RR tours for one group's seeds. */
function buildGroupRrTours(seeds: number[]): [number, number][][] {
  if (seeds.length < 2) return [];
  const list: (number | null)[] =
    seeds.length % 2 === 1 ? [...seeds, null] : [...seeds];
  const n = list.length;
  const tours = n - 1;
  const half = n / 2;
  let arr = [...list];
  const out: [number, number][][] = [];
  for (let t = 0; t < tours; t++) {
    const pairs: [number, number][] = [];
    for (let i = 0; i < half; i++) {
      const a = arr[i];
      const b = arr[n - 1 - i];
      if (a != null && b != null) pairs.push([a, b]);
    }
    out.push(pairs);
    arr = [arr[0], arr[n - 1], ...arr.slice(1, n - 1)];
  }
  return out;
}

function applyFeedLabels(
  matches: GeneratedMatch[],
  playoffRoundOrders: number[],
  pairs: { slot1: string; slot2: string }[],
) {
  if (!playoffRoundOrders.length || !pairs.length) return;
  const firstOrder = Math.min(...playoffRoundOrders);
  const first = matches
    .filter((m) => m.roundOrder === firstOrder)
    .sort((a, b) => a.orderInRound - b.orderInRound);
  first.forEach((m, i) => {
    const pair = pairs[i];
    if (!pair) return;
    m.slotLabel1 = pair.slot1;
    m.slotLabel2 = pair.slot2;
  });
}

function addThirdPlace(
  rounds: GeneratedRound[],
  matches: GeneratedMatch[],
  playoffPrefix: string,
) {
  const finalRound = [...rounds].sort((a, b) => b.order - a.order)[0];
  if (!finalRound) return;

  const finalMatches = matches.filter((m) => m.roundOrder === finalRound.order);
  const semis = matches.filter(
    (m) =>
      m.nextTempId &&
      finalMatches.some((f) => f.tempId === m.nextTempId) &&
      m.roundOrder < finalRound.order,
  );
  if (semis.length < 2) return;

  const order = finalRound.order + 1;
  rounds.push({
    name: "Матч за 3-е место",
    kind: "THIRD_PLACE",
    order,
  });
  const thirdId = `${playoffPrefix}third-0`;
  matches.push({
    tempId: thirdId,
    roundOrder: order,
    orderInRound: 0,
    participant1Seed: null,
    participant2Seed: null,
    isBye: false,
    slotLabel1: "Проигр. PF1",
    slotLabel2: "Проигр. PF2",
  });
  semis.slice(0, 2).forEach((sm, idx) => {
    sm.loserNextTempId = thirdId;
    sm.loserNextSlot = (idx === 0 ? 1 : 2) as 1 | 2;
  });
}

export function generateGroupsPlayoffs(
  participantCount: number,
  options?: {
    groupCount?: number;
    advancePerGroup?: number;
    groupFormat?: GroupStageFormat;
    playoffFormat?: PlayoffFormat;
    thirdPlace?: boolean;
    standingsTable?: boolean;
  },
): GeneratedBracket {
  const groupCount = options?.groupCount ?? 4;
  const advancePerGroup = options?.advancePerGroup ?? 2;
  const groupFormat = options?.groupFormat ?? "RR";
  const playoffFormat = options?.playoffFormat ?? "SE";
  const thirdPlace = options?.thirdPlace ?? false;
  const standingsTable = options?.standingsTable ?? false;

  if (standingsTable || groupFormat === "TABLE") {
    const playoffSlots = Math.max(2, participantCount);
    return buildPlayoffOnly(playoffSlots, playoffFormat, thirdPlace, true);
  }

  if (participantCount < groupCount * 2) {
    throw new Error("Слишком мало участников для групп");
  }

  const groups: { name: string; order: number; seeds: number[] }[] = [];
  for (let g = 0; g < groupCount; g++) {
    groups.push({ name: `Group ${letter(g)}`, order: g, seeds: [] });
  }

  for (let seed = 1; seed <= participantCount; seed++) {
    const cycle = Math.floor((seed - 1) / groupCount);
    const idxInCycle = (seed - 1) % groupCount;
    const gIndex = cycle % 2 === 0 ? idxInCycle : groupCount - 1 - idxInCycle;
    groups[gIndex].seeds.push(seed);
  }

  const rounds: GeneratedRound[] = [];
  const matches: GeneratedMatch[] = [];
  let nextRoundOrder = 0;

  if (groupFormat === "RR") {
    // Circle-method tours per group (6 teams → 5 rounds, 4 teams → 3, etc.)
    const maxTours = Math.max(
      ...groups.map((g) => {
        const n = g.seeds.length + (g.seeds.length % 2);
        return Math.max(1, n - 1);
      }),
      1,
    );

    for (let tour = 0; tour < maxTours; tour++) {
      rounds.push({
        name: `Тур ${tour + 1}`,
        kind: "GROUP",
        order: nextRoundOrder + tour,
      });
    }

    const orderByTour = new Map<number, number>();
    for (const group of groups) {
      const tours = buildGroupRrTours(group.seeds);
      tours.forEach((pairs, tour) => {
        for (const [a, b] of pairs) {
          const o = orderByTour.get(tour) ?? 0;
          orderByTour.set(tour, o + 1);
          matches.push({
            tempId: `g-${group.order}-t${tour}-${a}-${b}`,
            roundOrder: nextRoundOrder + tour,
            orderInRound: o,
            participant1Seed: a,
            participant2Seed: b,
            isBye: false,
            groupName: group.name,
          });
        }
      });
    }
    nextRoundOrder += maxTours;
  } else if (groupFormat === "DE") {
    for (const group of groups) {
      const local = generateDoubleElimination(group.seeds.length);
      const seedMap = new Map(
        group.seeds.map((seed, idx) => [idx + 1, seed] as const),
      );
      const orderBase = nextRoundOrder;
      for (const r of local.rounds) {
        rounds.push({
          name: `${letter(group.order)} · ${r.name}`,
          kind: r.kind,
          order: orderBase + r.order,
          groupName: group.name,
        });
      }
      for (const m of local.matches) {
        matches.push({
          ...m,
          tempId: `g${group.order}-${m.tempId}`,
          roundOrder: orderBase + m.roundOrder,
          participant1Seed:
            m.participant1Seed != null
              ? (seedMap.get(m.participant1Seed) ?? null)
              : null,
          participant2Seed:
            m.participant2Seed != null
              ? (seedMap.get(m.participant2Seed) ?? null)
              : null,
          nextTempId: m.nextTempId
            ? `g${group.order}-${m.nextTempId}`
            : undefined,
          loserNextTempId: m.loserNextTempId
            ? `g${group.order}-${m.loserNextTempId}`
            : undefined,
          groupName: group.name,
        });
      }
      nextRoundOrder =
        orderBase + Math.max(...local.rounds.map((r) => r.order)) + 1;
    }
  }

  if (playoffFormat !== "NONE") {
    const playoffSlots = Math.max(2, groupCount * advancePerGroup);
    const playoff =
      playoffFormat === "DE"
        ? generateDoubleElimination(playoffSlots)
        : generateSingleElimination(playoffSlots);
    const orderOffset = nextRoundOrder;
    const prefix = "po-";
    const playoffOrders: number[] = [];

    for (const r of playoff.rounds) {
      const order = r.order + orderOffset;
      playoffOrders.push(order);
      rounds.push({
        name:
          r.kind === "FINAL" ? `Playoff ${r.name}` : `Playoff ${r.name}`,
        kind:
          r.kind === "FINAL"
            ? "FINAL"
            : r.kind === "WB" || r.kind === "LB"
              ? r.kind
              : "PLAYOFF",
        order,
      });
    }

    for (const m of playoff.matches) {
      matches.push({
        ...m,
        tempId: `${prefix}${m.tempId}`,
        roundOrder: m.roundOrder + orderOffset,
        participant1Seed: null,
        participant2Seed: null,
        isBye: false,
        nextTempId: m.nextTempId ? `${prefix}${m.nextTempId}` : undefined,
        loserNextTempId: m.loserNextTempId
          ? `${prefix}${m.loserNextTempId}`
          : undefined,
      });
    }

    applyFeedLabels(
      matches,
      playoffOrders,
      playoffFeedPairs(groupCount, advancePerGroup),
    );

    if (thirdPlace) {
      addThirdPlace(rounds, matches, prefix);
    }
  }

  // Re-annotate after group remap + playoff A1/B2 feeds so LB/later slots
  // show Поб./Проигр. матча N (playoff R1 keeps A1/B2).
  for (const m of matches) {
    if (
      m.slotLabel1?.startsWith("Поб.") ||
      m.slotLabel1?.startsWith("Проигр.") ||
      m.slotLabel1?.startsWith("Проигравший")
    ) {
      m.slotLabel1 = undefined;
    }
    if (
      m.slotLabel2?.startsWith("Поб.") ||
      m.slotLabel2?.startsWith("Проигр.") ||
      m.slotLabel2?.startsWith("Проигравший")
    ) {
      m.slotLabel2 = undefined;
    }
  }
  annotateAdvancementLabels(matches);

  return { rounds, matches, groups };
}

function buildPlayoffOnly(
  slots: number,
  playoffFormat: PlayoffFormat,
  thirdPlace: boolean,
  table: boolean,
): GeneratedBracket {
  const rounds: GeneratedRound[] = [];
  const matches: GeneratedMatch[] = [];
  if (table) {
    rounds.push({ name: "Таблица", kind: "GROUP", order: 0 });
  }
  if (playoffFormat === "NONE") return { rounds, matches };

  const playoff =
    playoffFormat === "DE"
      ? generateDoubleElimination(slots)
      : generateSingleElimination(slots);
  const offset = table ? 1 : 0;
  const prefix = "po-";
  const playoffOrders: number[] = [];
  for (const r of playoff.rounds) {
    const order = r.order + offset;
    playoffOrders.push(order);
    rounds.push({
      name: r.name,
      kind:
        r.kind === "FINAL"
          ? "FINAL"
          : r.kind === "WB" || r.kind === "LB"
            ? r.kind
            : "PLAYOFF",
      order,
    });
  }
  for (const m of playoff.matches) {
    matches.push({
      ...m,
      tempId: `${prefix}${m.tempId}`,
      roundOrder: m.roundOrder + offset,
      participant1Seed: null,
      participant2Seed: null,
      isBye: false,
      nextTempId: m.nextTempId ? `${prefix}${m.nextTempId}` : undefined,
      loserNextTempId: m.loserNextTempId
        ? `${prefix}${m.loserNextTempId}`
        : undefined,
    });
  }
  applyFeedLabels(matches, playoffOrders, standingsFeedPairs(slots));
  if (thirdPlace) addThirdPlace(rounds, matches, prefix);
  for (const m of matches) {
    if (
      m.slotLabel1?.startsWith("Поб.") ||
      m.slotLabel1?.startsWith("Проигр.") ||
      m.slotLabel1?.startsWith("Проигравший")
    ) {
      m.slotLabel1 = undefined;
    }
    if (
      m.slotLabel2?.startsWith("Поб.") ||
      m.slotLabel2?.startsWith("Проигр.") ||
      m.slotLabel2?.startsWith("Проигравший")
    ) {
      m.slotLabel2 = undefined;
    }
  }
  annotateAdvancementLabels(matches);
  return { rounds, matches };
}
