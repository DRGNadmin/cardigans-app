import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { assertSameOrigin } from "@/lib/auth/http";
import { requireDisciplineAccess } from "@/lib/auth/guard";
import { parseLocalDateTime } from "@/lib/dateTime";

const schema = z.object({
  // Accept ISO, datetime-local, or null
  scheduledAt: z.string().min(1).max(64).nullable(),
  venue: z.string().max(120).nullable().optional(),
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

  let scheduledAt: Date | null = null;
  if (parsed.data.scheduledAt) {
    scheduledAt = parseLocalDateTime(parsed.data.scheduledAt);
    if (!scheduledAt) {
      return NextResponse.json({ error: "Некорректная дата/время" }, { status: 400 });
    }
  }

  const updated = await prisma.match.update({
    where: { id },
    data: {
      scheduledAt,
      venue: parsed.data.venue ?? null,
    },
  });

  const discipline = match.tournament.discipline;
  revalidatePath(`/d/${discipline}`);
  revalidatePath(`/d/${discipline}/schedule`);
  revalidatePath(`/admin/tournaments/${match.tournamentId}`);

  return NextResponse.json({
    match: {
      ...updated,
      scheduledAt: updated.scheduledAt?.toISOString() ?? null,
    },
  });
}
