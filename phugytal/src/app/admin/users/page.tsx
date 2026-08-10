import { notFound, redirect } from "next/navigation";
import { AdminChrome } from "@/components/admin/AdminChrome";
import { UsersAdmin } from "@/components/admin/UsersAdmin";
import { getSessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

export default async function AdminUsersPage() {
  const user = await getSessionUser();
  if (!user) redirect("/admin/login");
  if (user.role !== "SUPER_ADMIN") notFound();

  const users = await prisma.user.findMany({
    include: { disciplines: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <AdminChrome title="Админы дисциплин" email={user.email}>
      <UsersAdmin
        initialUsers={users.map((u) => ({
          id: u.id,
          email: u.email,
          name: u.name,
          role: u.role,
          disciplines: u.disciplines.map((d) => d.disciplineSlug),
        }))}
      />
    </AdminChrome>
  );
}
