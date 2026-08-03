import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { LevelRanksModal } from "../components/LevelRanksModal";

type Ctx = {
  openLevelsModal: () => void;
  closeLevelsModal: () => void;
  levelsModalOpen: boolean;
};

const LevelRanksCtx = createContext<Ctx | null>(null);

export function LevelRanksModalProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const openLevelsModal = useCallback(() => setOpen(true), []);
  const closeLevelsModal = useCallback(() => setOpen(false), []);
  const value = useMemo(
    () => ({ openLevelsModal, closeLevelsModal, levelsModalOpen: open }),
    [open, openLevelsModal, closeLevelsModal]
  );

  return (
    <LevelRanksCtx.Provider value={value}>
      {children}
      <LevelRanksModal open={open} onClose={closeLevelsModal} />
    </LevelRanksCtx.Provider>
  );
}

export function useLevelRanksModal() {
  const v = useContext(LevelRanksCtx);
  if (!v) throw new Error("useLevelRanksModal must be used within LevelRanksModalProvider");
  return v;
}
