"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        setError("Неверный логин или пароль");
        return;
      }
      router.replace("/admin");
      router.refresh();
    } catch {
      setError("Ошибка сети");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="brand-zigzag flex min-h-screen items-center justify-center px-5">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-md border border-white/12 bg-black/50 p-8"
      >
        <p className="text-xs uppercase tracking-[0.22em] text-white/50">Admin</p>
        <h1 className="font-display mt-2 text-4xl" style={{ color: "#7946E2" }}>
          Вход
        </h1>
        <label className="mt-8 block text-sm text-white/70">
          Email
          <input
            className="focus-ring mt-2 w-full border border-white/15 bg-black px-3 py-3 text-white"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>
        <label className="mt-4 block text-sm text-white/70">
          Пароль
          <input
            className="focus-ring mt-2 w-full border border-white/15 bg-black px-3 py-3 text-white"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
          />
        </label>
        {error ? <p className="mt-4 text-sm text-[#FF006E]">{error}</p> : null}
        <button
          type="submit"
          disabled={loading}
          className="focus-ring mt-6 w-full bg-[#7946E2] px-4 py-3 font-semibold text-white transition hover:brightness-110 disabled:opacity-50"
        >
          {loading ? "Входим…" : "Войти"}
        </button>
      </form>
    </main>
  );
}
