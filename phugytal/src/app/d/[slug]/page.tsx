import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/SiteHeader";
import { DisciplinePicker } from "@/components/DisciplinePicker";
import { DateCard } from "@/components/DateCard";
import { TournamentArena } from "@/components/TournamentArena";
import { ArenaSidebar } from "@/components/ArenaSidebar";
import { DISCIPLINES, getDiscipline, isDisciplineSlug } from "@/lib/disciplines";
import { getActiveTournament, serializeTournament } from "@/lib/tournamentQuery";
import { canAccessDiscipline, getSessionUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function DisciplinePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ team?: string }>;
}) {
  const { slug } = await params;
  const { team: highlightTeamId } = await searchParams;
  if (!isDisciplineSlug(slug)) notFound();
  const discipline = getDiscipline(slug)!;
  const tournament = await getActiveTournament(slug);
  const data = tournament ? serializeTournament(tournament) : null;
  const user = await getSessionUser();
  const canEdit = Boolean(user && canAccessDiscipline(user, slug));

  return (
    <main
      className="brand-zigzag relative min-h-screen overflow-x-hidden"
      style={{ ["--disc" as string]: discipline.color }}
    >
      <SiteHeader accent={discipline.color} />

      <section className="relative z-10 mx-auto max-w-[1400px] px-4 pb-3 pt-6 md:px-6 md:pt-8 lg:px-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <h1 className="animate-rise font-display text-[clamp(2rem,5.5vw,3.8rem)] leading-[0.95] text-white">
              Все матчи.
              <span className="mt-1 block text-white">Все сетки.</span>
              <span className="mt-1 block bg-gradient-to-r from-[#c4b5fd] to-white bg-clip-text text-transparent">
                Все в одном месте.
              </span>
            </h1>
            <p className="animate-rise mt-3 max-w-xl text-sm uppercase tracking-[0.06em] text-white/55">
              Смотри сетки и расписание всех дисциплин чемпионата России по
              фиджитал спорту.
            </p>
          </div>
          <DateCard accent={discipline.color} />
        </div>
      </section>

      <div className="relative z-10 pb-4 pt-1">
        <DisciplinePicker
          disciplines={DISCIPLINES}
          selectedSlug={discipline.slug}
        />
      </div>

      <section className="relative z-10 mx-auto max-w-[1400px] px-3 pb-12 sm:px-5 md:px-6 lg:px-8">
        {data ? (
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
            <div className="min-w-0 flex-1">
              <TournamentArena
                initial={data}
                accent={discipline.color}
                canEdit={canEdit}
                mode="bracket"
                title={discipline.shortName}
                scheduleHref={`/d/${discipline.slug}/schedule`}
                subtitle={discipline.blurb}
                highlightTeamId={highlightTeamId ?? null}
              />
            </div>
            <ArenaSidebar
              data={data}
              accent={discipline.color}
              title={`Расписание ${discipline.shortName}`}
              highlightTeamId={highlightTeamId ?? null}
            />
          </div>
        ) : (
          <div className="ui-panel px-6 py-16 text-center">
            <p className="font-display text-2xl text-white/80">
              Сетка ещё не создана
            </p>
            <p className="mt-2 text-sm text-white/45">
              Когда турнир опубликуют, здесь появится сетка матчей.
            </p>
          </div>
        )}
      </section>
    </main>
  );
}
