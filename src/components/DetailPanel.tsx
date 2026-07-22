import type { MaintenanceSectionData } from "../data/maintenance";
import { resolveHotspotZone } from "../data/carHotspots";
import CarIllustration from "./CarIllustration";

interface DetailPanelProps {
  maintenanceSections: MaintenanceSectionData[];
  selectedItemId?: string;
}

export default function DetailPanel({ maintenanceSections, selectedItemId }: DetailPanelProps) {
  const selectedItem = maintenanceSections
    .flatMap((section) => section.items)
    .find((item) => item.id === selectedItemId);
  const zone = resolveHotspotZone(selectedItemId);

  return (
    <div className="flex flex-1 min-w-0 flex-col self-stretch overflow-hidden rounded-2xl border border-card-border bg-white">
      <div className="flex w-full items-center gap-2 border-b border-card-border px-8 py-6">
        <p className="min-w-px flex-1 text-base font-bold break-words text-black">
          {selectedItem ? selectedItem.name : "Vehicle overview"}
        </p>
        {selectedItem && (
          <div className="flex h-[22px] shrink-0 items-center justify-center rounded bg-black px-2 py-1">
            <p className="text-xs font-extrabold whitespace-nowrap text-white">{selectedItem.difficulty}</p>
          </div>
        )}
      </div>
      <div className="min-h-0 flex-1 p-4">
        <CarIllustration zone={zone} />
      </div>
    </div>
  );
}
