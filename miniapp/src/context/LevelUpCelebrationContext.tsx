import { useEffect, useRef, useState, type ReactNode } from "react";
import { LevelUpOverlay } from "../components/LevelUpOverlay";

type Props = {
  /** Текущий уровень из GET /me (undefined пока не загрузилось). */
  level: number | undefined;
  children: ReactNode;
};

export function LevelUpCelebrationProvider({ level, children }: Props) {
  const prevRef = useRef<number | null>(null);
  const [celebrateLevel, setCelebrateLevel] = useState<number | null>(null);

  useEffect(() => {
    if (level == null) return;
    const prev = prevRef.current;
    prevRef.current = level;
    if (prev === null) return;
    if (level > prev) {
      setCelebrateLevel(level);
    }
  }, [level]);

  return (
    <>
      {children}
      <LevelUpOverlay
        open={celebrateLevel != null}
        newLevel={celebrateLevel ?? 1}
        onDismiss={() => setCelebrateLevel(null)}
      />
    </>
  );
}
