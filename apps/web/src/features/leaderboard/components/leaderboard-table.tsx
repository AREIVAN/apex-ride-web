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
      <table className="w-full border-collapse text-sm">
        <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-4 py-3">#</th>
            <th className="px-4 py-3">Rider</th>
            <th className="px-4 py-3">Time</th>
            <th className="px-4 py-3">Attempt</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={`${row.segmentId}-${row.riderId}`} className="border-t border-slate-100">
              <td className="px-4 py-3 font-semibold text-slate-900">{row.rank}</td>
              <td className="px-4 py-3 text-slate-700">{row.riderName}</td>
              <td className="px-4 py-3 font-semibold text-brand-900">{formatDuration(row.elapsedTimeSec)}</td>
              <td className="px-4 py-3 text-slate-600">{new Date(row.recordedAt).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
