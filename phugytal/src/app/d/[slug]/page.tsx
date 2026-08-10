import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/SiteHeader";
import { BracketView } from "@/components/BracketView";
import { BrandSticker, DisciplineSticker } from "@/components/BrandStickers";
import { getDiscipline, isDisciplineSlug } from "@/lib/disciplines";
import { getActiveTournament, serializeTournament } from "@/lib/tournamentQuery";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function DisciplinePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (!isDisciplineSlug(slug)) notFound();
  const discipline = getDiscipline(slug)!;
  const tournament = await getActiveTournament(slug);
  const data = tournament ? serializeTournament(tournament) : null;

  return (
    <main
      className="brand-zigzag relative min-h-screen overflow-hidden"
      style={{ ["--disc" as string]: discipline.color }}
    >
      <SiteHeader accent={discipline.color} />
      <BrandSticker
        kind="star"
        color={discipline.color}
        size={48}
        rotate={16}
        className="absolute right-[10%] top-24 opacity-70"
      />
      <BrandSticker
        kind="lightning"
        color="#7946E2"
        size={56}
        rotate={-14}
        className="absolute bottom-24 left-[6%] hidden opacity-60 md:block"
      />
      <section className="relative z-10 px-4 pb-5 pt-3 sm:px-5 md:px-10 md:pt-4">
        <p className="text-[11px] uppercase tracking-[0.22em] text-white/50 sm:text-xs">
          {discipline.blurb}
        </p>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-3 sm:gap-4">
          <div className="flex min-w-0 items-center gap-3 sm:gap-4">
            <span className="hidden sm:inline-flex">
              <DisciplineSticker slug={slug} />
            </span>
            <h1
              className="font-display text-4xl leading-none sm:text-5xl md:text-7xl"
              style={{ color: discipline.color }}
            >
              {discipline.name}
            </h1>
          </div>
          <Link
            href={`/d/${slug}/schedule`}
            className="focus-ring inline-flex items-center rounded-2xl border px-4 py-2.5 text-xs font-semibold uppercase tracking-wider transition hover:bg-white hover:text-black sm:px-5 sm:py-3 sm:text-sm"
            style={{ borderColor: discipline.color, color: discipline.color }}
          >
            Расписание
          </Link>
        </div>
        {data ? (
          <p className="mt-3 text-sm text-white/55">
            {data.name} · {data.format.replaceAll("_", " ")}
          </p>
        ) : (
          <p className="mt-3 text-sm text-white/55">Турнир ещё не опубликован</p>
        )}
      </section>

      <section className="relative z-10 px-3 pb-12 sm:px-5 sm:pb-16 md:px-10">
        {data ? (
          <BracketView
            rounds={data.rounds}
            matches={data.matches}
            participants={data.participants}
            accent={discipline.color}
          />
        ) : (
          <div className="rounded-3xl border border-dashed border-white/15 px-6 py-16 text-center text-white/55">
            Сетка ещё не создана
          </div>
        )}
      </section>
    </main>
  );
}
