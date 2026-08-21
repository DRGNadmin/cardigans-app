import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { DISCIPLINES, isDisciplineSlug } from "@/lib/disciplines";

export const dynamic = "force-dynamic";

function norm(s: string) {
  return s.toLocaleLowerCase("ru-RU").trim();
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim();
  if (q.length < 1) {
    return NextResponse.json({ results: [] });
  }

  const needle = norm(q);

  // SQLite `contains` is unreliable for Cyrillic case; filter in memory (few teams).
  const rows = await prisma.participant.findMany({
    where: {
      tournament: { status: { in: ["ACTIVE", "COMPLETED"] } },
    },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      seed: true,
      groupId: true,
      tournament: {
        select: {
          id: true,
          discipline: true,
          name: true,
        },
      },
      group: { select: { name: true } },
    },
  });

  const results = rows
    .filter((r) => isDisciplineSlug(r.tournament.discipline))
    .filter((r) => {
      const name = norm(r.name);
      const seed = String(r.seed);
      return (
        name.includes(needle) ||
        seed === needle ||
        name.includes(`участник ${needle}`) ||
        name.endsWith(` ${needle}`)
      );
    })
    .slice(0, 12)
    .map((r) => {
      const disc = DISCIPLINES.find((d) => d.slug === r.tournament.discipline)!;
      return {
        id: r.id,
        name: r.name,
        seed: r.seed,
        groupId: r.groupId,
        groupName: r.group?.name ?? null,
        tournamentId: r.tournament.id,
        tournamentName: r.tournament.name,
        discipline: disc.slug,
        disciplineName: disc.shortName,
        color: disc.color,
        href: `/d/${disc.slug}?team=${encodeURIComponent(r.id)}`,
      };
    });

  return NextResponse.json({ results });
}
