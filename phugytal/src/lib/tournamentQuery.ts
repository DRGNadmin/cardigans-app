import { prisma } from "@/lib/db";

export async function getActiveTournament(discipline: string) {
  return prisma.tournament.findFirst({
    where: {
      discipline,
      status: { in: ["ACTIVE", "COMPLETED"] },
    },
    orderBy: { updatedAt: "desc" },
    include: {
      participants: { orderBy: { seed: "asc" } },
      rounds: { orderBy: { order: "asc" } },
      matches: { orderBy: [{ orderInRound: "asc" }] },
      groups: { orderBy: { order: "asc" } },
    },
  });
}

export function serializeTournament(
  t: NonNullable<Awaited<ReturnType<typeof getActiveTournament>>>,
) {
  return {
    id: t.id,
    name: t.name,
    format: t.format,
    status: t.status,
    participants: t.participants.map((p) => ({
      id: p.id,
      name: p.name,
      seed: p.seed,
      groupId: p.groupId,
    })),
    rounds: t.rounds.map((r) => ({
      id: r.id,
      name: r.name,
      kind: r.kind,
      order: r.order,
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
    })),
    groups: t.groups.map((g) => ({
      id: g.id,
      name: g.name,
      order: g.order,
    })),
  };
}
