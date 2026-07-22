import { useEffect, useState } from "react";
import type { MaintenanceSectionData, Vehicle } from "../data/maintenance";
import { dateToInputValue, formatMiles, inputValueToDate, today } from "../lib/maintenanceCalc";
import xIcon from "../assets/x-icon.svg";

interface UpdateMaintenanceModalProps {
  vehicle: Vehicle;
  sections: MaintenanceSectionData[];
  onClose: () => void;
  onSubmit: (miles: number, date: Date, completedItemIds: Set<string>) => void;
}

export default function UpdateMaintenanceModal({
  vehicle,
  sections,
  onClose,
  onSubmit,
}: UpdateMaintenanceModalProps) {
  const [miles, setMiles] = useState(formatMiles(vehicle.mileage));
  const [milesTouched, setMilesTouched] = useState(false);
  const [date, setDate] = useState(dateToInputValue(today()));
  const [completedItemIds, setCompletedItemIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  function toggleItem(itemId: string) {
    setCompletedItemIds((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  }

  function handleMilesFocus() {
    if (!milesTouched) setMiles("");
  }

  function handleMilesBlur() {
    if (miles.trim() === "") {
      setMiles(formatMiles(vehicle.mileage));
      setMilesTouched(false);
    }
  }

  function handleSubmit() {
    const parsedMiles = Number(miles.replace(/[^0-9]/g, ""));
    onSubmit(
      Number.isFinite(parsedMiles) && miles.trim() !== "" ? parsedMiles : vehicle.mileage,
      date ? inputValueToDate(date) : today(),
      completedItemIds
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex cursor-pointer justify-end bg-black/60"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="flex h-full w-[600px] cursor-auto flex-col bg-white"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="update-maintenance-title"
      >
        <div className="flex w-full shrink-0 items-center gap-2 px-8 py-4">
          <p id="update-maintenance-title" className="flex-1 min-w-0 text-base font-bold text-black">
            Update Maintenance
          </p>
          <button type="button" onClick={onClose} className="size-5 shrink-0 cursor-pointer">
            <img src={xIcon} alt="Close" className="size-full" />
          </button>
        </div>

        <div className="scroll-panel flex flex-1 min-h-0 w-full flex-col gap-8 overflow-y-auto px-8 py-4">
          <div className="flex w-full items-start gap-2">
            <div className="flex flex-1 min-w-0 flex-col gap-2">
              <p className="w-full text-base font-bold text-black">Miles</p>
              <input
                type="text"
                inputMode="numeric"
                value={miles}
                onFocus={handleMilesFocus}
                onBlur={handleMilesBlur}
                onChange={(event) => {
                  setMiles(event.target.value);
                  setMilesTouched(true);
                }}
                className={`w-full rounded border border-divider px-3 py-2 text-base font-medium ${
                  milesTouched ? "text-black" : "text-muted-2"
                }`}
              />
            </div>
            <div className="flex flex-1 min-w-0 flex-col gap-2">
              <p className="w-full text-base font-bold text-black">Date</p>
              <input
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
                className="w-full rounded border border-divider px-3 py-2 text-base font-medium text-black"
              />
            </div>
          </div>

          <div className="flex flex-1 min-h-0 w-full flex-col gap-4">
            <p className="w-full text-base font-bold text-black">Select maintenance completed</p>
            <div className="flex w-full flex-col gap-8">
              {sections.map((section) => (
                <div key={section.id} className="flex w-full flex-col gap-2">
                  <p className="w-full text-base font-medium text-black">{section.title}</p>
                  <div className="grid w-full grid-cols-2 items-start gap-2">
                    {section.items.map((item) => {
                      const isCompleted = completedItemIds.has(item.id);
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => toggleItem(item.id)}
                          className={`flex h-12 w-full cursor-pointer items-center justify-center rounded border px-4 text-base font-medium whitespace-nowrap transition-colors ${
                            isCompleted
                              ? "border-accent-blue bg-accent-blue text-white"
                              : "border-divider bg-white text-black"
                          }`}
                        >
                          {item.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex w-full shrink-0 items-start justify-end gap-2 border-t border-card-border px-8 py-4">
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded border border-black px-3 py-2 text-base font-bold text-black"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="cursor-pointer rounded bg-accent-blue px-3 py-2 text-base font-bold text-white"
          >
            Update
          </button>
        </div>
      </div>
    </div>
  );
}
