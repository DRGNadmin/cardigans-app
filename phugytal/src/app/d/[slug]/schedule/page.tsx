import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/SiteHeader";
import { TournamentArena } from "@/components/TournamentArena";
import { getDiscipline, isDisciplineSlug } from "@/lib/disciplines";
import { getActiveTournament, serializeTournament } from "@/lib/tournamentQuery";
import { canAccessDiscipline, getSessionUser } from "@/lib/auth/session";

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
  const data = tournament ? serializeTournament(tournament) : null;
  const user = await getSessionUser();
  const canEdit = Boolean(user && canAccessDiscipline(user, slug));

  return (
    <main
      className="brand-zigzag min-h-screen"
      style={{ ["--disc" as string]: discipline.color }}
    >
      <SiteHeader accent={discipline.color} />
      <section className="mx-auto max-w-[1400px] px-4 pb-6 pt-5 md:px-6 lg:px-8">
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
          Счёт и Live синхронизируются без перезагрузки
        </p>
      </section>
      <section className="mx-auto max-w-[1400px] px-4 pb-16 md:px-6 lg:px-8">
        {data ? (
          <TournamentArena
            initial={data}
            accent={discipline.color}
            canEdit={canEdit}
            mode="schedule"
          />
        ) : (
          <div className="ui-panel px-6 py-16 text-center">
            <p className="font-display text-2xl text-white/80">Расписание пусто</p>
            <p className="mt-2 text-sm text-white/45">
              Когда матчи назначат, они появятся здесь.
            </p>
          </div>
        )}
      </section>
    </main>
  );
}
