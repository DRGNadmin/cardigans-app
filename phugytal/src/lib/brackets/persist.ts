import type { TournamentFormat } from "@prisma/client";
import { prisma } from "@/lib/db";
import { applySeeding, generateBracket, type SeedingMode } from "@/lib/brackets";

export async function createTournamentWithBracket(input: {
  discipline: string;
  name: string;
  format: TournamentFormat;
  participantNames: string[];
  seedingMode: SeedingMode;
  groupCount?: number;
  swissRounds?: number;
}) {
  const seeded = applySeeding(
    input.participantNames.map((name) => ({ name })),
    input.seedingMode,
  );
  const generated = generateBracket(input.format, seeded.length, {
    groupCount: input.groupCount,
    swissRounds: input.swissRounds,
  });

  return prisma.$transaction(async (tx) => {
    const tournament = await tx.tournament.create({
      data: {
        discipline: input.discipline,
        name: input.name,
        format: input.format,
        status: "ACTIVE",
        settingsJson: JSON.stringify({
          seedingMode: input.seedingMode,
          groupCount: input.groupCount,
          swissRounds: input.swissRounds,
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
        },
      });
      roundMap.set(r.order, row.id);
    }

    const tempToId = new Map<string, string>();
    // Create matches without next links first
    for (const m of generated.matches) {
      const roundId = roundMap.get(m.roundOrder)!;
      const row = await tx.match.create({
        data: {
          tournamentId: tournament.id,
          roundId,
          groupId: m.groupName ? groupMap.get(m.groupName) : undefined,
          orderInRound: m.orderInRound,
          participant1Id:
            m.participant1Seed != null ? bySeed.get(m.participant1Seed)?.id : null,
          participant2Id:
            m.participant2Seed != null ? bySeed.get(m.participant2Seed)?.id : null,
          isBye: m.isBye,
        },
      });
      tempToId.set(m.tempId, row.id);

      // Auto-advance byes
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

    // Propagate bye winners into next matches
    const withByes = await tx.match.findMany({
      where: { tournamentId: tournament.id, isBye: true, winnerId: { not: null } },
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

  return updated;
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
