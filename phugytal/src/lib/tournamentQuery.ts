import { prisma } from "@/lib/db";

function tournamentInclude() {
  return {
    participants: { orderBy: { seed: "asc" as const } },
    rounds: { orderBy: { order: "asc" as const } },
    matches: {
      orderBy: [
        { round: { order: "asc" as const } },
        { orderInRound: "asc" as const },
      ],
    },
    groups: { orderBy: { order: "asc" as const } },
  };
}

export async function getActiveTournament(discipline: string) {
  return prisma.tournament.findFirst({
    where: {
      discipline,
      status: { in: ["ACTIVE", "COMPLETED"] },
    },
    orderBy: { updatedAt: "desc" },
    include: tournamentInclude(),
  });
}

export async function getTournamentById(id: string) {
  return prisma.tournament.findUnique({
    where: { id },
    include: tournamentInclude(),
  });
}

export function serializeTournament(
  t: NonNullable<Awaited<ReturnType<typeof getActiveTournament>>>,
) {
  let settings: Record<string, unknown> = {};
  try {
    settings = JSON.parse(t.settingsJson || "{}") as Record<string, unknown>;
  } catch {
    settings = {};
  }

  return {
    id: t.id,
    name: t.name,
    discipline: t.discipline,
    format: t.format,
    status: t.status,
    streamUrl: t.streamUrl,
    settings,
    participants: t.participants.map((p) => ({
      id: p.id,
      name: p.name,
      seed: p.seed,
      groupId: p.groupId,
      points: p.points,
      statusText: p.statusText,
      logoUrl: p.logoUrl,
    })),
    rounds: t.rounds.map((r) => ({
      id: r.id,
      name: r.name,
      kind: r.kind,
      order: r.order,
      groupId: r.groupId,
    })),
    matches: t.matches.map((m) => ({
      id: m.id,
      roundId: m.roundId,
      orderInRound: m.orderInRound,
      participant1Id: m.participant1Id,
      participant2Id: m.participant2Id,
      score1: m.score1,
      score2: m.score2,
      winnerId: m.winnerId,
      scheduledAt: m.scheduledAt?.toISOString() ?? null,
      venue: m.venue,
      groupId: m.groupId,
      isLive: m.isLive,
      streamUrl: m.streamUrl,
      slotLabel1: m.slotLabel1,
      slotLabel2: m.slotLabel2,
      isBye: m.isBye,
      nextMatchId: m.nextMatchId,
      nextSlot: m.nextSlot,
      loserNextMatchId: m.loserNextMatchId,
      loserNextSlot: m.loserNextSlot,
    })),
    groups: t.groups.map((g) => ({
      id: g.id,
      name: g.name,
      order: g.order,
    })),
  };
}

export type SerializedTournament = ReturnType<typeof serializeTournament>;
