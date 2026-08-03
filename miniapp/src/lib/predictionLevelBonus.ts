/** Как `LEVEL_PREDICTION_BONUS_PER_STEP` на сервере (`server/src/services/xp.ts`). */
export const LEVEL_PREDICTION_BONUS_PER_STEP = 5;

/** Бонус гемов к награде матча: 5 × уровень (1…10). */
export function predictionWinBonusForLevel(level: number): number {
  const L = Math.min(10, Math.max(1, Math.floor(level)));
  return L * LEVEL_PREDICTION_BONUS_PER_STEP;
}
