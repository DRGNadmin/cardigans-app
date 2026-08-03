import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { Config } from "../config.js";
import { prisma } from "../db.js";
import { parseAdminTelegramIds } from "../lib/adminTelegramIds.js";
import { normalizeSteamTradeUrl, STEAM_TRADE_URL_INVALID } from "../lib/steamTradeUrl.js";
import { syncUserTaskProgress } from "../services/taskProgress.js";
import { levelProgress } from "../services/xp.js";

const patchSchema = z.object({
  steamTradeUrl: z.union([z.string().max(512), z.null()]).optional(),
});

export async function meRoutes(fastify: FastifyInstance, config: Config) {
  const adminIds = parseAdminTelegramIds(config.ADMIN_TELEGRAM_IDS);

  fastify.get(
    "/api/v1/me",
    { preHandler: [fastify.authenticate] },
    async (request) => {
      const userId = request.userId!;
      await syncUserTaskProgress(userId, adminIds);
      const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
      const lp = levelProgress(user.xpTotal);
      return {
        id: user.id,
        telegramId: user.telegramId.toString(),
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        gemsBalance: user.gemsBalance,
        steamTradeUrl: user.steamTradeUrl,
        isAdmin: adminIds.includes(user.telegramId.toString()),
        xpTotal: user.xpTotal,
        level: lp.level,
        xpInLevel: lp.xpInLevel,
        xpToNextLevel: lp.xpToNextLevel,
        levelProgressPct: lp.progressPct,
      };
    }
  );

  fastify.patch(
    "/api/v1/me",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const parsed = patchSchema.safeParse(request.body);
      if (!parsed.success) return reply.status(400).send({ error: "Invalid body" });
      const userId = request.userId!;

      let nextTradeUrl: string | null | undefined;
      if (parsed.data.steamTradeUrl === undefined) {
        nextTradeUrl = undefined;
      } else if (parsed.data.steamTradeUrl === null) {
        nextTradeUrl = null;
      } else {
        const raw = parsed.data.steamTradeUrl.trim();
        if (!raw) {
          nextTradeUrl = null;
        } else {
          const normalized = normalizeSteamTradeUrl(raw);
          if (!normalized) {
            return reply.status(400).send({ error: STEAM_TRADE_URL_INVALID });
          }
          nextTradeUrl = normalized;
        }
      }

      const user = await prisma.user.update({
        where: { id: userId },
        data: { steamTradeUrl: nextTradeUrl },
      });
      return {
        id: user.id,
        telegramId: user.telegramId.toString(),
        gemsBalance: user.gemsBalance,
        steamTradeUrl: user.steamTradeUrl,
      };
    }
  );

  fastify.get(
    "/api/v1/me/ledger",
    { preHandler: [fastify.authenticate] },
    async (request) => {
      const userId = request.userId!;
      const rows = await prisma.ledgerTransaction.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 100,
      });
      return rows.map((r) => ({
        id: r.id,
        amount: r.amount,
        type: r.type,
        createdAt: r.createdAt.toISOString(),
      }));
    }
  );
}
