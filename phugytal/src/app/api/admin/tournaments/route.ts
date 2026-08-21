import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { assertSameOrigin } from "@/lib/auth/http";
import { requireDisciplineAccess, requireUser } from "@/lib/auth/guard";
import { createTournamentWithBracket } from "@/lib/brackets/persist";
import { isDisciplineSlug } from "@/lib/disciplines";

const createSchema = z.object({
  discipline: z.string(),
  name: z.string().min(2).max(120),
  format: z
    .enum([
      "SINGLE_ELIMINATION",
      "DOUBLE_ELIMINATION",
      "ROUND_ROBIN",
      "SWISS",
      "GROUPS_PLAYOFFS",
    ])
    .default("GROUPS_PLAYOFFS"),
  participants: z.array(z.string().min(1).max(80)).min(2).max(128),
  seedingMode: z.enum(["manual", "order", "random", "snake"]).default("order"),
  groupCount: z.number().int().min(2).max(16).optional(),
  swissRounds: z.number().int().min(2).max(20).optional(),
  streamUrl: z.string().max(500).optional(),
  useDisciplinePreset: z.boolean().optional(),
});

export async function GET(req: NextRequest) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const discipline = req.nextUrl.searchParams.get("discipline");
  if (discipline) {
    if (!isDisciplineSlug(discipline)) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const access = await requireDisciplineAccess(discipline);
    if ("error" in access) return access.error;
    const list = await prisma.tournament.findMany({
      where: { discipline },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        name: true,
        format: true,
        status: true,
        discipline: true,
        updatedAt: true,
      },
    });
    return NextResponse.json({ tournaments: list });
  }

  const where =
    auth.user.role === "SUPER_ADMIN"
      ? {}
      : { discipline: { in: auth.user.disciplines } };

  const list = await prisma.tournament.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      name: true,
      format: true,
      status: true,
      discipline: true,
      updatedAt: true,
    },
  });
  return NextResponse.json({ tournaments: list });
}

export async function POST(req: NextRequest) {
  if (!assertSameOrigin(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = createSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed" }, { status: 400 });
  }

  if (!isDisciplineSlug(parsed.data.discipline)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const access = await requireDisciplineAccess(parsed.data.discipline);
  if ("error" in access) return access.error;

  // Archive previous active for discipline
  await prisma.tournament.updateMany({
    where: { discipline: parsed.data.discipline, status: "ACTIVE" },
    data: { status: "COMPLETED" },
  });

  try {
    const tournament = await createTournamentWithBracket({
      discipline: parsed.data.discipline,
      name: parsed.data.name,
      format: parsed.data.format,
      participantNames: parsed.data.participants,
      seedingMode: parsed.data.seedingMode,
      groupCount: parsed.data.groupCount,
      swissRounds: parsed.data.swissRounds,
      streamUrl: parsed.data.streamUrl,
      useDisciplinePreset: parsed.data.useDisciplinePreset ?? true,
    });
    return NextResponse.json({ tournament }, { status: 201 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
