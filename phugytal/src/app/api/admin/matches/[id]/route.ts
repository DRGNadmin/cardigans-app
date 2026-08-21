import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireDisciplineAccess } from "@/lib/auth/guard";
import {
  setMatchScore,
  updateMatchLive,
} from "@/lib/brackets/persist";

const bodySchema = z.object({
  score1: z.number().int().nonnegative().optional(),
  score2: z.number().int().nonnegative().optional(),
  isLive: z.boolean().optional(),
  streamUrl: z.string().nullable().optional(),
  scheduledAt: z.string().nullable().optional(),
  venue: z.string().nullable().optional(),
  participant1Id: z.string().nullable().optional(),
  participant2Id: z.string().nullable().optional(),
});

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const match = await prisma.match.findUnique({
    where: { id },
    include: { tournament: true },
  });
  if (!match) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const access = await requireDisciplineAccess(match.tournament.discipline);
  if ("error" in access) return access.error;

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
  const b = parsed.data;

    try {
      if (b.score1 != null && b.score2 != null) {
        await setMatchScore({
          matchId: id,
          score1: b.score1,
          score2: b.score2,
        });
      }

      const hasMeta =
        b.isLive !== undefined ||
        b.streamUrl !== undefined ||
        b.scheduledAt !== undefined ||
        b.venue !== undefined ||
        b.participant1Id !== undefined ||
        b.participant2Id !== undefined;

      if (hasMeta) {
        await updateMatchLive({
          matchId: id,
          isLive: b.isLive,
          streamUrl: b.streamUrl,
          scheduledAt: b.scheduledAt,
          venue: b.venue,
          participant1Id: b.participant1Id,
          participant2Id: b.participant2Id,
        });
      }

      return NextResponse.json({ ok: true });
    } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error" },
      { status: 400 },
    );
  }
}
