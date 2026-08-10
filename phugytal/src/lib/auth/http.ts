import { NextRequest } from "next/server";

export function assertSameOrigin(req: NextRequest): boolean {
  const origin = req.headers.get("origin");
  if (!origin) {
    // Same-origin navigations / non-browser clients may omit Origin
    const fetchSite = req.headers.get("sec-fetch-site");
    if (fetchSite === "cross-site") return false;
    return true;
  }
  try {
    return new URL(origin).origin === new URL(req.url).origin;
  } catch {
    return false;
  }
}

const loginAttempts = new Map<string, { count: number; resetAt: number }>();

export function rateLimitLogin(key: string, limit = 8, windowMs = 15 * 60 * 1000): boolean {
  const now = Date.now();
  const entry = loginAttempts.get(key);
  if (!entry || entry.resetAt < now) {
    loginAttempts.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  entry.count += 1;
  if (entry.count > limit) return false;
  return true;
}
