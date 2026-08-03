import { levelVisual } from "./levelStyle";

/** Параметры косметики аватара в профиле по уровню (только визуал). */
export type ProfileFrameSpec = {
  /** Градиент ободка (linear-gradient) */
  ringGradient: string;
  glow: string;
  /** Толщина кольца в px */
  ringWidth: number;
  /** Размытие свечения */
  shadowSpread: number;
  /** Лёгкая анимация пульса высоких уровней */
  pulse: boolean;
  /** Подпись под аватаром */
  frameLabel: string;
};

function specForLevel(level: number): ProfileFrameSpec {
  const L = Math.min(10, Math.max(1, Math.round(level)));
  const v = levelVisual(L);
  const ringGradient = `linear-gradient(135deg, ${v.from}, ${v.to})`;
  const base: Omit<ProfileFrameSpec, "pulse" | "frameLabel"> = {
    ringGradient,
    glow: v.glow,
    ringWidth: 2 + Math.floor((L - 1) / 3),
    shadowSpread: 12 + L * 2,
  };
  return {
    ...base,
    pulse: L >= 8,
    frameLabel: `Рамка: ${v.label}`,
  };
}

export function profileFrameSpec(level: number | undefined): ProfileFrameSpec {
  return specForLevel(level ?? 1);
}
