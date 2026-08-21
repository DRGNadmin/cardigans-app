import Image from "next/image";
import Link from "next/link";
import { TeamSearch } from "@/components/TeamSearch";

export function SiteHeader({ accent }: { accent?: string } = {}) {
  return (
    <header
      className="relative z-30 overflow-visible border-b border-white/10 bg-black/40 backdrop-blur-md"
      style={accent ? { ["--header-accent" as string]: accent } : undefined}
    >
      <div className="mx-auto flex max-w-[1400px] items-center gap-3 px-4 py-2.5 md:px-6 md:py-3 lg:px-8">
        <Link
          href="/"
          className="focus-ring relative -ml-1 inline-flex shrink-0 items-center"
          aria-label="На главную"
        >
          <Image
            src="/logo-phygital.png"
            alt="Чемпионат России по фиджитал спорту"
            width={756}
            height={330}
            priority
            className="h-11 w-auto object-contain object-left sm:h-12 md:h-14"
          />
        </Link>
        <TeamSearch accent={accent} />
      </div>
    </header>
  );
}
