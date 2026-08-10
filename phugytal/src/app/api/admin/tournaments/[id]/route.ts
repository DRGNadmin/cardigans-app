import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { assertSameOrigin } from "@/lib/auth/http";
import { requireDisciplineAccess } from "@/lib/auth/guard";
import { serializeTournament } from "@/lib/tournamentQuery";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const tournament = await prisma.tournament.findUnique({
    where: { id },
    include: {
      participants: { orderBy: { seed: "asc" } },
      rounds: { orderBy: { order: "asc" } },
      matches: { orderBy: [{ orderInRound: "asc" }] },
      groups: { orderBy: { order: "asc" } },
    },
  });
  if (!tournament) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const access = await requireDisciplineAccess(tournament.discipline);
  if ("error" in access) return access.error;

  return NextResponse.json({ tournament: serializeTournament(tournament) });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!assertSameOrigin(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const tournament = await prisma.tournament.findUnique({ where: { id } });
  if (!tournament) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const access = await requireDisciplineAccess(tournament.discipline);
  if ("error" in access) return access.error;

  await prisma.tournament.delete({ where: { id } });

  revalidatePath(`/d/${tournament.discipline}`);
  revalidatePath(`/d/${tournament.discipline}/schedule`);
  revalidatePath(`/admin/d/${tournament.discipline}`);
  revalidatePath("/admin");

  return NextResponse.json({
    ok: true,
    discipline: tournament.discipline,
  });
}
