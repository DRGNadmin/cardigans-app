import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { assertSameOrigin } from "@/lib/auth/http";
import { requireDisciplineAccess } from "@/lib/auth/guard";

const schema = z.object({
  name: z.string().min(1).max(80),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!assertSameOrigin(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const round = await prisma.round.findUnique({
    where: { id },
    include: { tournament: true },
  });
  if (!round) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const access = await requireDisciplineAccess(round.tournament.discipline);
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

  const updated = await prisma.round.update({
    where: { id },
    data: { name: parsed.data.name },
  });

  return NextResponse.json({ round: updated });
}
