import { prisma } from "../db.js";
import { applyLedgerTx } from "./ledger.js";

export async function purchaseShopItem(userId: string, shopItemId: string) {
  return prisma.$transaction(async (tx) => {
    const item = await tx.shopItem.findFirst({
      where: { id: shopItemId, isActive: true },
    });
    if (!item || item.stock <= 0) {
      throw Object.assign(new Error("Item unavailable"), { statusCode: 400 });
    }

    const user = await tx.user.findUniqueOrThrow({ where: { id: userId } });
    if (user.gemsBalance < item.priceGems) {
      throw Object.assign(new Error("Insufficient gems"), { statusCode: 400 });
    }

    const updated = await tx.shopItem.updateMany({
      where: { id: item.id, stock: { gte: 1 } },
      data: { stock: { decrement: 1 } },
    });
    if (updated.count !== 1) {
      throw Object.assign(new Error("Item sold out"), { statusCode: 409 });
    }

    await applyLedgerTx(userId, -item.priceGems, "purchase", {
      refType: "shop_item",
      refId: item.id,
    }, tx);

    const order = await tx.order.create({
      data: {
        userId,
        shopItemId: item.id,
        priceGems: item.priceGems,
        status: "new",
      },
    });

    return order;
  });
}
