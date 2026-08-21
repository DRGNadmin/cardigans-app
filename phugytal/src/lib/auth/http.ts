import { NextRequest } from "next/server";

/**
 * CSRF guard for cookie-auth mutating requests.
 * On Render, req.url may be an internal host while the browser Origin is the public URL —
 * so we also accept x-forwarded-host / host / RENDER_EXTERNAL_URL.
 */
export function assertSameOrigin(req: NextRequest): boolean {
  const origin = req.headers.get("origin");
  if (!origin) {
    const fetchSite = req.headers.get("sec-fetch-site");
    if (fetchSite === "cross-site") return false;
    return true;
  }

  let originUrl: URL;
  try {
    originUrl = new URL(origin);
  } catch {
    return false;
  }

  const allowed = new Set<string>();

  try {
    allowed.add(new URL(req.url).origin);
  } catch {
    /* ignore */
  }

  const xfHost = req.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const xfProto =
    req.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() || "https";
  if (xfHost) {
    allowed.add(`${xfProto}://${xfHost}`);
  }

  const host = req.headers.get("host")?.split(",")[0]?.trim();
  if (host) {
    allowed.add(`${xfProto}://${host}`);
    if (!host.includes("localhost") && !host.startsWith("127.")) {
      allowed.add(`https://${host}`);
    }
  }

  for (const key of ["RENDER_EXTERNAL_URL", "APP_URL", "NEXT_PUBLIC_APP_URL"]) {
    const raw = process.env[key];
    if (!raw) continue;
    try {
      allowed.add(new URL(raw).origin);
    } catch {
      /* ignore */
    }
  }

  return allowed.has(originUrl.origin);
}

const loginAttempts = new Map<string, { count: number; resetAt: number }>();

export function rateLimitLogin(
  key: string,
  limit = 8,
  windowMs = 15 * 60 * 1000,
): boolean {
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
