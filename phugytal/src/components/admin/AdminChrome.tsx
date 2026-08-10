"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

export function AdminChrome({
  title,
  email,
  children,
}: {
  title: string;
  email: string;
  children: React.ReactNode;
}) {
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/admin/login");
    router.refresh();
  }

  return (
    <main className="brand-zigzag min-h-screen">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 px-5 py-4 md:px-8">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-white/45">Admin</p>
          <h1 className="font-display text-2xl text-white">{title}</h1>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-white/55">{email}</span>
          <Link href="/admin" className="text-white/70 hover:text-white">
            Панель
          </Link>
          <Link href="/" className="text-white/70 hover:text-white">
            Сайт
          </Link>
          <button
            type="button"
            onClick={logout}
            className="text-[#FF006E] hover:underline"
          >
            Выйти
          </button>
        </div>
      </header>
      <div className="px-5 py-8 md:px-8">{children}</div>
    </main>
  );
}
