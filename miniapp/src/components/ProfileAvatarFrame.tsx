import type { ReactNode } from "react";
import type { ProfileFrameSpec } from "../lib/profileCosmetic";

type Props = {
  spec: ProfileFrameSpec;
  sizePx?: number;
  children: ReactNode;
};

/** Косметическая рамка уровня вокруг аватара (профиль). */
export function ProfileAvatarFrame({ spec, sizePx = 80, children }: Props) {
  const w = spec.ringWidth;
  const total = sizePx + w * 2;
  return (
    <div
      className={spec.pulse ? "animate-profile-ring-pulse" : ""}
      style={{
        width: total,
        height: total,
        borderRadius: "50%",
        padding: w,
        background: spec.ringGradient,
        boxShadow: `0 0 ${spec.shadowSpread}px ${spec.glow}, inset 0 0 14px rgba(255,255,255,0.07)`,
      }}
    >
      <div className="h-full w-full overflow-hidden rounded-full bg-[#0a0a0a]">{children}</div>
    </div>
  );
}
