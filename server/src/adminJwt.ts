import jwt from "jsonwebtoken";

export function signAdminToken(adminId: string, secret: string): string {
  return jwt.sign({ sub: adminId, role: "admin" }, secret, { expiresIn: "7d" });
}

export function verifyAdminToken(token: string, secret: string): { sub: string } {
  const payload = jwt.verify(token, secret) as { sub: string; role?: string };
  if (payload.role !== "admin") throw new Error("Invalid token");
  return { sub: payload.sub };
}
