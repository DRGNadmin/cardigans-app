"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import type { Discipline } from "@/lib/disciplines";
import { DisciplineSticker } from "@/components/BrandStickers";

export function DisciplinePicker({ disciplines }: { disciplines: Discipline[] }) {
  return (
    <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-4 px-5 pb-16 sm:grid-cols-2 lg:grid-cols-3 md:px-10">
      {disciplines.map((d, i) => (
        <motion.div
          key={d.slug}
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 * i, duration: 0.4, ease: "easeOut" }}
          whileHover={{ y: -4 }}
        >
          <Link
            href={`/d/${d.slug}`}
            className="focus-ring group relative block overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] px-6 py-8 transition duration-300 hover:border-white/20"
            style={{ ["--disc" as string]: d.color }}
          >
            <div
              className="pointer-events-none absolute inset-0 opacity-0 transition duration-300 group-hover:opacity-100"
              style={{
                background: `radial-gradient(circle at 30% 25%, ${d.color}40, transparent 58%)`,
              }}
            />

            <span className="absolute -right-1 -top-1 transition duration-300 group-hover:scale-110 group-hover:rotate-6 md:right-3 md:top-3">
              <DisciplineSticker slug={d.slug} />
            </span>

            <p className="relative pr-16 text-xs uppercase tracking-[0.22em] text-white/50">
              {d.blurb}
            </p>
            <h2
              className="relative mt-3 font-display text-4xl md:text-5xl"
              style={{ color: d.color }}
            >
              {d.name}
            </h2>
            <p className="relative mt-4 text-sm text-white/55 transition group-hover:text-white/80">
              Сетка и расписание →
            </p>
          </Link>
        </motion.div>
      ))}
    </div>
  );
}
