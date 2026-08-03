import { describe, expect, it } from "vitest";
import { LEVEL_XP_START, levelFromXp, levelProgress } from "./xp.js";

describe("xp levels", () => {
  it("level 1 at 0 xp", () => {
    expect(levelFromXp(0)).toBe(1);
    expect(levelProgress(0).level).toBe(1);
  });

  it("transitions at thresholds", () => {
    expect(levelFromXp(LEVEL_XP_START[1]! - 1)).toBe(1);
    expect(levelFromXp(LEVEL_XP_START[1]!)).toBe(2);
    expect(levelFromXp(LEVEL_XP_START[9]!)).toBe(10);
  });

  it("level 10 caps progress", () => {
    const p = levelProgress(99999);
    expect(p.level).toBe(10);
    expect(p.progressPct).toBe(1);
  });
});
