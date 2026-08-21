import { cookies } from "next/headers";
import { createHash, randomBytes } from "crypto";
import type { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import type { Role } from "@prisma/client";

const COOKIE = "phugytal_session";
const SESSION_DAYS = 14;

export type SessionUser = {
  id: string;
  email: string;
  name: string | null;
  role: Role;
  disciplines: string[];
};

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function sessionCookieOptions(expiresAt: Date) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    expires: expiresAt,
  };
}

/** Create DB session and return raw token + expiry (set cookie on the HTTP response). */
export async function issueSession(userId: string): Promise<{
  token: string;
  expiresAt: Date;
}> {
  const token = randomBytes(32).toString("hex");
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);

  await prisma.session.create({
    data: { tokenHash, userId, expiresAt },
  });

  return { token, expiresAt };
}

export function attachSessionCookie(
  res: NextResponse,
  token: string,
  expiresAt: Date,
) {
  res.cookies.set(COOKIE, token, sessionCookieOptions(expiresAt));
}

export async function createSession(userId: string): Promise<string> {
  const { token, expiresAt } = await issueSession(userId);
  const jar = await cookies();
  jar.set(COOKIE, token, sessionCookieOptions(expiresAt));
  return token;
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) {
    await prisma.session.deleteMany({ where: { tokenHash: hashToken(token) } });
  }
  jar.set(COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: {
      user: { include: { disciplines: true } },
    },
  });

  if (!session || session.expiresAt < new Date()) {
    if (session) {
      await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
    }
    return null;
  }

  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
    role: session.user.role,
    disciplines: session.user.disciplines.map((d) => d.disciplineSlug),
  };
}

export function canAccessDiscipline(
  user: SessionUser,
  disciplineSlug: string,
): boolean {
  if (user.role === "SUPER_ADMIN") return true;
  return user.disciplines.includes(disciplineSlug);
}
