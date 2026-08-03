import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  Game,
  MatchStatus,
  OrderStatus,
  ShopItemRarity,
  SupportTicketStatus,
  TaskType,
} from "@prisma/client";
import { prisma } from "../db.js";
import { hashPassword, verifyPassword } from "../lib/password.js";
import { signAdminToken } from "../adminJwt.js";
import type { Config } from "../config.js";
import { applyLedgerTx } from "../services/ledger.js";
import { settleMatchRewards } from "../services/matchRewards.js";
import {
  notifyAllUsersNewMatch,
  notifyMatchFinishedPredictions,
  notifyOrderStatusChange,
  notifyUserSupportReply,
} from "../services/telegramNotify.js";
import { parseInitDataUser, validateTelegramInitData } from "../lib/telegram.js";
import { promoteScheduledMatchesToLive } from "../services/matchLifecycle.js";

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

/** URL логотипа, очистка через null или "" (PATCH из админки шлёт null). */
const optionalLogoUrl = z
  .union([z.string().url().max(1024), z.literal(""), z.null()])
  .optional()
  .transform((v) => (v === undefined || v === "" ? undefined : v === null ? null : v));

const optionalShopImageUrl = z
  .union([z.string().url().max(2048), z.literal(""), z.null()])
  .optional()
  .transform((v) => (v === undefined ? undefined : v === "" || v === null ? null : v));

const optionalMatchStreamUrl = z
  .union([z.string().url().max(2048), z.literal(""), z.null()])
  .optional()
  .transform((v) => (v === undefined ? undefined : v === "" || v === null ? null : v));

const matchCreateSchema = z.object({
  game: z.nativeEnum(Game),
  teamA: z.string().min(1),
  teamB: z.string().min(1),
  teamALogoUrl: optionalLogoUrl,
  teamBLogoUrl: optionalLogoUrl,
  streamUrl: optionalMatchStreamUrl,
  startsAt: z.string().datetime(),
  predictionEndsAt: z.string().datetime(),
  rewardGems: z.number().int().min(0),
  options: z.array(z.object({ label: z.string().min(1), sort: z.number().int().optional() })).min(2),
});

const matchUpdateSchema = matchCreateSchema.partial().extend({
  status: z.nativeEnum(MatchStatus).optional(),
  winningOptionId: z.string().nullable().optional(),
  /** Только смена подписей существующих исходов (id из options матча). */
  options: z.array(z.object({ id: z.string(), label: z.string().min(1) })).optional(),
});

const shopItemSchema = z.object({
  game: z.nativeEnum(Game),
  title: z.string().min(1),
  rarity: z.nativeEnum(ShopItemRarity).optional(),
  imageUrl: optionalShopImageUrl,
  priceGems: z.number().int().min(1),
  stock: z.number().int().min(0),
  isActive: z.boolean().optional(),
});

const taskSchema = z.object({
  key: z.string().min(1).nullable().optional(),
  title: z.string().min(1),
  description: z.string().nullable().optional(),
  rewardGems: z.number().int().min(0),
  type: z.nativeEnum(TaskType),
  channelId: z.string().nullable().optional(),
  game: z.nativeEnum(Game).nullable().optional(),
  targetCount: z.number().int().min(1).nullable().optional(),
  sort: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

const orderStatusSchema = z.object({
  status: z.nativeEnum(OrderStatus),
});

const adjustGemsSchema = z.object({
  userId: z.string(),
  amount: z.number().int(),
  note: z.string().optional(),
});

const supportTicketPatchSchema = z.object({
  adminReply: z.string().min(1).max(8000).optional(),
  status: z.nativeEnum(SupportTicketStatus).optional(),
});

const telegramAuthSchema = z.object({
  initData: z.string().min(1),
});

export async function adminRoutes(fastify: FastifyInstance, config: Config) {
  const adminTelegramIds = config.ADMIN_TELEGRAM_IDS.split(",")
    .map((id) => id.trim())
    .map((id) => id.replace(/[^\d]/g, ""))
    .filter(Boolean);

  fastify.post("/api/v1/admin/auth/telegram", async (request, reply) => {
    const parsed = telegramAuthSchema.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ error: "Invalid body" });

    const { initData } = parsed.data;
    if (!validateTelegramInitData(initData, config.BOT_TOKEN)) {
      return reply.status(401).send({ error: "Invalid initData" });
    }

    const tgUser = parseInitDataUser(initData);
    if (!tgUser) return reply.status(400).send({ error: "Missing user in initData" });

    const telegramId = tgUser.id.toString().replace(/[^\d]/g, "");
    if (!adminTelegramIds.includes(telegramId)) {
      return reply.status(403).send({ error: `Admin access denied for telegram id ${telegramId}` });
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

    const token = signAdminToken(user.id, config.ADMIN_JWT_SECRET);
    return { accessToken: token, adminTelegramId: telegramId };
  });

  fastify.post("/api/v1/admin/login", async (request, reply) => {
    const parsed = loginSchema.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ error: "Invalid body" });
    const admin = await prisma.adminUser.findUnique({
      where: { username: parsed.data.username },
    });
    if (!admin || !verifyPassword(parsed.data.password, admin.passwordHash)) {
      return reply.status(401).send({ error: "Invalid credentials" });
    }
    const token = signAdminToken(admin.id, config.ADMIN_JWT_SECRET);
    return { accessToken: token };
  });

  fastify.get(
    "/api/v1/admin/matches",
    { preHandler: [fastify.authenticateAdmin] },
    async () => {
      await promoteScheduledMatchesToLive();
      const rows = await prisma.match.findMany({
        orderBy: { startsAt: "desc" },
        include: { options: { orderBy: { sort: "asc" } } },
        take: 200,
      });
      return rows.map((m) => ({
        id: m.id,
        game: m.game,
        teamA: m.teamA,
        teamB: m.teamB,
        teamALogoUrl: m.teamALogoUrl,
        teamBLogoUrl: m.teamBLogoUrl,
        startsAt: m.startsAt.toISOString(),
        predictionEndsAt: m.predictionEndsAt.toISOString(),
        streamUrl: m.streamUrl,
        status: m.status,
        winningOptionId: m.winningOptionId,
        rewardGems: m.rewardGems,
        deletedAt: m.deletedAt?.toISOString() ?? null,
        options: m.options.map((o) => ({
          id: o.id,
          label: o.label,
          sort: o.sort,
        })),
      }));
    }
  );

  fastify.post(
    "/api/v1/admin/matches",
    { preHandler: [fastify.authenticateAdmin] },
    async (request, reply) => {
      const parsed = matchCreateSchema.safeParse(request.body);
      if (!parsed.success) return reply.status(400).send({ error: "Invalid body" });
      const d = parsed.data;
      const match = await prisma.match.create({
        data: {
          game: d.game,
          teamA: d.teamA,
          teamB: d.teamB,
          teamALogoUrl: d.teamALogoUrl ?? null,
          teamBLogoUrl: d.teamBLogoUrl ?? null,
          streamUrl: d.streamUrl ?? null,
          startsAt: new Date(d.startsAt),
          predictionEndsAt: new Date(d.predictionEndsAt),
          rewardGems: d.rewardGems,
          options: {
            create: d.options.map((o, i) => ({
              label: o.label,
              sort: o.sort ?? i,
            })),
          },
        },
        include: { options: true },
      });
      void notifyAllUsersNewMatch(config, match, request.log).catch((err) => {
        request.log.error({ err, msg: "notifyAllUsersNewMatch_failed" });
      });
      return { id: match.id };
    }
  );

  fastify.patch(
    "/api/v1/admin/matches/:id",
    { preHandler: [fastify.authenticateAdmin] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const parsed = matchUpdateSchema.safeParse(request.body);
      if (!parsed.success) return reply.status(400).send({ error: "Invalid body" });
      const d = parsed.data;

      const existing = await prisma.match.findUnique({
        where: { id },
        include: { options: true },
      });
      if (!existing) return reply.status(404).send({ error: "Not found" });
      if (existing.deletedAt) {
        return reply.status(400).send({ error: "Match was deleted" });
      }

      if (d.winningOptionId) {
        const ok = existing.options.some((o) => o.id === d.winningOptionId);
        if (!ok) return reply.status(400).send({ error: "winningOptionId must belong to this match" });
      }

      if (d.options?.length) {
        const ids = new Set(existing.options.map((o) => o.id));
        for (const o of d.options) {
          if (!ids.has(o.id)) {
            return reply.status(400).send({ error: "Invalid option id in options[]" });
          }
        }
      }

      const match = await prisma.match.update({
        where: { id },
        data: {
          ...(d.game !== undefined ? { game: d.game } : {}),
          ...(d.teamA !== undefined ? { teamA: d.teamA } : {}),
          ...(d.teamB !== undefined ? { teamB: d.teamB } : {}),
          ...(d.teamALogoUrl !== undefined ? { teamALogoUrl: d.teamALogoUrl ?? null } : {}),
          ...(d.teamBLogoUrl !== undefined ? { teamBLogoUrl: d.teamBLogoUrl ?? null } : {}),
          ...(d.streamUrl !== undefined ? { streamUrl: d.streamUrl ?? null } : {}),
          ...(d.startsAt !== undefined ? { startsAt: new Date(d.startsAt) } : {}),
          ...(d.predictionEndsAt !== undefined
            ? { predictionEndsAt: new Date(d.predictionEndsAt) }
            : {}),
          ...(d.rewardGems !== undefined ? { rewardGems: d.rewardGems } : {}),
          ...(d.status !== undefined ? { status: d.status } : {}),
          ...(d.winningOptionId !== undefined ? { winningOptionId: d.winningOptionId } : {}),
        },
      });

      if (d.options?.length) {
        for (const o of d.options) {
          await prisma.predictionOption.update({
            where: { id: o.id },
            data: { label: o.label },
          });
        }
      }

      if (match.status === "finished" && match.winningOptionId) {
        await settleMatchRewards(match.id);
        await notifyMatchFinishedPredictions(config, match.id, request.log);
      }
      return { ok: true };
    }
  );

  /** Мягкое удаление: матч исчезает у пользователей (лента, архив, профиль). */
  fastify.delete(
    "/api/v1/admin/matches/:id",
    { preHandler: [fastify.authenticateAdmin] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const m = await prisma.match.findUnique({ where: { id } });
      if (!m) return reply.status(404).send({ error: "Not found" });
      if (m.deletedAt) return { ok: true };
      await prisma.match.update({
        where: { id },
        data: { deletedAt: new Date() },
      });
      return { ok: true };
    }
  );

  fastify.post(
    "/api/v1/admin/matches/:id/settle",
    { preHandler: [fastify.authenticateAdmin] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const m0 = await prisma.match.findUnique({ where: { id } });
      if (!m0) return reply.status(404).send({ error: "Not found" });
      if (m0.deletedAt) return reply.status(400).send({ error: "Match was deleted" });
      const result = await settleMatchRewards(id);
      const m = await prisma.match.findUnique({ where: { id } });
      if (m?.status === "finished" && m.winningOptionId) {
        await notifyMatchFinishedPredictions(config, id, request.log);
      }
      return result;
    }
  );

  fastify.get(
    "/api/v1/admin/shop/items",
    { preHandler: [fastify.authenticateAdmin] },
    async () => {
      return prisma.shopItem.findMany({ orderBy: { createdAt: "desc" } });
    }
  );

  fastify.post(
    "/api/v1/admin/shop/items",
    { preHandler: [fastify.authenticateAdmin] },
    async (request, reply) => {
      const parsed = shopItemSchema.safeParse(request.body);
      if (!parsed.success) return reply.status(400).send({ error: "Invalid body" });
      const d = parsed.data;
      const item = await prisma.shopItem.create({
        data: {
          game: d.game,
          title: d.title,
          rarity: d.rarity ?? ShopItemRarity.restricted,
          imageUrl: d.imageUrl ?? null,
          priceGems: d.priceGems,
          stock: d.stock,
          isActive: d.isActive ?? true,
        },
      });
      return { id: item.id };
    }
  );

  fastify.patch(
    "/api/v1/admin/shop/items/:id",
    { preHandler: [fastify.authenticateAdmin] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const parsed = shopItemSchema.partial().safeParse(request.body);
      if (!parsed.success) return reply.status(400).send({ error: "Invalid body" });
      if (Object.keys(parsed.data).length === 0) {
        return reply.status(400).send({ error: "Nothing to update" });
      }
      await prisma.shopItem.update({ where: { id }, data: parsed.data });
      return { ok: true };
    }
  );

  fastify.delete(
    "/api/v1/admin/shop/items/:id",
    { preHandler: [fastify.authenticateAdmin] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const orderCount = await prisma.order.count({ where: { shopItemId: id } });
      if (orderCount > 0) {
        return reply.status(400).send({
          error: `Нельзя удалить лот: есть ${orderCount} заказ(ов).`,
        });
      }
      await prisma.shopItem.delete({ where: { id } });
      return { ok: true };
    }
  );

  /** Сводка для админки: пользователи, заказы, матчи, поддержка (без ledger). */
  fastify.get(
    "/api/v1/admin/stats",
    { preHandler: [fastify.authenticateAdmin] },
    async () => {
      const orderStatuses: OrderStatus[] = ["new", "contact_sent", "completed", "cancelled"];
      const matchStatuses: MatchStatus[] = ["scheduled", "live", "finished", "cancelled"];
      const ticketStatuses: SupportTicketStatus[] = ["open", "answered", "closed"];

      const [userAgg, orderGroups, matchGroups, deletedMatches, ticketGroups] = await Promise.all([
        prisma.user.aggregate({
          _count: { id: true },
          _sum: { gemsBalance: true },
        }),
        prisma.order.groupBy({ by: ["status"], _count: { _all: true } }),
        prisma.match.groupBy({
          by: ["status"],
          where: { deletedAt: null },
          _count: { _all: true },
        }),
        prisma.match.count({ where: { deletedAt: { not: null } } }),
        prisma.supportTicket.groupBy({ by: ["status"], _count: { _all: true } }),
      ]);

      const ordersByStatus = Object.fromEntries(orderStatuses.map((s) => [s, 0])) as Record<
        OrderStatus,
        number
      >;
      for (const g of orderGroups) ordersByStatus[g.status] = g._count._all;

      const matchesByStatus = Object.fromEntries(matchStatuses.map((s) => [s, 0])) as Record<
        MatchStatus,
        number
      >;
      for (const g of matchGroups) matchesByStatus[g.status] = g._count._all;

      const ticketsByStatus = Object.fromEntries(ticketStatuses.map((s) => [s, 0])) as Record<
        SupportTicketStatus,
        number
      >;
      for (const g of ticketGroups) ticketsByStatus[g.status] = g._count._all;

      const ordersTotal = orderGroups.reduce((acc, g) => acc + g._count._all, 0);

      return {
        usersCount: userAgg._count.id,
        gemsBalanceSum: userAgg._sum.gemsBalance ?? 0,
        ordersTotal,
        ordersByStatus,
        matchesByStatus,
        matchesDeletedFromUsers: deletedMatches,
        ticketsByStatus,
      };
    }
  );

  fastify.get(
    "/api/v1/admin/users",
    { preHandler: [fastify.authenticateAdmin] },
    async () => {
      const users = await prisma.user.findMany({
        orderBy: { createdAt: "desc" },
        take: 200,
        include: {
          orders: true,
        },
      });
      return users.map((u) => ({
        id: u.id,
        telegramId: u.telegramId.toString(),
        username: u.username,
        firstName: u.firstName,
        lastName: u.lastName,
        gemsBalance: u.gemsBalance,
        steamTradeUrl: u.steamTradeUrl,
        ordersCount: u.orders.length,
      }));
    }
  );

  fastify.get(
    "/api/v1/admin/orders",
    { preHandler: [fastify.authenticateAdmin] },
    async () => {
      const orders = await prisma.order.findMany({
        orderBy: { createdAt: "desc" },
        take: 200,
        include: {
          shopItem: true,
          user: true,
        },
      });
      return orders.map((o) => ({
        id: o.id,
        status: o.status,
        priceGems: o.priceGems,
        createdAt: o.createdAt.toISOString(),
        item: {
          id: o.shopItem.id,
          title: o.shopItem.title,
          game: o.shopItem.game,
        },
        user: {
          id: o.user.id,
          telegramId: o.user.telegramId.toString(),
          username: o.user.username,
          firstName: o.user.firstName,
          lastName: o.user.lastName,
          steamTradeUrl: o.user.steamTradeUrl,
        },
      }));
    }
  );

  fastify.patch(
    "/api/v1/admin/orders/:id",
    { preHandler: [fastify.authenticateAdmin] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const parsed = orderStatusSchema.safeParse(request.body);
      if (!parsed.success) return reply.status(400).send({ error: "Invalid body" });
      const before = await prisma.order.findUnique({
        where: { id },
        include: { user: true, shopItem: true },
      });
      if (!before) return reply.status(404).send({ error: "Not found" });
      if (before.status === parsed.data.status) return { ok: true };
      await prisma.order.update({
        where: { id },
        data: { status: parsed.data.status },
      });
      void notifyOrderStatusChange(config, before, parsed.data.status, request.log).catch((err) => {
        request.log.error({ err, msg: "notifyOrderStatusChange_failed" });
      });
      return { ok: true };
    }
  );

  fastify.get(
    "/api/v1/admin/tasks",
    { preHandler: [fastify.authenticateAdmin] },
    async () => prisma.task.findMany({ orderBy: { sort: "asc" } })
  );

  fastify.post(
    "/api/v1/admin/tasks",
    { preHandler: [fastify.authenticateAdmin] },
    async (request, reply) => {
      const parsed = taskSchema.safeParse(request.body);
      if (!parsed.success) return reply.status(400).send({ error: "Invalid body" });
      const d = parsed.data;
      const t = await prisma.task.create({
        data: {
          key: d.key ?? null,
          title: d.title,
          description: d.description ?? null,
          rewardGems: d.rewardGems,
          type: d.type,
          channelId: d.channelId ?? null,
          game: d.game ?? null,
          targetCount: d.targetCount ?? null,
          sort: d.sort ?? 0,
          isActive: d.isActive ?? true,
        },
      });
      return { id: t.id };
    }
  );

  fastify.patch(
    "/api/v1/admin/tasks/:id",
    { preHandler: [fastify.authenticateAdmin] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const parsed = taskSchema.partial().safeParse(request.body);
      if (!parsed.success) return reply.status(400).send({ error: "Invalid body" });
      const d = parsed.data;
      await prisma.task.update({
        where: { id },
        data: {
          ...(d.key !== undefined ? { key: d.key } : {}),
          ...(d.title !== undefined ? { title: d.title } : {}),
          ...(d.description !== undefined ? { description: d.description } : {}),
          ...(d.rewardGems !== undefined ? { rewardGems: d.rewardGems } : {}),
          ...(d.type !== undefined ? { type: d.type } : {}),
          ...(d.channelId !== undefined ? { channelId: d.channelId } : {}),
          ...(d.game !== undefined ? { game: d.game } : {}),
          ...(d.targetCount !== undefined ? { targetCount: d.targetCount } : {}),
          ...(d.sort !== undefined ? { sort: d.sort } : {}),
          ...(d.isActive !== undefined ? { isActive: d.isActive } : {}),
        },
      });
      return { ok: true };
    }
  );

  fastify.post(
    "/api/v1/admin/users/:userId/tasks/:taskId/complete",
    { preHandler: [fastify.authenticateAdmin] },
    async (request, reply) => {
      const { userId, taskId } = request.params as { userId: string; taskId: string };
      await prisma.userTask.upsert({
        where: { userId_taskId: { userId, taskId } },
        create: {
          userId,
          taskId,
          progress: 1,
          completed: true,
          completedAt: new Date(),
        },
        update: {
          completed: true,
          completedAt: new Date(),
        },
      });
      return { ok: true };
    }
  );

  fastify.post(
    "/api/v1/admin/users/adjust-gems",
    { preHandler: [fastify.authenticateAdmin] },
    async (request, reply) => {
      const parsed = adjustGemsSchema.safeParse(request.body);
      if (!parsed.success) return reply.status(400).send({ error: "Invalid body" });
      const { userId, amount, note } = parsed.data;
      await applyLedgerTx(userId, amount, "admin_adjust", {
        refType: "admin",
        meta: note ? { note } : undefined,
      });
      return { ok: true };
    }
  );

  fastify.get(
    "/api/v1/admin/support/tickets",
    { preHandler: [fastify.authenticateAdmin] },
    async () => {
      const rows = await prisma.supportTicket.findMany({
        orderBy: { updatedAt: "desc" },
        take: 300,
        include: { user: true },
      });
      return rows.map((t) => ({
        id: t.id,
        message: t.message,
        adminReply: t.adminReply,
        status: t.status,
        createdAt: t.createdAt.toISOString(),
        updatedAt: t.updatedAt.toISOString(),
        repliedAt: t.repliedAt?.toISOString() ?? null,
        user: {
          id: t.user.id,
          telegramId: t.user.telegramId.toString(),
          username: t.user.username,
          firstName: t.user.firstName,
        },
      }));
    }
  );

  fastify.get(
    "/api/v1/admin/support/tickets/:id",
    { preHandler: [fastify.authenticateAdmin] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const t = await prisma.supportTicket.findUnique({
        where: { id },
        include: { user: true },
      });
      if (!t) return reply.status(404).send({ error: "Not found" });
      return {
        id: t.id,
        message: t.message,
        adminReply: t.adminReply,
        status: t.status,
        createdAt: t.createdAt.toISOString(),
        updatedAt: t.updatedAt.toISOString(),
        repliedAt: t.repliedAt?.toISOString() ?? null,
        user: {
          id: t.user.id,
          telegramId: t.user.telegramId.toString(),
          username: t.user.username,
          firstName: t.user.firstName,
        },
      };
    }
  );

  fastify.patch(
    "/api/v1/admin/support/tickets/:id",
    { preHandler: [fastify.authenticateAdmin] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const parsed = supportTicketPatchSchema.safeParse(request.body);
      if (!parsed.success) return reply.status(400).send({ error: "Invalid body" });
      const d = parsed.data;
      if (d.adminReply === undefined && d.status === undefined) {
        return reply.status(400).send({ error: "Nothing to update" });
      }
      const existing = await prisma.supportTicket.findUnique({ where: { id } });
      if (!existing) return reply.status(404).send({ error: "Not found" });

      const now = new Date();
      const data: {
        adminReply?: string;
        status?: SupportTicketStatus;
        repliedAt?: Date;
      } = {};
      if (d.adminReply !== undefined) {
        data.adminReply = d.adminReply.trim();
        data.repliedAt = now;
      }
      if (d.status !== undefined) {
        data.status = d.status;
      } else if (d.adminReply !== undefined) {
        data.status = SupportTicketStatus.answered;
      }

      const updated = await prisma.supportTicket.update({
        where: { id },
        data,
        include: { user: true },
      });
      if (d.adminReply !== undefined && updated.user) {
        void notifyUserSupportReply(config, updated, updated.user, request.log).catch((err) => {
          request.log.error({ err, msg: "notifyUserSupportReply_failed" });
        });
      }
      return { ok: true };
    }
  );
}

export async function bootstrapAdmin(config: Config): Promise<void> {
  if (!config.ADMIN_USERNAME || !config.ADMIN_PASSWORD) return;
  const existing = await prisma.adminUser.findFirst();
  if (existing) return;
  await prisma.adminUser.create({
    data: {
      username: config.ADMIN_USERNAME,
      passwordHash: hashPassword(config.ADMIN_PASSWORD),
    },
  });
}
