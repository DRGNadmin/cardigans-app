import { NextResponse } from "next/server";
import {
  canAccessDiscipline,
  getSessionUser,
  type SessionUser,
} from "@/lib/auth/session";

export async function requireUser(): Promise<
  { user: SessionUser } | { error: NextResponse }
> {
  const user = await getSessionUser();
  if (!user) {
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
  return { user };
}

export async function requireDisciplineAccess(
  discipline: string,
): Promise<{ user: SessionUser } | { error: NextResponse }> {
  const result = await requireUser();
  if ("error" in result) return result;
  if (!canAccessDiscipline(result.user, discipline)) {
    // Uniform 404 — no existence leak across disciplines
    return {
      error: NextResponse.json({ error: "Not found" }, { status: 404 }),
    };
  }
  return result;
}
