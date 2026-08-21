"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import type { Discipline } from "@/lib/disciplines";
import { DisciplineSticker } from "@/components/BrandStickers";

export function DisciplinePicker({
  disciplines,
  selectedSlug,
}: {
  disciplines: Discipline[];
  selectedSlug?: string;
}) {
  return (
    <div
      id="disciplines"
      className="relative z-10 grid w-full grid-cols-2 gap-2.5 px-3 sm:gap-3 sm:px-4 md:grid-cols-3 md:px-6 lg:grid-cols-5 lg:gap-3 lg:px-8"
    >
      {disciplines.map((d, i) => {
        const selected = selectedSlug === d.slug;
        return (
          <motion.div
            key={d.slug}
            className={`relative min-w-0 ${i === disciplines.length - 1 ? "col-span-2 md:col-span-1" : ""}`}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.04 * i, duration: 0.28, ease: "easeOut" }}
          >
            <Link
              href={`/d/${d.slug}`}
              className="focus-ring group relative flex min-h-[10.5rem] flex-col overflow-hidden rounded-[10px] border bg-black/80 px-3 py-3 backdrop-blur-sm transition-[border-color,background-color,transform] duration-200 ease-out sm:min-h-[11.5rem] sm:px-4 sm:py-4 lg:min-h-[12.5rem] hover:-translate-y-0.5 hover:bg-black/95"
              style={{
                ["--disc" as string]: d.color,
                borderColor: selected ? d.color : "rgba(255,255,255,0.12)",
                boxShadow: selected ? `0 0 0 1px ${d.color}` : undefined,
              }}
              onMouseEnter={(e) => {
                if (selected) return;
                e.currentTarget.style.borderColor = d.color;
              }}
              onMouseLeave={(e) => {
                if (selected) return;
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)";
              }}
              aria-current={selected ? "page" : undefined}
            >
              {selected ? (
                <span
                  className="absolute right-2 top-2 z-10 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-black"
                  style={{ background: d.color }}
                >
                  Выбрано
                </span>
              ) : null}

              <span className="pointer-events-none absolute -right-1 top-7 sm:right-0 sm:top-6">
                <DisciplineSticker slug={d.slug} size={100} />
              </span>

              <p className="relative z-[1] max-w-[58%] text-[0.6rem] uppercase leading-snug tracking-[0.14em] text-white/40 sm:text-[0.65rem]">
                {d.blurb}
              </p>
              <h2
                className="relative z-[1] mt-auto pt-8 font-display text-[clamp(1.45rem,1.9vw,2.15rem)] leading-none"
                style={{ color: d.color }}
              >
                {d.name}
              </h2>
              <p
                className="relative z-[1] mt-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/45 transition-colors duration-200 group-hover:text-white/80"
                style={selected ? { color: d.color } : undefined}
              >
                Сетка и расписание
              </p>
            </Link>
          </motion.div>
        );
      })}
    </div>
  );
}
