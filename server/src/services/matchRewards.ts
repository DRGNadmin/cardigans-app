import { prisma } from "../db.js";
import { applyLedgerTx } from "./ledger.js";
import {
  XP_PREDICTION_WIN,
  addXp,
  levelFromXp,
  predictionWinLevelBonusGems,
} from "./xp.js";
import { applyCorrectStreakForFinishedMatch } from "./taskProgress.js";

/**
 * Idempotent: pays reward once per prediction when match finished and option matches.
 */
export async function settleMatchRewards(matchId: string): Promise<{ paid: number }> {
  const match = await prisma.match.findFirst({
    where: { id: matchId, deletedAt: null },
    include: { predictions: { where: { rewardPaid: false } } },
  });
  if (!match || match.status !== "finished" || !match.winningOptionId) {
    return { paid: 0 };
  }

  let paid = 0;
  for (const p of match.predictions) {
    if (p.optionId !== match.winningOptionId) continue;
    try {
      await prisma.$transaction(async (tx) => {
        const row = await tx.prediction.findFirst({
          where: { id: p.id, rewardPaid: false },
        });
        if (!row || row.optionId !== match.winningOptionId) return;
        const userRow = await tx.user.findUniqueOrThrow({
          where: { id: row.userId },
          select: { xpTotal: true },
        });
        const level = levelFromXp(userRow.xpTotal);
        const levelBonus = predictionWinLevelBonusGems(level);
        const totalGems = match.rewardGems + levelBonus;
        await applyLedgerTx(
          row.userId,
          totalGems,
          "prediction_reward",
          {
            refType: "prediction",
            refId: row.id,
            meta: {
              matchRewardGems: match.rewardGems,
              levelBonusGems: levelBonus,
              level,
            },
          },
          tx
        );
        await addXp(row.userId, XP_PREDICTION_WIN, tx);
        await tx.prediction.update({
          where: { id: row.id },
          data: { rewardPaid: true, rewardGemsPaid: totalGems },
        });
      });
      paid += 1;
    } catch {
      // concurrent update; skip
    }
  }

  await applyCorrectStreakForFinishedMatch(matchId, match.winningOptionId);

  return { paid };
}
