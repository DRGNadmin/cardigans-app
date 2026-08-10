"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { DISCIPLINES } from "@/lib/disciplines";

type UserRow = {
  id: string;
  email: string;
  name: string | null;
  role: string;
  disciplines: string[];
};

export function UsersAdmin({ initialUsers }: { initialUsers: UserRow[] }) {
  const router = useRouter();
  const [users, setUsers] = useState(initialUsers);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [disciplines, setDisciplines] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  function toggle(slug: string) {
    setDisciplines((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug],
    );
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, name, disciplines }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Ошибка");
      return;
    }
    setUsers((prev) => [data.user, ...prev]);
    setEmail("");
    setPassword("");
    setName("");
    setDisciplines([]);
    router.refresh();
  }

  return (
    <div className="grid gap-10 lg:grid-cols-2">
      <form onSubmit={onSubmit} className="space-y-4 border border-white/12 p-5">
        <h2 className="font-display text-xl">Новый админ дисциплины</h2>
        <label className="block text-sm text-white/70">
          Имя
          <input
            className="focus-ring mt-2 w-full border border-white/15 bg-black px-3 py-2.5"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <label className="block text-sm text-white/70">
          Email
          <input
            type="email"
            required
            className="focus-ring mt-2 w-full border border-white/15 bg-black px-3 py-2.5"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <label className="block text-sm text-white/70">
          Пароль (мин. 10)
          <input
            type="password"
            required
            minLength={10}
            className="focus-ring mt-2 w-full border border-white/15 bg-black px-3 py-2.5"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        <fieldset>
          <legend className="text-sm text-white/70">Дисциплины</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {DISCIPLINES.map((d) => {
              const on = disciplines.includes(d.slug);
              return (
                <button
                  key={d.slug}
                  type="button"
                  onClick={() => toggle(d.slug)}
                  className="border px-3 py-1.5 text-sm"
                  style={{
                    borderColor: d.color,
                    color: on ? "#000" : d.color,
                    background: on ? d.color : "transparent",
                  }}
                >
                  {d.shortName}
                </button>
              );
            })}
          </div>
        </fieldset>
        {error ? <p className="text-sm text-[#FF006E]">{error}</p> : null}
        <button
          type="submit"
          className="bg-[#7946E2] px-5 py-3 font-semibold text-white"
        >
          Создать админа
        </button>
      </form>

      <div>
        <h2 className="font-display text-xl">Пользователи</h2>
        <ul className="mt-4 divide-y divide-white/10 border border-white/10">
          {users.map((u) => (
            <li key={u.id} className="px-4 py-3">
              <p className="font-medium">{u.email}</p>
              <p className="text-xs text-white/45">
                {u.role}
                {u.disciplines.length ? ` · ${u.disciplines.join(", ")}` : ""}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
