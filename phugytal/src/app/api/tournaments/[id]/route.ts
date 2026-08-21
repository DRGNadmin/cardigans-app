import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireDisciplineAccess } from "@/lib/auth/guard";
import { getTournamentById, serializeTournament } from "@/lib/tournamentQuery";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const t = await getTournamentById(id);
  if (!t) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(serializeTournament(t));
}

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const existing = await prisma.tournament.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const access = await requireDisciplineAccess(existing.discipline);
  if ("error" in access) return access.error;

  const body = (await req.json()) as {
    streamUrl?: string | null;
    name?: string;
  };

  const updated = await prisma.tournament.update({
    where: { id },
    data: {
      streamUrl:
        body.streamUrl !== undefined
          ? body.streamUrl?.trim() || null
          : undefined,
      name: body.name?.trim() || undefined,
    },
  });

  const { publishTournament } = await import("@/lib/realtime");
  publishTournament(id);

  return NextResponse.json({
    id: updated.id,
    streamUrl: updated.streamUrl,
    name: updated.name,
  });
}
