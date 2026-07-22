import type { MaintenanceSectionData, Vehicle } from "../data/maintenance";
import { computeMaintenance, type StatusCounts } from "../lib/maintenanceCalc";
import StatusLegend from "./StatusLegend";
import MaintenanceItemCard from "./MaintenanceItemCard";

interface MaintenanceSectionProps {
  section: MaintenanceSectionData;
  vehicle: Vehicle;
  onSelectItem?: (itemId: string) => void;
}

export default function MaintenanceSection({ section, vehicle, onSelectItem }: MaintenanceSectionProps) {
  const counts = section.items.reduce<StatusCounts>(
    (acc, item) => {
      acc[computeMaintenance(item, vehicle).status] += 1;
      return acc;
    },
    { green: 0, yellow: 0, red: 0, never: 0 }
  );

  return (
    <div className="flex w-full flex-col gap-2">
      <div className="flex w-full items-center justify-between">
        <p className="text-base font-medium text-black">{section.title}</p>
        <StatusLegend counts={counts} />
      </div>
      <div className="flex w-full flex-col items-start overflow-hidden rounded-xl border border-card-border">
        {section.items.map((item) => (
          <MaintenanceItemCard
            key={item.id}
            item={item}
            vehicle={vehicle}
            onClick={() => onSelectItem?.(item.id)}
          />
        ))}
      </div>
    </div>
  );
}
