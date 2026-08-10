import Image from "next/image";
import Link from "next/link";

export function SiteHeader({ accent: _accent }: { accent?: string }) {
  return (
    <header className="relative z-20 flex items-center justify-between gap-4 px-4 py-3 md:px-8 md:py-4">
      <Link
        href="/"
        className="focus-ring group relative -ml-1 inline-flex shrink-0 items-center sm:-ml-2"
        aria-label="Чемпионат России по фиджитал спорту — на главную"
      >
        <Image
          src="/logo-phygital.png"
          alt="Чемпионат России по фиджитал спорту"
          width={756}
          height={330}
          priority
          className="h-[4.25rem] w-auto object-contain object-left transition duration-300 group-hover:brightness-110 sm:h-20 md:h-[5.75rem]"
        />
      </Link>
    </header>
  );
}
