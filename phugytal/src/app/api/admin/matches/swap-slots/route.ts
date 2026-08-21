import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireDisciplineAccess } from "@/lib/auth/guard";
import { swapMatchSlots } from "@/lib/brackets/persist";

const bodySchema = z.object({
  matchAId: z.string().min(1),
  slotA: z.coerce.number().int().min(1).max(2),
  matchBId: z.string().min(1),
  slotB: z.coerce.number().int().min(1).max(2),
});

export async function POST(req: Request) {
  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
  const matchAId = parsed.data.matchAId;
  const matchBId = parsed.data.matchBId;
  const slotA = parsed.data.slotA as 1 | 2;
  const slotB = parsed.data.slotB as 1 | 2;

  const match = await prisma.match.findUnique({
    where: { id: matchAId },
    include: { tournament: true },
  });
  if (!match) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const access = await requireDisciplineAccess(match.tournament.discipline);
  if ("error" in access) return access.error;

  try {
    await swapMatchSlots({ matchAId, slotA, matchBId, slotB });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error" },
      { status: 400 },
    );
  }
}
