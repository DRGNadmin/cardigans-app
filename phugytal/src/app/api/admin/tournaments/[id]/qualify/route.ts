import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireDisciplineAccess } from "@/lib/auth/guard";
import { qualifyFromGroups } from "@/lib/brackets/persist";

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const t = await prisma.tournament.findUnique({ where: { id } });
  if (!t) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const access = await requireDisciplineAccess(t.discipline);
  if ("error" in access) return access.error;

  try {
    const result = await qualifyFromGroups(id);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error" },
      { status: 400 },
    );
  }
}
