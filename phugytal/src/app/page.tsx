import { SiteHeader } from "@/components/SiteHeader";
import { DisciplinePicker } from "@/components/DisciplinePicker";
import { HeroStickerCluster } from "@/components/BrandStickers";
import { DISCIPLINES } from "@/lib/disciplines";

export default function HomePage() {
  return (
    <main className="brand-zigzag relative min-h-screen overflow-hidden">
      <SiteHeader />
      <section className="relative px-5 pb-10 pt-6 md:px-10 md:pt-10">
        <HeroStickerCluster />
        <div className="relative z-10">
          <p className="animate-rise text-xs uppercase tracking-[0.28em] text-white/50">
            Выбери дисциплину
          </p>
          <h1 className="animate-rise font-display mt-10 max-w-4xl text-5xl leading-[0.95] text-white sm:mt-12 md:mt-14 md:text-7xl">
            Смотри{" "}
            <span className="relative inline-block">
              <span
                className="sticker-float pointer-events-none absolute -top-10 left-1/2 z-0 -translate-x-1/2 sm:-top-12 md:-top-14"
                style={{ animationDelay: "0.35s" }}
                aria-hidden
              >
                <img
                  src="/stickers/fang.png"
                  alt=""
                  width={95}
                  height={102}
                  className="h-10 w-auto object-contain sm:h-12 md:h-14"
                  style={{
                    transform: "rotate(-8deg)",
                    filter: "drop-shadow(0 0 14px rgba(121,70,226,0.65))",
                  }}
                />
              </span>
              <span className="relative z-10">сетку</span>
            </span>
            .
            <span className="block" style={{ color: "#7946E2" }}>
              Следи за матчами.
            </span>
          </h1>
          <p className="animate-rise mt-5 max-w-xl text-base text-white/60 md:text-lg">
            Интерактивный информатор чемпионата: актуальные сетки и расписание по
            каждой дисциплине.
          </p>
        </div>
      </section>
      <DisciplinePicker disciplines={DISCIPLINES} />
    </main>
  );
}
