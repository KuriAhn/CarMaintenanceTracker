interface EmptyVehicleStateProps {
  onAddVin?: () => void;
}

export default function EmptyVehicleState({ onAddVin }: EmptyVehicleStateProps) {
  return (
    <div className="flex w-full flex-1 flex-col items-center justify-center gap-4 text-center">
      <p className="text-2xl font-bold text-black">No vehicle added yet</p>
      <p className="text-base font-medium text-muted">
        Please add a VIN to track your maintenance.
      </p>
      <button
        type="button"
        onClick={onAddVin}
        className="mt-2 cursor-pointer rounded bg-accent-blue px-4 py-2 text-base font-bold text-white"
      >
        Add VIN
      </button>
    </div>
  );
}
