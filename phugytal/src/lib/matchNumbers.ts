/** Shared global M1… numbering — same rule as bracket feed labels. */

export type NumberableMatch = {
  id: string;
  roundId: string;
  orderInRound: number;
  isBye?: boolean | null;
};

export type NumberableRound = {
  id: string;
  order: number;
};

/** Sort: round.order → orderInRound; skip byes; continuous M1… across tournament. */
export function assignMatchNumbers(
  matches: NumberableMatch[],
  rounds: NumberableRound[],
): Map<string, number> {
  const orderOf = new Map(rounds.map((r) => [r.id, r.order]));
  const ordered = [...matches].sort((a, b) => {
    const ao = orderOf.get(a.roundId) ?? 0;
    const bo = orderOf.get(b.roundId) ?? 0;
    if (ao !== bo) return ao - bo;
    return a.orderInRound - b.orderInRound;
  });
  const numById = new Map<string, number>();
  let n = 0;
  for (const m of ordered) {
    if (m.isBye) continue;
    n += 1;
    numById.set(m.id, n);
  }
  return numById;
}

export function formatMatchCode(n: number) {
  return `M${n}`;
}

export function matchDisplayName(
  participantId: string | null | undefined,
  participantName: string | undefined,
  slotLabel: string | null | undefined,
): string {
  if (participantId && participantName) return participantName;
  if (slotLabel?.trim()) return slotLabel.trim();
  return "TBD";
}

/** Scheduled time → match number (unscheduled last). */
export function compareScheduleRows(
  a: {
    isLive?: boolean;
    scheduledAt: string | null;
    matchNo: number | null;
  },
  b: {
    isLive?: boolean;
    scheduledAt: string | null;
    matchNo: number | null;
  },
): number {
  const ta = a.scheduledAt ? new Date(a.scheduledAt).getTime() : Infinity;
  const tb = b.scheduledAt ? new Date(b.scheduledAt).getTime() : Infinity;
  if (ta !== tb) return ta - tb;
  return (a.matchNo ?? 99999) - (b.matchNo ?? 99999);
}
