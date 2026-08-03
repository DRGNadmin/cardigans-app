import { describe, expect, it } from "vitest";
import { validateTelegramInitData } from "./telegram.js";

describe("validateTelegramInitData", () => {
  it("rejects empty", () => {
    expect(validateTelegramInitData("", "token")).toBe(false);
  });
});
