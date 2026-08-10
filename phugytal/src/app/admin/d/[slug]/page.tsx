import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AdminChrome } from "@/components/admin/AdminChrome";
import { CreateTournamentForm } from "@/components/admin/CreateTournamentForm";
import { DeleteTournamentButton } from "@/components/admin/DeleteTournamentButton";
import { canAccessDiscipline, getSessionUser } from "@/lib/auth/session";
import { getDiscipline, isDisciplineSlug } from "@/lib/disciplines";
import { prisma } from "@/lib/db";

export default async function AdminDisciplinePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/admin/login");

  const { slug } = await params;
  if (!isDisciplineSlug(slug)) notFound();
  if (!canAccessDiscipline(user, slug)) notFound();

  const discipline = getDiscipline(slug)!;
  const tournaments = await prisma.tournament.findMany({
    where: { discipline: slug },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <AdminChrome title={discipline.name} email={user.email}>
      <p className="text-sm text-white/55" style={{ color: discipline.color }}>
        {discipline.blurb}
      </p>

      <section className="mt-8 max-w-2xl">
        <h2 className="font-display text-xl">Создать сетку</h2>
        <CreateTournamentForm discipline={slug} accent={discipline.color} />
      </section>

      <section className="mt-12">
        <h2 className="font-display text-xl">Турниры дисциплины</h2>
        <ul className="mt-4 divide-y divide-white/10 border border-white/10">
          {tournaments.map((t) => (
            <li
              key={t.id}
              className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
            >
              <div>
                <p className="font-medium">{t.name}</p>
                <p className="text-xs text-white/45">
                  {t.format} · {t.status}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-4">
                <Link
                  href={`/admin/tournaments/${t.id}`}
                  className="text-sm hover:underline"
                  style={{ color: discipline.color }}
                >
                  Редактировать
                </Link>
                <DeleteTournamentButton
                  tournamentId={t.id}
                  tournamentName={t.name}
                  discipline={slug}
                />
              </div>
            </li>
          ))}
        </ul>
      </section>
    </AdminChrome>
  );
}
