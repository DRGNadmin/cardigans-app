import { formatMatchDateTime } from "@/lib/dateTime";

type Row = {
  id: string;
  roundName: string;
  p1: string;
  p2: string;
  score1: number | null;
  score2: number | null;
  scheduledAt: Date | string | null;
  venue: string | null;
};

export function ScheduleList({
  rows,
  accent,
}: {
  rows: Row[];
  accent: string;
}) {
  if (!rows.length) {
    return (
      <div className="border border-dashed border-white/15 px-6 py-16 text-center text-white/55">
        Расписание появится позже
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-white/15 text-xs uppercase tracking-[0.16em] text-white/45">
            <th className="px-3 py-3 font-medium">Дата и время</th>
            <th className="px-3 py-3 font-medium">Стадия</th>
            <th className="px-3 py-3 font-medium">Матч</th>
            <th className="px-3 py-3 font-medium">Счёт</th>
            <th className="px-3 py-3 font-medium">Площадка</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const when = r.scheduledAt
              ? formatMatchDateTime(r.scheduledAt)
              : "Не назначено";
            return (
              <tr key={r.id} className="border-b border-white/8 hover:bg-white/[0.03]">
                <td className="px-3 py-3.5 tabular-nums text-white/85">
                  {when}
                </td>
                <td className="px-3 py-3.5" style={{ color: accent }}>
                  {r.roundName}
                </td>
                <td className="px-3 py-3.5">
                  {r.p1} <span className="text-white/35">vs</span> {r.p2}
                </td>
                <td className="px-3 py-3.5 tabular-nums">
                  {r.score1 != null && r.score2 != null
                    ? `${r.score1} : ${r.score2}`
                    : "—"}
                </td>
                <td className="px-3 py-3.5 text-white/60">{r.venue ?? "—"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
