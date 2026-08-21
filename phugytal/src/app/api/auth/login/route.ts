import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { verifyPassword } from "@/lib/password";
import { attachSessionCookie, issueSession } from "@/lib/auth/session";
import { assertSameOrigin, rateLimitLogin } from "@/lib/auth/http";

const bodySchema = z.object({
  email: z.string().trim().email().max(200),
  password: z.string().min(8).max(200),
});

export async function POST(req: NextRequest) {
  if (!assertSameOrigin(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (!rateLimitLogin(`login:${ip}`)) {
    return NextResponse.json({ error: "Too many attempts" }, { status: 429 });
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 400 });
  }

  const email = parsed.data.email.toLowerCase();
  const password = parsed.data.password.trim();
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const { token, expiresAt } = await issueSession(user.id);
  const res = NextResponse.json({
    ok: true,
    role: user.role,
  });
  attachSessionCookie(res, token, expiresAt);
  return res;
}
