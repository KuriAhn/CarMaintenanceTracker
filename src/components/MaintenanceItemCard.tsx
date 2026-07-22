import type { MaintenanceItem, Vehicle } from "../data/maintenance";
import { computeMaintenance, type MaintenanceStatus } from "../lib/maintenanceCalc";
import caretRight from "../assets/caret-right.svg";

const STATUS_COLOR: Record<MaintenanceStatus, string> = {
  green: "bg-status-green",
  yellow: "bg-status-yellow",
  red: "bg-status-red",
  never: "bg-progress-track",
};

interface MaintenanceItemCardProps {
  item: MaintenanceItem;
  vehicle: Vehicle;
  onClick?: () => void;
}

export default function MaintenanceItemCard({ item, vehicle, onClick }: MaintenanceItemCardProps) {
  const computed = computeMaintenance(item, vehicle);

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full cursor-pointer flex-col items-start gap-4 border-t border-card-border p-4 text-left transition-colors hover:bg-accent-blue-wash ${
        item.selected ? "bg-accent-blue-wash" : "bg-white"
      }`}
    >
      <div className="flex w-full items-center gap-2">
        <div className={`size-2 rounded-full shrink-0 ${STATUS_COLOR[computed.status]}`} />
        <p className="flex-1 min-w-0 text-base font-bold text-black">{item.name}</p>
        {item.selected && (
          <div className="size-5 shrink-0">
            <img src={caretRight} alt="" className="size-full" />
          </div>
        )}
      </div>

      <div className="flex w-full flex-col gap-4 pl-4">
        <div className="flex w-full items-center gap-2 text-2xl font-medium whitespace-nowrap">
          {computed.targetMileageLabel && <p className="text-black">{computed.targetMileageLabel}</p>}
          {computed.targetMileageLabel && computed.targetDateLabel && (
            <p className="text-muted-2">/</p>
          )}
          {computed.targetDateLabel && <p className="text-black">{computed.targetDateLabel}</p>}
        </div>

        <div className="flex w-full flex-col gap-2">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-progress-track">
            <div
              className={`h-full rounded-full ${STATUS_COLOR[computed.status]}`}
              style={{ width: `${computed.progress * 100}%` }}
            />
          </div>
          <div className="flex w-full gap-1 text-sm font-medium">
            <p className="flex-1 min-w-0 text-black">{computed.remainingLabel}</p>
            <p className="shrink-0 text-muted-2 whitespace-nowrap">{computed.lastCompletedLabel}</p>
          </div>
        </div>
      </div>
    </button>
  );
}
