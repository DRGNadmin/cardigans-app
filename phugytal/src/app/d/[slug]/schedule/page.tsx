import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/SiteHeader";
import { ScheduleList } from "@/components/ScheduleList";
import { getDiscipline, isDisciplineSlug } from "@/lib/disciplines";
import { getActiveTournament } from "@/lib/tournamentQuery";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function SchedulePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (!isDisciplineSlug(slug)) notFound();
  const discipline = getDiscipline(slug)!;
  const tournament = await getActiveTournament(slug);

  const partById = new Map(
    (tournament?.participants ?? []).map((p) => [p.id, p.name]),
  );
  const roundById = new Map(
    (tournament?.rounds ?? []).map((r) => [r.id, r.name]),
  );

  const rows = (tournament?.matches ?? [])
    .slice()
    .sort((a, b) => {
      const at = a.scheduledAt?.getTime() ?? Number.MAX_SAFE_INTEGER;
      const bt = b.scheduledAt?.getTime() ?? Number.MAX_SAFE_INTEGER;
      if (at !== bt) return at - bt;
      return a.orderInRound - b.orderInRound;
    })
    .map((m) => ({
      id: m.id,
      roundName: roundById.get(m.roundId) ?? "—",
      p1: m.participant1Id ? (partById.get(m.participant1Id) ?? "TBD") : "TBD",
      p2: m.participant2Id ? (partById.get(m.participant2Id) ?? "TBD") : "TBD",
      score1: m.score1,
      score2: m.score2,
      scheduledAt: m.scheduledAt,
      venue: m.venue,
    }));

  return (
    <main className="brand-zigzag min-h-screen">
      <SiteHeader accent={discipline.color} />
      <section className="px-5 pb-6 pt-4 md:px-10">
        <Link
          href={`/d/${slug}`}
          className="focus-ring text-sm text-white/55 hover:text-white"
        >
          ← К сетке {discipline.name}
        </Link>
        <h1
          className="font-display mt-4 text-5xl md:text-6xl"
          style={{ color: discipline.color }}
        >
          Расписание
        </h1>
        <p className="mt-2 text-sm text-white/55">
          Счёт синхронизирован с турнирной сеткой
        </p>
      </section>
      <section className="px-5 pb-16 md:px-10">
        <ScheduleList rows={rows} accent={discipline.color} />
      </section>
    </main>
  );
}
