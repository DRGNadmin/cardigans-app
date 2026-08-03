import { createPortal } from "react-dom";
import { BrandBackdrop } from "./BrandBackdrop";
import { SplashScreenLogo } from "./SplashScreenLogo";

/** Полноэкранный загрузочный экран (макет из design HTML + BrandBackdrop). */
export function SplashScreen({ opaque }: { opaque: boolean }) {
  return createPortal(
    <div
      className={`fixed inset-0 z-[9999] transition-opacity duration-[300ms] ease-out ${
        opaque ? "opacity-100" : "pointer-events-none opacity-0"
      }`}
      aria-hidden
    >
      <div className="cg-splash-root">
        <BrandBackdrop />
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center p-8">
          <div className="cg-splash-logo-scene w-full max-w-[431px]">
            <div className="cg-splash-breathe">
              <SplashScreenLogo />
            </div>
          </div>
        </div>
        <div className="pointer-events-none fixed bottom-8 left-1/2 z-20 flex w-[200px] -translate-x-1/2 flex-col items-center gap-3 pb-safe">
          <div className="cg-splash-sys-label font-head text-[10px] font-bold uppercase tracking-[0.25em] text-[--accent]">
            System Initialization
          </div>
          <div className="relative h-[3px] w-full overflow-hidden rounded-full bg-white/10 shadow-[0_0_15px_rgba(233,141,43,0.15)]">
            <div className="cg-splash-loader-inner absolute inset-y-0 left-0 h-full rounded-full bg-[--accent] shadow-[0_0_10px_rgba(233,141,43,0.6)]" />
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
