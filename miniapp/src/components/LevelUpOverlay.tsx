import { AnimatePresence, motion } from "framer-motion";
import { createPortal } from "react-dom";
import { levelVisual } from "../lib/levelStyle";

type Props = {
  open: boolean;
  newLevel: number;
  onDismiss: () => void;
};

export function LevelUpOverlay({ open, newLevel, onDismiss }: Props) {
  const v = levelVisual(newLevel);

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[3000] flex items-center justify-center bg-black/88 p-6 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
          aria-label="Новый уровень"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          onClick={onDismiss}
        >
          <motion.div
            className="relative flex max-w-sm flex-col items-center text-center"
            initial={{ scale: 0.72, opacity: 0, y: 24 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: -16 }}
            transition={{ type: "spring", damping: 17, stiffness: 280 }}
            onClick={(e) => e.stopPropagation()}
          >
            <motion.div
              className="absolute -inset-16 rounded-full opacity-60 blur-3xl"
              style={{ background: `radial-gradient(circle, ${v.glow} 0%, transparent 70%)` }}
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: [0.6, 1.15, 1], opacity: [0, 0.9, 0.65] }}
              transition={{ duration: 0.9, ease: "easeOut" }}
            />
            <motion.div
              className="relative mb-2 font-head text-[11px] font-bold uppercase tracking-[0.35em] text-[--accent]"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.12 }}
            >
              Новый уровень
            </motion.div>
            <motion.div
              className="relative font-head text-7xl font-black tabular-nums leading-none tracking-tight text-white drop-shadow-[0_0_40px_rgba(233,141,43,0.55)]"
              initial={{ scale: 0.3, rotate: -8 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", damping: 12, stiffness: 220, delay: 0.05 }}
            >
              {newLevel}
            </motion.div>
            <motion.div
              className="relative mt-4 max-w-[280px] font-head text-lg font-bold uppercase tracking-widest"
              style={{
                background: `linear-gradient(90deg, ${v.from}, ${v.to})`,
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
                filter: `drop-shadow(0 0 12px ${v.glow})`,
              }}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.22 }}
            >
              {v.label}
            </motion.div>
            <motion.div
              className="relative mt-6 h-1 w-40 overflow-hidden rounded-full bg-white/10"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.35 }}
            >
              <motion.div
                className="h-full rounded-full"
                style={{
                  background: `linear-gradient(90deg, ${v.from}, ${v.to})`,
                  boxShadow: `0 0 12px ${v.glow}`,
                }}
                initial={{ width: "0%" }}
                animate={{ width: "100%" }}
                transition={{ delay: 0.4, duration: 0.55, ease: "easeOut" }}
              />
            </motion.div>
            <motion.button
              type="button"
              className="relative mt-8 rounded-full bg-[--accent] px-10 py-3 font-head text-sm font-bold uppercase tracking-wider text-black shadow-[0_0_24px_rgba(233,141,43,0.45)]"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              onClick={onDismiss}
            >
              Отлично
            </motion.button>
            <p className="relative mt-3 text-[10px] text-[--text-muted]">Нажмите вне окна, чтобы закрыть</p>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body
  );
}
