import type { Prisma } from "@prisma/client";
import { prisma } from "../db.js";

/**
 * Пороги накопленного XP для уровней 1…10 (мягче прогрессия, чем раньше).
 * Уровень N при XP >= LEVEL_XP_START[N-1].
 */
export const LEVEL_XP_START = [0, 35, 85, 150, 230, 325, 435, 560, 700, 860] as const;

/** После входа на 10-й уровень «добор» полосы до макс. без нового уровня */
const LEVEL_10_BAR_SPAN = 160;

export const XP_TASK_CLAIM = 40;
export const XP_PREDICTION_PLACED = 28;
export const XP_PREDICTION_WIN = 55;

/** Множитель: бонус гемов = уровень × это число (к базе матча из админки). */
export const LEVEL_PREDICTION_BONUS_PER_STEP = 5;

/**
 * Доп. гемы за верный прогноз: **5 × уровень** сверх `match.rewardGems`.
 * Пример: база 50 → ур.1 итого 55, ур.10 итого 100.
 */
export function predictionWinLevelBonusGems(level: number): number {
  const L = Math.min(10, Math.max(1, Math.floor(level)));
  return L * LEVEL_PREDICTION_BONUS_PER_STEP;
}

export function levelFromXp(xp: number): number {
  const x = Math.max(0, xp);
  for (let L = 10; L >= 1; L--) {
    if (x >= LEVEL_XP_START[L - 1]) return L;
  }
  return 1;
}

export function levelProgress(xp: number): {
  level: number;
  xpInLevel: number;
  xpToNextLevel: number;
  progressPct: number;
} {
  const x = Math.max(0, xp);
  const level = levelFromXp(x);
  if (level >= 10) {
    const start = LEVEL_XP_START[9];
    const cap = start + LEVEL_10_BAR_SPAN;
    const xpInLevel = x - start;
    const progressPct = Math.min(1, Math.max(0, xpInLevel / LEVEL_10_BAR_SPAN));
    return {
      level: 10,
      xpInLevel,
      xpToNextLevel: Math.max(0, cap - x),
      progressPct,
    };
  }
  const start = LEVEL_XP_START[level - 1];
  const nextStart = LEVEL_XP_START[level];
  const span = nextStart - start;
  const xpInLevel = x - start;
  const progressPct = span > 0 ? Math.min(1, Math.max(0, xpInLevel / span)) : 1;
  return {
    level,
    xpInLevel,
    xpToNextLevel: Math.max(0, nextStart - x),
    progressPct,
  };
}

export async function addXp(
  userId: string,
  amount: number,
  existingTx?: Prisma.TransactionClient
): Promise<void> {
  if (amount <= 0) return;
  const db = existingTx ?? prisma;
  await db.user.update({
    where: { id: userId },
    data: { xpTotal: { increment: amount } },
  });
}
