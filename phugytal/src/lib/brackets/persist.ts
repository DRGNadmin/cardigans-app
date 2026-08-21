import type { TournamentFormat } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  applySeeding,
  generateBracket,
  getPreset,
  type BracketGenerateOptions,
  type SeedingMode,
} from "@/lib/brackets";
import { publishTournament } from "@/lib/realtime";

export async function createTournamentWithBracket(input: {
  discipline: string;
  name: string;
  format: TournamentFormat;
  participantNames: string[];
  seedingMode: SeedingMode;
  groupCount?: number;
  swissRounds?: number;
  streamUrl?: string;
  useDisciplinePreset?: boolean;
}) {
  const preset =
    input.useDisciplinePreset !== false
      ? getPreset(input.discipline)
      : undefined;

  const options: BracketGenerateOptions = {
    groupCount: input.groupCount ?? preset?.groupCount,
    swissRounds: input.swissRounds,
    advancePerGroup: preset?.advancePerGroup,
    groupFormat: preset?.groupFormat,
    playoffFormat: preset?.playoffFormat,
    thirdPlace: preset?.thirdPlace,
    standingsTable: preset?.standingsTable,
  };

  const format: TournamentFormat =
    preset && input.format === "GROUPS_PLAYOFFS"
      ? "GROUPS_PLAYOFFS"
      : preset
        ? "GROUPS_PLAYOFFS"
        : input.format;

  // Discipline presets always use multi-stage generator
  const effectiveFormat: TournamentFormat = preset
    ? "GROUPS_PLAYOFFS"
    : format;

  const seeded = applySeeding(
    input.participantNames.map((name) => ({ name })),
    input.seedingMode,
  );
  const generated = generateBracket(
    effectiveFormat as "GROUPS_PLAYOFFS",
    seeded.length,
    options,
  );

  return prisma.$transaction(async (tx) => {
    const tournament = await tx.tournament.create({
      data: {
        discipline: input.discipline,
        name: input.name,
        format: effectiveFormat,
        status: "ACTIVE",
        streamUrl: input.streamUrl?.trim() || null,
        settingsJson: JSON.stringify({
          seedingMode: input.seedingMode,
          preset: preset?.id ?? null,
          placementNote: preset?.placementNote ?? null,
          ...options,
        }),
      },
    });

    const participants = await Promise.all(
      seeded.map((p) =>
        tx.participant.create({
          data: {
            tournamentId: tournament.id,
            name: p.name,
            seed: p.seed,
          },
        }),
      ),
    );
    const bySeed = new Map(participants.map((p) => [p.seed, p]));

    const groupMap = new Map<string, string>();
    if (generated.groups) {
      for (const g of generated.groups) {
        const row = await tx.group.create({
          data: {
            tournamentId: tournament.id,
            name: g.name,
            order: g.order,
          },
        });
        groupMap.set(g.name, row.id);
        for (const seed of g.seeds) {
          const part = bySeed.get(seed);
          if (part) {
            await tx.participant.update({
              where: { id: part.id },
              data: { groupId: row.id },
            });
          }
        }
      }
    }

    const roundMap = new Map<number, string>();
    for (const r of generated.rounds) {
      const row = await tx.round.create({
        data: {
          tournamentId: tournament.id,
          name: r.name,
          kind: r.kind,
          order: r.order,
          groupId: r.groupName ? groupMap.get(r.groupName) : undefined,
        },
      });
      roundMap.set(r.order, row.id);
    }

    const tempToId = new Map<string, string>();
    for (const m of generated.matches) {
      const roundId = roundMap.get(m.roundOrder)!;
      const row = await tx.match.create({
        data: {
          tournamentId: tournament.id,
          roundId,
          groupId: m.groupName ? groupMap.get(m.groupName) : undefined,
          orderInRound: m.orderInRound,
          participant1Id:
            m.participant1Seed != null
              ? bySeed.get(m.participant1Seed)?.id
              : null,
          participant2Id:
            m.participant2Seed != null
              ? bySeed.get(m.participant2Seed)?.id
              : null,
          isBye: m.isBye,
          slotLabel1: m.slotLabel1 ?? null,
          slotLabel2: m.slotLabel2 ?? null,
        },
      });
      tempToId.set(m.tempId, row.id);

      if (m.isBye) {
        const winnerId =
          m.participant1Seed != null
            ? bySeed.get(m.participant1Seed)?.id
            : m.participant2Seed != null
              ? bySeed.get(m.participant2Seed)?.id
              : null;
        if (winnerId) {
          await tx.match.update({
            where: { id: row.id },
            data: { winnerId, score1: 1, score2: 0 },
          });
        }
      }
    }

    for (const m of generated.matches) {
      const id = tempToId.get(m.tempId)!;
      await tx.match.update({
        where: { id },
        data: {
          nextMatchId: m.nextTempId ? tempToId.get(m.nextTempId) : null,
          nextSlot: m.nextSlot ?? null,
          loserNextMatchId: m.loserNextTempId
            ? tempToId.get(m.loserNextTempId)
            : null,
          loserNextSlot: m.loserNextSlot ?? null,
        },
      });
    }

    const withByes = await tx.match.findMany({
      where: {
        tournamentId: tournament.id,
        isBye: true,
        winnerId: { not: null },
      },
    });
    for (const m of withByes) {
      if (m.nextMatchId && m.winnerId && m.nextSlot) {
        await tx.match.update({
          where: { id: m.nextMatchId },
          data:
            m.nextSlot === 1
              ? { participant1Id: m.winnerId }
              : { participant2Id: m.winnerId },
        });
      }
    }

    return tournament;
  });
}

export async function setMatchScore(input: {
  matchId: string;
  score1: number;
  score2: number;
}) {
  if (!Number.isFinite(input.score1) || !Number.isFinite(input.score2)) {
    throw new Error("Некорректный счёт");
  }
  if (input.score1 < 0 || input.score2 < 0) {
    throw new Error("Счёт не может быть отрицательным");
  }
  if (input.score1 === input.score2) {
    throw new Error("Нужен победитель (ничья не поддерживается в сетке)");
  }

  const match = await prisma.match.findUnique({ where: { id: input.matchId } });
  if (!match) throw new Error("Матч не найден");
  if (!match.participant1Id || !match.participant2Id) {
    throw new Error("Оба участника должны быть назначены");
  }

  const winnerId =
    input.score1 > input.score2 ? match.participant1Id : match.participant2Id;
  const loserId =
    winnerId === match.participant1Id ? match.participant2Id : match.participant1Id;

  // Clear previous advancement if re-scoring
  if (match.winnerId && match.winnerId !== winnerId) {
    await clearAdvancement(match);
  }

  const updated = await prisma.match.update({
    where: { id: match.id },
    data: {
      score1: input.score1,
      score2: input.score2,
      winnerId,
    },
  });

  if (match.nextMatchId && match.nextSlot) {
    await prisma.match.update({
      where: { id: match.nextMatchId },
      data:
        match.nextSlot === 1
          ? { participant1Id: winnerId }
          : { participant2Id: winnerId },
    });
  }

  if (match.loserNextMatchId && match.loserNextSlot && loserId) {
    await prisma.match.update({
      where: { id: match.loserNextMatchId },
      data:
        match.loserNextSlot === 1
          ? { participant1Id: loserId }
          : { participant2Id: loserId },
    });
  }

  publishTournament(match.tournamentId);
  return updated;
}

export async function updateMatchLive(input: {
  matchId: string;
  isLive?: boolean;
  streamUrl?: string | null;
  scheduledAt?: string | null;
  venue?: string | null;
  participant1Id?: string | null;
  participant2Id?: string | null;
}) {
  const match = await prisma.match.findUnique({ where: { id: input.matchId } });
  if (!match) throw new Error("Матч не найден");

  const data: Record<string, unknown> = {};
  if (input.isLive !== undefined) data.isLive = input.isLive;
  if (input.streamUrl !== undefined) {
    data.streamUrl = input.streamUrl?.trim() ? input.streamUrl.trim() : null;
  }
  if (input.scheduledAt !== undefined) {
    data.scheduledAt = input.scheduledAt ? new Date(input.scheduledAt) : null;
  }
  if (input.venue !== undefined) data.venue = input.venue?.trim() || null;
  if (input.participant1Id !== undefined) {
    data.participant1Id = input.participant1Id;
  }
  if (input.participant2Id !== undefined) {
    data.participant2Id = input.participant2Id;
  }

  // Only one live match at a time per tournament when turning live on
  if (input.isLive === true) {
    await prisma.match.updateMany({
      where: { tournamentId: match.tournamentId, isLive: true },
      data: { isLive: false },
    });
  }

  const updated = await prisma.match.update({
    where: { id: match.id },
    data,
  });
  publishTournament(match.tournamentId);
  return updated;
}

/** Swap participants between two match slots (same or different matches). */
export async function swapMatchSlots(input: {
  matchAId: string;
  slotA: 1 | 2;
  matchBId: string;
  slotB: 1 | 2;
}) {
  const [a, b] = await Promise.all([
    prisma.match.findUnique({ where: { id: input.matchAId } }),
    prisma.match.findUnique({ where: { id: input.matchBId } }),
  ]);
  if (!a || !b) throw new Error("Матч не найден");
  if (a.tournamentId !== b.tournamentId) {
    throw new Error("Матчи из разных турниров");
  }
  if (a.winnerId || b.winnerId) {
    throw new Error(
      "Нельзя менять слоты после определения победителя — сначала сбросьте результат",
    );
  }
  if (
    input.matchAId === input.matchBId &&
    input.slotA === input.slotB
  ) {
    return { ok: true as const };
  }

  const getP = (m: typeof a, slot: 1 | 2) =>
    slot === 1 ? m.participant1Id : m.participant2Id;

  const pA = getP(a, input.slotA);
  const pB = getP(b, input.slotB);

  await prisma.$transaction(async (tx) => {
    if (input.matchAId === input.matchBId) {
      const data: Record<string, unknown> = {
        score1: null,
        score2: null,
        winnerId: null,
      };
      if (
        (input.slotA === 1 && input.slotB === 2) ||
        (input.slotA === 2 && input.slotB === 1)
      ) {
        data.participant1Id = a.participant2Id;
        data.participant2Id = a.participant1Id;
        data.score1 = a.score2;
        data.score2 = a.score1;
      } else {
        if (input.slotA === 1) data.participant1Id = pB;
        else data.participant2Id = pB;
        if (input.slotB === 1) data.participant1Id = pA;
        else data.participant2Id = pA;
      }
      await tx.match.update({ where: { id: a.id }, data });
      return;
    }

    const dataA: Record<string, unknown> = {
      winnerId: null,
      score1: null,
      score2: null,
    };
    const dataB: Record<string, unknown> = {
      winnerId: null,
      score1: null,
      score2: null,
    };
    if (input.slotA === 1) dataA.participant1Id = pB;
    else dataA.participant2Id = pB;
    if (input.slotB === 1) dataB.participant1Id = pA;
    else dataB.participant2Id = pA;

    await tx.match.update({ where: { id: a.id }, data: dataA });
    await tx.match.update({ where: { id: b.id }, data: dataB });
  });

  publishTournament(a.tournamentId);
  return { ok: true as const };
}

/** Rank groups; fill playoff first round by professional slot labels (A1, B2…). */
export async function qualifyFromGroups(
  tournamentId: string,
  advancePerGroup = 2,
) {
  const { parseFeedLabel } = await import("./playoffSeeding");

  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    include: {
      groups: { orderBy: { order: "asc" } },
      participants: true,
      matches: true,
      rounds: { orderBy: { order: "asc" } },
    },
  });
  if (!tournament) throw new Error("Турнир не найден");

  const settings = JSON.parse(tournament.settingsJson || "{}") as {
    advancePerGroup?: number;
    standingsTable?: boolean;
  };
  const advance = settings.advancePerGroup ?? advancePerGroup;

  /** Map "A1" / "3" → participant id */
  const byLabel = new Map<string, string>();

  if (settings.standingsTable || tournament.groups.length === 0) {
    const ranked = [...tournament.participants].sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      return a.seed - b.seed;
    });
    ranked.forEach((p, i) => byLabel.set(String(i + 1), p.id));
  } else {
    for (const group of tournament.groups) {
      const members = tournament.participants.filter(
        (p) => p.groupId === group.id,
      );
      const stats = new Map(
        members.map((p) => [p.id, { wins: 0, diff: 0, points: p.points }]),
      );
      for (const m of tournament.matches) {
        if (m.groupId !== group.id || m.winnerId == null) continue;
        if (m.score1 == null || m.score2 == null) continue;
        const st = stats.get(m.winnerId);
        if (st) {
          st.wins += 1;
          st.diff += Math.abs(m.score1 - m.score2);
        }
        const loserId =
          m.winnerId === m.participant1Id
            ? m.participant2Id
            : m.participant1Id;
        if (loserId && stats.has(loserId)) {
          const ls = stats.get(loserId)!;
          ls.diff -= Math.abs(m.score1 - m.score2);
        }
      }
      const ranked = [...members].sort((a, b) => {
        const sa = stats.get(a.id)!;
        const sb = stats.get(b.id)!;
        if (sb.wins !== sa.wins) return sb.wins - sa.wins;
        if (sb.points !== sa.points) return sb.points - sa.points;
        return sb.diff - sa.diff;
      });
      const letter = String.fromCharCode(65 + group.order);
      ranked.slice(0, advance).forEach((p, idx) => {
        byLabel.set(`${letter}${idx + 1}`, p.id);
      });
    }
  }

  const playoffRounds = tournament.rounds.filter(
    (r) =>
      !r.groupId &&
      (r.kind === "PLAYOFF" ||
        r.kind === "WB" ||
        r.kind === "FINAL" ||
        r.kind === "LB"),
  );
  if (!playoffRounds.length) {
    publishTournament(tournamentId);
    return { filled: 0 };
  }

  const firstPlayoffOrder = Math.min(...playoffRounds.map((r) => r.order));
  const firstRound = playoffRounds.find((r) => r.order === firstPlayoffOrder)!;
  const firstMatches = tournament.matches
    .filter((m) => m.roundId === firstRound.id)
    .sort((a, b) => a.orderInRound - b.orderInRound);

  let filled = 0;
  for (const m of firstMatches) {
    const resolve = (label: string | null | undefined) => {
      if (!label) return null;
      if (byLabel.has(label)) return byLabel.get(label)!;
      const parsed = parseFeedLabel(label);
      if (!parsed) return null;
      if ("standing" in parsed) {
        return byLabel.get(String(parsed.standing)) ?? null;
      }
      const letter = String.fromCharCode(65 + parsed.groupOrder);
      return byLabel.get(`${letter}${parsed.place}`) ?? null;
    };

    const p1 = resolve(m.slotLabel1);
    const p2 = resolve(m.slotLabel2);
    await prisma.match.update({
      where: { id: m.id },
      data: {
        participant1Id: p1,
        participant2Id: p2,
      },
    });
    if (p1 || p2) filled += 1;
  }

  publishTournament(tournamentId);
  return { filled, qualifiedCount: byLabel.size };
}

async function clearAdvancement(match: {
  id: string;
  winnerId: string | null;
  nextMatchId: string | null;
  nextSlot: number | null;
  loserNextMatchId: string | null;
  loserNextSlot: number | null;
  participant1Id: string | null;
  participant2Id: string | null;
}) {
  if (match.nextMatchId && match.nextSlot && match.winnerId) {
    const next = await prisma.match.findUnique({ where: { id: match.nextMatchId } });
    if (next) {
      const data =
        match.nextSlot === 1
          ? next.participant1Id === match.winnerId
            ? { participant1Id: null, winnerId: null, score1: null, score2: null }
            : {}
          : next.participant2Id === match.winnerId
            ? { participant2Id: null, winnerId: null, score1: null, score2: null }
            : {};
      if (Object.keys(data).length) {
        await prisma.match.update({ where: { id: next.id }, data });
      }
    }
  }
}
