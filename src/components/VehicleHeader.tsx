import type { Vehicle } from "../data/maintenance";

interface VehicleHeaderProps {
  vehicle: Vehicle;
  onUpdate?: () => void;
  onAddVin?: () => void;
}

export default function VehicleHeader({ vehicle, onUpdate, onAddVin }: VehicleHeaderProps) {
  return (
    <div className="flex flex-col gap-2 w-full">
      <div className="flex items-center gap-4 w-full">
        <div className="flex flex-1 items-center gap-4 min-w-0">
          <p className="text-base font-medium text-muted whitespace-nowrap">
            {vehicle.mileage.toLocaleString()} miles
          </p>
          <div className="size-1 rounded-full bg-muted shrink-0" />
          <p className="text-base font-medium text-muted whitespace-nowrap">
            Last recorded {vehicle.lastRecorded}
          </p>
        </div>
      </div>
      <p className="text-[48px] font-extrabold leading-normal text-black">
        {vehicle.name}
      </p>
      <div className="flex items-center justify-between w-full text-base font-bold whitespace-nowrap">
        <div className="flex items-center gap-2">
          {vehicle.vin && <p className="text-black">{vehicle.vin}</p>}
          <button
            type="button"
            onClick={onAddVin}
            className="cursor-pointer text-accent-blue"
          >
            {vehicle.vin ? "Update VIN" : "Add VIN"}
          </button>
        </div>
        <button
          type="button"
          onClick={onUpdate}
          className="cursor-pointer text-accent-blue"
        >
          Update Manually
        </button>
      </div>
    </div>
  );
}
