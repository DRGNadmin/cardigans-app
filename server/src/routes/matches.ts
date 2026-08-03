import type { FastifyInstance } from "fastify";
import { prisma } from "../db.js";
import { Game } from "@prisma/client";
import { promoteScheduledMatchesToLive } from "../services/matchLifecycle.js";

export async function matchesRoutes(fastify: FastifyInstance) {
  fastify.get(
    "/api/v1/matches",
    { preHandler: [fastify.authenticate] },
    async (request) => {
      await promoteScheduledMatchesToLive();
      const query = request.query as { game?: string };
      const game =
        query.game === Game.CS2 || query.game === Game.DOTA2 ? query.game : undefined;
      const rows = await prisma.match.findMany({
        where: {
          deletedAt: null,
          status: { in: ["scheduled", "live"] },
          /* После закрытия прогнозов матч должен оставаться в ленте до завершения / отмены. */
          ...(game ? { game } : {}),
        },
        orderBy: { startsAt: "asc" },
        include: {
          options: { orderBy: { sort: "asc" } },
        },
      });
      return rows.map(serializeMatch);
    }
  );

  /** Завершённые матчи (архив для пользователей). */
  fastify.get(
    "/api/v1/matches/archive",
    { preHandler: [fastify.authenticate] },
    async (request) => {
      await promoteScheduledMatchesToLive();
      const query = request.query as { game?: string };
      const game =
        query.game === Game.CS2 || query.game === Game.DOTA2 ? query.game : undefined;
      const rows = await prisma.match.findMany({
        where: {
          deletedAt: null,
          status: "finished",
          ...(game ? { game } : {}),
        },
        orderBy: { startsAt: "desc" },
        take: 100,
        include: {
          options: { orderBy: { sort: "asc" } },
        },
      });
      return rows.map(serializeMatch);
    }
  );

  fastify.get(
    "/api/v1/matches/:id",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      await promoteScheduledMatchesToLive();
      const { id } = request.params as { id: string };
      const row = await prisma.match.findFirst({
        where: { id, deletedAt: null },
        include: {
          options: { orderBy: { sort: "asc" } },
        },
      });
      if (!row) return reply.status(404).send({ error: "Not found" });
      return serializeMatch(row);
    }
  );
}

function serializeMatch(row: {
  id: string;
  game: string;
  teamA: string;
  teamB: string;
  teamALogoUrl: string | null;
  teamBLogoUrl: string | null;
  streamUrl: string | null;
  startsAt: Date;
  predictionEndsAt: Date;
  status: string;
  rewardGems: number;
  winningOptionId: string | null;
  options: { id: string; label: string; sort: number }[];
}) {
  return {
    id: row.id,
    game: row.game,
    teamA: row.teamA,
    teamB: row.teamB,
    teamALogoUrl: row.teamALogoUrl,
    teamBLogoUrl: row.teamBLogoUrl,
    streamUrl: row.streamUrl,
    startsAt: row.startsAt.toISOString(),
    predictionEndsAt: row.predictionEndsAt.toISOString(),
    status: row.status,
    rewardGems: row.rewardGems,
    winningOptionId: row.winningOptionId,
    options: row.options.map((o) => ({
      id: o.id,
      label: o.label,
      sort: o.sort,
    })),
  };
}
