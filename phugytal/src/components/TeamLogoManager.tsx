"use client";

import { useRef, useState } from "react";

type Participant = {
  id: string;
  name: string;
  seed: number;
  logoUrl: string | null;
};

export function TeamLogoManager({
  participants,
  accent,
  onUpdated,
}: {
  participants: Participant[];
  accent: string;
  onUpdated: () => void;
}) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  async function upload(id: string, file: File) {
    setBusyId(id);
    setMsg(null);
    try {
      const body = new FormData();
      body.set("file", file);
      const res = await fetch(`/api/admin/participants/${id}/logo`, {
        method: "POST",
        body,
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        setMsg(err?.error ?? "Не удалось загрузить логотип");
        return;
      }
      onUpdated();
    } finally {
      setBusyId(null);
    }
  }

  async function remove(id: string) {
    setBusyId(id);
    setMsg(null);
    try {
      const res = await fetch(`/api/admin/participants/${id}/logo`, {
        method: "DELETE",
      });
      if (!res.ok) {
        setMsg("Не удалось удалить логотип");
        return;
      }
      onUpdated();
    } finally {
      setBusyId(null);
    }
  }

  const rows = [...participants].sort((a, b) => a.seed - b.seed);

  return (
    <div className="ui-panel overflow-hidden">
      <div className="border-b border-white/10 px-3 py-2.5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/50">
          Логотипы команд
        </p>
        <p className="mt-1 text-[11px] text-white/35">
          PNG / JPG / WEBP, до 2 МБ — видны в блоке «Ближайший матч»
        </p>
      </div>
      {msg ? (
        <p className="border-b border-white/10 px-3 py-2 text-xs text-white/55">
          {msg}
        </p>
      ) : null}
      <ul className="scroll-dark max-h-[320px] divide-y divide-white/[0.08] overflow-y-auto">
        {rows.map((p) => (
          <li
            key={p.id}
            className="flex items-center gap-3 px-3 py-2.5"
          >
            <span
              className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-[8px] border border-white/10 bg-black/50"
              style={{ boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${accent} 25%, transparent)` }}
            >
              {p.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={p.logoUrl}
                  alt=""
                  className="h-full w-full object-contain p-0.5"
                />
              ) : (
                <span className="font-display text-xs text-white/30">
                  {p.seed}
                </span>
              )}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-white">{p.name}</p>
              <p className="text-[10px] uppercase tracking-wider text-white/35">
                сид {p.seed}
              </p>
            </div>
            <input
              ref={(el) => {
                inputRefs.current[p.id] = el;
              }}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (file) void upload(p.id, file);
              }}
            />
            <button
              type="button"
              disabled={busyId === p.id}
              className="focus-ring btn-ghost px-2.5 py-1.5 text-[10px]"
              onClick={() => inputRefs.current[p.id]?.click()}
            >
              {busyId === p.id ? "…" : p.logoUrl ? "Заменить" : "Загрузить"}
            </button>
            {p.logoUrl ? (
              <button
                type="button"
                disabled={busyId === p.id}
                className="focus-ring px-2 py-1.5 text-[10px] uppercase tracking-wider text-white/40 hover:text-white"
                onClick={() => void remove(p.id)}
              >
                ✕
              </button>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
