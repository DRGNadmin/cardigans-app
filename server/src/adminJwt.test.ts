import { describe, expect, it } from "vitest";
import { signAdminToken, verifyAdminToken } from "./adminJwt.js";

describe("adminJwt", () => {
  it("roundtrips", () => {
    const secret = "x".repeat(32);
    const t = signAdminToken("admin1", secret);
    const v = verifyAdminToken(t, secret);
    expect(v.sub).toBe("admin1");
  });
});
