import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { assertSameOrigin } from "@/lib/auth/http";
import { requireDisciplineAccess } from "@/lib/auth/guard";
import { setMatchScore } from "@/lib/brackets/persist";

const schema = z.object({
  score1: z.number().int().min(0).max(999),
  score2: z.number().int().min(0).max(999),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!assertSameOrigin(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const match = await prisma.match.findUnique({
    where: { id },
    include: { tournament: true },
  });
  if (!match) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const access = await requireDisciplineAccess(match.tournament.discipline);
  if ("error" in access) return access.error;

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed" }, { status: 400 });
  }

  try {
    const updated = await setMatchScore({
      matchId: id,
      score1: parsed.data.score1,
      score2: parsed.data.score2,
    });
    const discipline = match.tournament.discipline;
    revalidatePath(`/d/${discipline}`);
    revalidatePath(`/d/${discipline}/schedule`);
    return NextResponse.json({ match: updated });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
