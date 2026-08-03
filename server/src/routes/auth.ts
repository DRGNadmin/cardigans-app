import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../db.js";
import { parseInitDataUser, validateTelegramInitData } from "../lib/telegram.js";
import type { Config } from "../config.js";

const bodySchema = z.object({
  initData: z.string().min(1),
});

export async function authRoutes(fastify: FastifyInstance, config: Config) {
  fastify.post("/api/v1/auth/telegram", async (request, reply) => {
    const parsed = bodySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "Invalid body" });
    }
    const { initData } = parsed.data;
    if (!validateTelegramInitData(initData, config.BOT_TOKEN)) {
      return reply.status(401).send({ error: "Invalid initData" });
    }
    const tgUser = parseInitDataUser(initData);
    if (!tgUser) {
      return reply.status(400).send({ error: "Missing user in initData" });
    }

    const user = await prisma.user.upsert({
      where: { telegramId: tgUser.id },
      create: {
        telegramId: tgUser.id,
        username: tgUser.username ?? null,
        firstName: tgUser.first_name ?? null,
        lastName: tgUser.last_name ?? null,
      },
      update: {
        username: tgUser.username ?? null,
        firstName: tgUser.first_name ?? null,
        lastName: tgUser.last_name ?? null,
      },
    });

    const token = fastify.jwt.sign({ sub: user.id, role: "user" });
    return { accessToken: token, user: serializeUser(user) };
  });
}

function serializeUser(u: {
  id: string;
  telegramId: bigint;
  username: string | null;
  gemsBalance: number;
  steamTradeUrl: string | null;
}) {
  return {
    id: u.id,
    telegramId: u.telegramId.toString(),
    username: u.username,
    gemsBalance: u.gemsBalance,
    steamTradeUrl: u.steamTradeUrl,
  };
}
