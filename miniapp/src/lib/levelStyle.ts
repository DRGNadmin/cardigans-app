/** Уровни 1–10: чем выше, тем теплее и ярче акцент */
export const LEVEL_VISUAL: { from: string; to: string; glow: string; label: string }[] = [
  { from: "#57534e", to: "#78716c", glow: "rgba(120,113,108,0.35)", label: "Новичок" },
  { from: "#713f12", to: "#a16207", glow: "rgba(161,98,7,0.4)", label: "Ученик" },
  { from: "#854d0e", to: "#ca8a04", glow: "rgba(202,138,4,0.45)", label: "Боец" },
  { from: "#a16207", to: "#eab308", glow: "rgba(234,179,8,0.5)", label: "Опытный" },
  { from: "#ca8a04", to: "#facc15", glow: "rgba(250,204,21,0.55)", label: "Снайпер" },
  { from: "#d97706", to: "#fde047", glow: "rgba(253,224,71,0.55)", label: "Ас" },
  { from: "#e98b2a", to: "#fef08a", glow: "rgba(254,240,138,0.55)", label: "Элита" },
  { from: "#f59e0b", to: "#fff7c2", glow: "rgba(255,247,194,0.6)", label: "Мастер" },
  { from: "#fbbf24", to: "#fffbeb", glow: "rgba(255,251,235,0.65)", label: "Легенда" },
  { from: "#fde047", to: "#ffffff", glow: "rgba(255,255,255,0.7)", label: "Титан" },
];

/** 1 → Новичок … 10 → Титан (синхронно с {@link LEVEL_VISUAL}) */
export const LEVEL_RANK_NAMES = LEVEL_VISUAL.map((v) => v.label);

export function levelVisual(level: number) {
  const L = Math.min(10, Math.max(1, Math.round(level)));
  return LEVEL_VISUAL[L - 1]!;
}
