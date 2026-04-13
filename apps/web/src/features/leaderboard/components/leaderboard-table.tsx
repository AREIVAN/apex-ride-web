import { Card } from "@/features/shared/ui/card";
import type { LeaderboardRow } from "@/types/domain";

function formatDuration(seconds: number): string {
  const min = Math.floor(seconds / 60);
  const sec = seconds % 60;
  return `${min}:${sec.toString().padStart(2, "0")}`;
}

export function LeaderboardTable({ rows }: { rows: LeaderboardRow[] }) {
  return (
    <Card className="overflow-hidden p-0">
      <div className="table-scroll -mx-1 px-1 sm:mx-0 sm:px-0">
        <table className="w-full min-w-[480px] border-collapse text-xs sm:min-w-[520px] sm:text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="sticky left-0 z-[1] bg-slate-50 px-3 py-2.5 sm:px-4 sm:py-3">#</th>
              <th className="px-3 py-2.5 sm:px-4 sm:py-3">Rider</th>
              <th className="px-3 py-2.5 sm:px-4 sm:py-3">Time</th>
              <th className="px-3 py-2.5 sm:px-4 sm:py-3">Attempt</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={`${row.segmentId}-${row.riderId}`} className="border-t border-slate-100 transition-colors hover:bg-slate-50/70">
                <td className="sticky left-0 z-[1] bg-white px-3 py-2.5 font-semibold text-slate-900 sm:px-4 sm:py-3">{row.rank}</td>
                <td className="px-3 py-2.5 text-slate-700 sm:px-4 sm:py-3">{row.riderName}</td>
                <td className="px-3 py-2.5 font-semibold text-brand-900 sm:px-4 sm:py-3">{formatDuration(row.elapsedTimeSec)}</td>
                <td className="px-3 py-2.5 text-slate-600 sm:px-4 sm:py-3">{new Date(row.recordedAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
