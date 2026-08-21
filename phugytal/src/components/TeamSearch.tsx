"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type Hit = {
  id: string;
  name: string;
  seed: number;
  groupName: string | null;
  discipline: string;
  disciplineName: string;
  color: string;
  href: string;
};

export function TeamSearch({ accent }: { accent?: string }) {
  const router = useRouter();
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [loading, setLoading] = useState(false);
  const [, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => inputRef.current?.focus(), 280);
    return () => window.clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false);
        setQ("");
        setHits([]);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        setQ("");
        setHits([]);
      }
    }
    // pointerdown on document — but picks use onMouseDown to beat this
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => {
    const query = q.trim();
    if (!open || query.length < 1) {
      setHits([]);
      setLoading(false);
      return;
    }
    const ctrl = new AbortController();
    setLoading(true);
    const timer = window.setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/search/teams?q=${encodeURIComponent(query)}`,
          { signal: ctrl.signal, cache: "no-store" },
        );
        if (!res.ok) {
          setHits([]);
          return;
        }
        const data = (await res.json()) as { results: Hit[] };
        setHits(data.results ?? []);
      } catch (err) {
        if ((err as Error).name !== "AbortError") setHits([]);
      } finally {
        setLoading(false);
      }
    }, 160);
    return () => {
      ctrl.abort();
      window.clearTimeout(timer);
    };
  }, [q, open]);

  function pick(hit: Hit) {
    setOpen(false);
    setQ("");
    setHits([]);
    startTransition(() => {
      router.push(hit.href);
    });
  }

  function toggle() {
    if (open) {
      setOpen(false);
      setQ("");
      setHits([]);
    } else {
      setOpen(true);
    }
  }

  return (
    <div
      ref={rootRef}
      className="relative z-[60] ml-auto flex items-center justify-end gap-1"
    >
      <div
        className="overflow-hidden transition-[max-width,opacity,margin] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
        style={{
          maxWidth: open ? 280 : 0,
          opacity: open ? 1 : 0,
          marginRight: open ? 2 : 0,
        }}
      >
        <div className="flex h-10 w-[260px] items-center rounded-[10px] border border-white/15 bg-black/70 px-3 backdrop-blur-sm">
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && hits[0]) {
                e.preventDefault();
                pick(hits[0]);
              }
            }}
            placeholder="Название команды…"
            aria-label="Поиск команды"
            aria-autocomplete="list"
            aria-controls={listId}
            className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/35"
          />
        </div>
      </div>

      <button
        type="button"
        className="focus-ring inline-flex h-10 w-10 shrink-0 items-center justify-center text-white/65 transition hover:text-white"
        aria-label={open ? "Закрыть поиск" : "Поиск команды"}
        aria-expanded={open}
        onClick={toggle}
        style={open && accent ? { color: accent } : undefined}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
          <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.8" />
          <path
            d="M16.5 16.5L21 21"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      </button>

      {open && q.trim() ? (
        <div className="absolute right-0 top-[calc(100%+8px)] z-[70] w-[min(20rem,calc(100vw-2rem))]">
          <ul
            id={listId}
            role="listbox"
            className="scroll-dark ui-panel max-h-64 overflow-y-auto py-1 shadow-xl shadow-black/50"
          >
            {loading ? (
              <li className="px-3 py-3 text-sm text-white/40">Ищем…</li>
            ) : null}
            {!loading && !hits.length ? (
              <li className="px-3 py-3 text-sm text-white/40">
                Ничего не найдено
              </li>
            ) : null}
            {hits.map((hit) => (
              <li key={hit.id} role="option" aria-selected="false">
                <button
                  type="button"
                  className="focus-ring flex w-full items-start gap-3 px-3 py-2.5 text-left transition hover:bg-white/[0.06]"
                  onMouseDown={(e) => {
                    // Prevent document pointerdown from closing before navigation
                    e.preventDefault();
                    e.stopPropagation();
                    pick(hit);
                  }}
                >
                  <span
                    className="mt-0.5 h-2 w-2 shrink-0 rounded-full"
                    style={{ background: hit.color }}
                    aria-hidden
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm text-white">
                      {hit.name}
                    </span>
                    <span className="mt-0.5 block text-[11px] uppercase tracking-wider text-white/40">
                      {hit.disciplineName}
                      {hit.groupName ? ` · ${hit.groupName}` : ""}
                      {` · сид ${hit.seed}`}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
