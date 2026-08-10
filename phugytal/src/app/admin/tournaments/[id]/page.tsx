import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AdminChrome } from "@/components/admin/AdminChrome";
import { DeleteTournamentButton } from "@/components/admin/DeleteTournamentButton";
import { TournamentEditor } from "@/components/admin/TournamentEditor";
import { canAccessDiscipline, getSessionUser } from "@/lib/auth/session";
import { getDiscipline } from "@/lib/disciplines";
import { prisma } from "@/lib/db";
import { serializeTournament } from "@/lib/tournamentQuery";

export default async function AdminTournamentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/admin/login");

  const { id } = await params;
  const tournament = await prisma.tournament.findUnique({
    where: { id },
    include: {
      participants: { orderBy: { seed: "asc" } },
      rounds: { orderBy: { order: "asc" } },
      matches: { orderBy: [{ orderInRound: "asc" }] },
      groups: { orderBy: { order: "asc" } },
    },
  });
  if (!tournament) notFound();
  if (!canAccessDiscipline(user, tournament.discipline)) notFound();

  const data = serializeTournament(tournament);
  const discipline = getDiscipline(tournament.discipline);
  const accent = discipline?.color ?? "#7946E2";

  return (
    <AdminChrome title={tournament.name} email={user.email}>
      <div className="mb-6 flex flex-wrap items-center gap-4 text-sm">
        <Link
          href={`/admin/d/${tournament.discipline}`}
          className="text-white/55 hover:text-white"
        >
          ← {discipline?.name ?? tournament.discipline}
        </Link>
        <Link
          href={`/d/${tournament.discipline}`}
          className="hover:underline"
          style={{ color: accent }}
        >
          Открыть публичную сетку
        </Link>
        <span className="text-white/40">{tournament.format}</span>
        <DeleteTournamentButton
          tournamentId={tournament.id}
          tournamentName={tournament.name}
          discipline={tournament.discipline}
        />
      </div>

      <TournamentEditor
        tournamentId={tournament.id}
        accent={accent}
        initialRounds={data.rounds}
        initialMatches={data.matches}
        participants={data.participants}
      />
    </AdminChrome>
  );
}
