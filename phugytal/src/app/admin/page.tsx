import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminChrome } from "@/components/admin/AdminChrome";
import { getSessionUser } from "@/lib/auth/session";
import { DISCIPLINES } from "@/lib/disciplines";
import { prisma } from "@/lib/db";

export default async function AdminHomePage() {
  const user = await getSessionUser();
  if (!user) redirect("/admin/login");

  const allowed =
    user.role === "SUPER_ADMIN"
      ? DISCIPLINES
      : DISCIPLINES.filter((d) => user.disciplines.includes(d.slug));

  const tournaments = await prisma.tournament.findMany({
    where:
      user.role === "SUPER_ADMIN"
        ? {}
        : { discipline: { in: user.disciplines } },
    orderBy: { updatedAt: "desc" },
    take: 20,
  });

  return (
    <AdminChrome title="Панель управления" email={user.email}>
      <section>
        <h2 className="font-display text-xl text-white/90">Дисциплины</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {allowed.map((d) => (
            <Link
              key={d.slug}
              href={`/admin/d/${d.slug}`}
              className="border border-white/12 bg-white/[0.03] px-5 py-5 transition hover:border-white/30"
            >
              <p className="text-xs uppercase tracking-[0.18em] text-white/45">
                {d.blurb}
              </p>
              <p className="font-display mt-2 text-3xl" style={{ color: d.color }}>
                {d.name}
              </p>
              <p className="mt-3 text-sm text-white/55">Управлять сеткой →</p>
            </Link>
          ))}
        </div>
      </section>

      {user.role === "SUPER_ADMIN" ? (
        <section className="mt-10">
          <Link
            href="/admin/users"
            className="text-sm uppercase tracking-wider text-[#7946E2] hover:underline"
          >
            Управление админами дисциплин →
          </Link>
        </section>
      ) : null}

      <section className="mt-10">
        <h2 className="font-display text-xl text-white/90">Недавние турниры</h2>
        <ul className="mt-4 divide-y divide-white/10 border border-white/10">
          {tournaments.length === 0 ? (
            <li className="px-4 py-6 text-white/50">Пока нет турниров</li>
          ) : (
            tournaments.map((t) => (
              <li key={t.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div>
                  <p className="font-medium">{t.name}</p>
                  <p className="text-xs text-white/45">
                    {t.discipline} · {t.format} · {t.status}
                  </p>
                </div>
                <Link
                  href={`/admin/tournaments/${t.id}`}
                  className="text-sm text-white/70 hover:text-white"
                >
                  Открыть
                </Link>
              </li>
            ))
          )}
        </ul>
      </section>
    </AdminChrome>
  );
}
