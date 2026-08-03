import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../db.js";

const createSchema = z.object({
  message: z.string().min(1).max(8000),
});

const followUpSchema = z.object({
  message: z.string().min(1).max(8000),
});

export async function supportRoutes(fastify: FastifyInstance) {
  fastify.get(
    "/api/v1/support/tickets",
    { preHandler: [fastify.authenticate] },
    async (request) => {
      const userId = request.userId!;
      const rows = await prisma.supportTicket.findMany({
        where: { userId },
        orderBy: { updatedAt: "desc" },
        take: 100,
      });
      return rows.map((t) => ({
        id: t.id,
        message: t.message,
        adminReply: t.adminReply,
        status: t.status,
        createdAt: t.createdAt.toISOString(),
        updatedAt: t.updatedAt.toISOString(),
        repliedAt: t.repliedAt?.toISOString() ?? null,
      }));
    }
  );

  fastify.get(
    "/api/v1/support/tickets/:id",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const userId = request.userId!;
      const { id } = request.params as { id: string };
      const t = await prisma.supportTicket.findFirst({
        where: { id, userId },
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
      };
    }
  );

  fastify.post(
    "/api/v1/support/tickets",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const userId = request.userId!;
      const parsed = createSchema.safeParse(request.body);
      if (!parsed.success) return reply.status(400).send({ error: "Invalid body" });
      const t = await prisma.supportTicket.create({
        data: {
          userId,
          message: parsed.data.message.trim(),
        },
      });
      return {
        id: t.id,
        message: t.message,
        adminReply: t.adminReply,
        status: t.status,
        createdAt: t.createdAt.toISOString(),
        updatedAt: t.updatedAt.toISOString(),
        repliedAt: null,
      };
    }
  );

  /** Дополнение к тому же тикету после ответа поддержки — тикет снова «open» в админке. */
  fastify.post(
    "/api/v1/support/tickets/:id/follow-up",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const userId = request.userId!;
      const { id } = request.params as { id: string };
      const parsed = followUpSchema.safeParse(request.body);
      if (!parsed.success) return reply.status(400).send({ error: "Invalid body" });

      const existing = await prisma.supportTicket.findFirst({
        where: { id, userId },
      });
      if (!existing) return reply.status(404).send({ error: "Not found" });
      if (existing.status === "closed") {
        return reply.status(400).send({ error: "Ticket is closed" });
      }
      if (!existing.adminReply?.trim()) {
        return reply
          .status(400)
          .send({ error: "No admin reply yet — use a new ticket or wait for support" });
      }

      const stamp = new Date().toLocaleString("ru-RU", {
        dateStyle: "short",
        timeStyle: "short",
      });
      const addition = parsed.data.message.trim();
      const block = `\n\n─── Дополнение пользователя (${stamp}) ───\n\n${addition}`;

      const t = await prisma.supportTicket.update({
        where: { id },
        data: {
          message: `${existing.message}${block}`,
          status: "open",
        },
      });

      return {
        id: t.id,
        message: t.message,
        adminReply: t.adminReply,
        status: t.status,
        createdAt: t.createdAt.toISOString(),
        updatedAt: t.updatedAt.toISOString(),
        repliedAt: t.repliedAt?.toISOString() ?? null,
      };
    }
  );
}
