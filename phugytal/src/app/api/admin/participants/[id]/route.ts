import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireDisciplineAccess } from "@/lib/auth/guard";
import { publishTournament } from "@/lib/realtime";

const schema = z.object({
  name: z.string().min(1).optional(),
  points: z.number().int().optional(),
  statusText: z.string().optional(),
});

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const p = await prisma.participant.findUnique({
    where: { id },
    include: { tournament: true },
  });
  if (!p) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const access = await requireDisciplineAccess(p.tournament.discipline);
  if ("error" in access) return access.error;

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  const updated = await prisma.participant.update({
    where: { id },
    data: {
      name: parsed.data.name?.trim(),
      points: parsed.data.points,
      statusText: parsed.data.statusText,
    },
  });
  publishTournament(p.tournamentId);
  return NextResponse.json(updated);
}
