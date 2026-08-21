type Listener = (payload: { type: string; tournamentId: string }) => void;

const g = globalThis as unknown as {
  __phugytalBus?: Map<string, Set<Listener>>;
};

function bus() {
  if (!g.__phugytalBus) g.__phugytalBus = new Map();
  return g.__phugytalBus;
}

export function subscribeTournament(
  tournamentId: string,
  listener: Listener,
): () => void {
  const map = bus();
  let set = map.get(tournamentId);
  if (!set) {
    set = new Set();
    map.set(tournamentId, set);
  }
  set.add(listener);
  return () => {
    set!.delete(listener);
    if (set!.size === 0) map.delete(tournamentId);
  };
}

export function publishTournament(
  tournamentId: string,
  type = "tournament:update",
) {
  const set = bus().get(tournamentId);
  if (!set) return;
  const payload = { type, tournamentId };
  for (const listener of set) {
    try {
      listener(payload);
    } catch {
      /* ignore broken listeners */
    }
  }
}
