import { SiteHeader } from "@/components/SiteHeader";
import { DisciplinePicker } from "@/components/DisciplinePicker";
import { DateCard } from "@/components/DateCard";
import { DISCIPLINES } from "@/lib/disciplines";

export default function HomePage() {
  return (
    <main className="brand-zigzag relative overflow-x-hidden">
      <SiteHeader />

      <section className="relative z-10 mx-auto max-w-[1400px] px-4 pb-4 pt-7 md:px-6 md:pt-9 lg:px-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <h1 className="animate-rise font-display text-[clamp(2.2rem,6.5vw,4.4rem)] leading-[0.95] text-white">
              Все матчи.
              <span className="mt-1 block text-white">Все сетки.</span>
              <span className="mt-1 block bg-gradient-to-r from-[#c4b5fd] to-white bg-clip-text text-transparent">
                Все в одном месте.
              </span>
            </h1>
            <p className="animate-rise mt-4 max-w-xl text-sm uppercase tracking-[0.06em] text-white/55 md:text-[0.95rem]">
              Смотри сетки и расписание всех дисциплин чемпионата России по
              фиджитал спорту.
            </p>
          </div>
          <DateCard />
        </div>
      </section>

      <div className="relative z-10 pb-8 pt-2 md:pb-10">
        <DisciplinePicker disciplines={DISCIPLINES} />
      </div>
    </main>
  );
}
