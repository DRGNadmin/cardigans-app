import type { FastifyInstance } from "fastify";
import type { Game } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../db.js";
import { promoteScheduledMatchesToLive } from "../services/matchLifecycle.js";
import { XP_PREDICTION_PLACED, addXp } from "../services/xp.js";

const bodySchema = z.object({
  matchId: z.string(),
  optionId: z.string(),
});

export async function predictionsRoutes(fastify: FastifyInstance) {
  fastify.post(
    "/api/v1/predictions",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const parsed = bodySchema.safeParse(request.body);
      if (!parsed.success) return reply.status(400).send({ error: "Invalid body" });
      const userId = request.userId!;
      const { matchId, optionId } = parsed.data;

      const match = await prisma.match.findFirst({
        where: { id: matchId, deletedAt: null },
        include: { options: true },
      });
      if (!match || match.status === "cancelled") {
        return reply.status(400).send({ error: "Match not available" });
      }
      const now = new Date();
      if (now >= match.predictionEndsAt) {
        return reply.status(400).send({ error: "Prediction window closed" });
      }
      const validOption = match.options.some((o) => o.id === optionId);
      if (!validOption) {
        return reply.status(400).send({ error: "Invalid option" });
      }

      try {
        const prediction = await prisma.prediction.create({
          data: { userId, matchId, optionId },
        });
        await addXp(userId, XP_PREDICTION_PLACED);
        await bumpPredictionTasks(userId);
        await bumpPredictionGameTasks(userId, match.game);
        return {
          id: prediction.id,
          matchId: prediction.matchId,
          optionId: prediction.optionId,
          createdAt: prediction.createdAt.toISOString(),
        };
      } catch (e: unknown) {
        const code = (e as { code?: string })?.code;
        if (code === "P2002") {
          return reply.status(409).send({ error: "Already predicted for this match" });
        }
        throw e;
      }
    }
  );

  fastify.get(
    "/api/v1/predictions/me",
    { preHandler: [fastify.authenticate] },
    async (request) => {
      await promoteScheduledMatchesToLive();
      const userId = request.userId!;
      const rows = await prisma.prediction.findMany({
        where: {
          userId,
          match: { deletedAt: null },
        },
        include: {
          match: {
            include: { options: { orderBy: { sort: "asc" } } },
          },
          option: true,
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      });
      return rows.map((r) => ({
        id: r.id,
        match: {
          id: r.match.id,
          teamA: r.match.teamA,
          teamB: r.match.teamB,
          teamALogoUrl: r.match.teamALogoUrl,
          teamBLogoUrl: r.match.teamBLogoUrl,
          status: r.match.status,
          startsAt: r.match.startsAt.toISOString(),
          winningOptionId: r.match.winningOptionId,
          rewardGems: r.match.rewardGems,
        },
        optionId: r.optionId,
        optionLabel: r.option.label,
        rewardPaid: r.rewardPaid,
        rewardGemsPaid: r.rewardGemsPaid,
        createdAt: r.createdAt.toISOString(),
      }));
    }
  );
}

async function bumpPredictionTasks(userId: string) {
  const tasks = await prisma.task.findMany({
    where: { type: "predictions_count", isActive: true },
  });
  for (const t of tasks) {
    const target = t.targetCount ?? 1;
    const ut = await prisma.userTask.upsert({
      where: { userId_taskId: { userId, taskId: t.id } },
      create: { userId, taskId: t.id, progress: 1, completed: false },
      update: { progress: { increment: 1 } },
    });
    const progress = ut.progress;
    if (!ut.completed && progress >= target) {
      await prisma.userTask.update({
        where: { id: ut.id },
        data: { completed: true, completedAt: new Date(), progress },
      });
    }
  }
}

async function bumpPredictionGameTasks(userId: string, game: Game) {
  const tasks = await prisma.task.findMany({
    where: { type: "predictions_game", isActive: true, game },
  });
  for (const t of tasks) {
    const target = t.targetCount ?? 1;
    const ut = await prisma.userTask.upsert({
      where: { userId_taskId: { userId, taskId: t.id } },
      create: { userId, taskId: t.id, progress: 1, completed: false },
      update: { progress: { increment: 1 } },
    });
    const progress = ut.progress;
    if (!ut.completed && progress >= target) {
      await prisma.userTask.update({
        where: { id: ut.id },
        data: { completed: true, completedAt: new Date(), progress },
      });
    }
  }
}
