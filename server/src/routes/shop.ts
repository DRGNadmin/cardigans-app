import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../db.js";
import { purchaseShopItem } from "../services/shopPurchase.js";
import { syncOnboardingShopVisit } from "../services/taskProgress.js";

const purchaseSchema = z.object({
  shopItemId: z.string(),
});

export async function shopRoutes(fastify: FastifyInstance) {
  fastify.get(
    "/api/v1/shop/items",
    { preHandler: [fastify.authenticate] },
    async (request) => {
      const userId = request.userId!;
      await syncOnboardingShopVisit(userId);
      const items = await prisma.shopItem.findMany({
        where: { isActive: true },
        orderBy: { title: "asc" },
      });
      return items.map((i) => ({
        id: i.id,
        game: i.game,
        title: i.title,
        rarity: i.rarity,
        imageUrl: i.imageUrl,
        priceGems: i.priceGems,
        stock: i.stock,
      }));
    }
  );

  fastify.post(
    "/api/v1/shop/purchase",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const parsed = purchaseSchema.safeParse(request.body);
      if (!parsed.success) return reply.status(400).send({ error: "Invalid body" });
      const userId = request.userId!;
      try {
        const order = await purchaseShopItem(userId, parsed.data.shopItemId);
        return {
          orderId: order.id,
          status: order.status,
          priceGems: order.priceGems,
        };
      } catch (e: unknown) {
        const err = e as { statusCode?: number; message?: string };
        if (err.statusCode) {
          return reply.status(err.statusCode).send({ error: err.message ?? "Error" });
        }
        throw e;
      }
    }
  );

  fastify.get(
    "/api/v1/orders",
    { preHandler: [fastify.authenticate] },
    async (request) => {
      const userId = request.userId!;
      const orders = await prisma.order.findMany({
        where: { userId },
        include: { shopItem: true },
        orderBy: { createdAt: "desc" },
        take: 50,
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
          imageUrl: o.shopItem.imageUrl,
        },
      }));
    }
  );
}
