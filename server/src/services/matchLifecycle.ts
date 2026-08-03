import { prisma } from "../db.js";

/**
 * Когда наступило время старта, переводит матч из scheduled в live.
 * Идемпотентно; вызывается из API и из фоновых задач.
 */
export async function promoteScheduledMatchesToLive(): Promise<void> {
  const now = new Date();
  await prisma.match.updateMany({
    where: {
      status: "scheduled",
      deletedAt: null,
      startsAt: { lte: now },
    },
    data: { status: "live" },
  });
}
