import type { LedgerType, Prisma } from "@prisma/client";
import { prisma } from "../db.js";

async function applyLedgerTxInner(
  tx: Prisma.TransactionClient,
  userId: string,
  amount: number,
  type: LedgerType,
  opts?: { refType?: string; refId?: string; meta?: Prisma.InputJsonValue }
): Promise<void> {
  if (amount === 0) return;
  const user = await tx.user.findUniqueOrThrow({ where: { id: userId } });
  const next = user.gemsBalance + amount;
  if (next < 0) {
    throw Object.assign(new Error("Insufficient gems"), { statusCode: 400 });
  }
  await tx.user.update({
    where: { id: userId },
    data: { gemsBalance: next },
  });
  await tx.ledgerTransaction.create({
    data: {
      userId,
      amount,
      type,
      refType: opts?.refType,
      refId: opts?.refId,
      meta: opts?.meta === undefined ? undefined : (opts.meta as Prisma.InputJsonValue),
    },
  });
}

export async function applyLedgerTx(
  userId: string,
  amount: number,
  type: LedgerType,
  opts?: { refType?: string; refId?: string; meta?: Prisma.InputJsonValue },
  existingTx?: Prisma.TransactionClient
): Promise<void> {
  if (existingTx) {
    return applyLedgerTxInner(existingTx, userId, amount, type, opts);
  }
  return prisma.$transaction((tx) => applyLedgerTxInner(tx, userId, amount, type, opts));
}
