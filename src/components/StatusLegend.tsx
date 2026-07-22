import type { StatusCounts } from "../lib/maintenanceCalc";

interface StatusLegendProps {
  counts: StatusCounts;
}

const LEGEND_ITEMS: { key: keyof StatusCounts; dot: string; text: string }[] = [
  { key: "green", dot: "bg-status-green", text: "text-status-green-text" },
  { key: "yellow", dot: "bg-status-yellow", text: "text-status-yellow-text" },
  { key: "red", dot: "bg-status-red", text: "text-status-red-text" },
  { key: "never", dot: "bg-progress-track", text: "text-muted" },
];

export default function StatusLegend({ counts }: StatusLegendProps) {
  return (
    <div className="flex gap-1 items-center shrink-0">
      {LEGEND_ITEMS.map(({ key, dot, text }) => (
        <div
          key={key}
          className="flex items-center gap-2 rounded-full border border-card-border bg-white px-2 py-0.5"
        >
          <div className={`size-2 rounded-full shrink-0 ${dot}`} />
          <p className={`text-base font-bold whitespace-nowrap ${text}`}>
            {counts[key]}
          </p>
        </div>
      ))}
    </div>
  );
}
