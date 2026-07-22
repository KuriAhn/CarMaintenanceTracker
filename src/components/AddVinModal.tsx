import { useEffect, useState } from "react";
import { decodeVin, isPlausibleVin } from "../lib/vinDecode";
import { dateToInputValue, formatMiles, inputValueToDate, today } from "../lib/maintenanceCalc";
import { pickSampleVehicle } from "../lib/sampleVehicle";
import xIcon from "../assets/x-icon.svg";

interface AddVinModalProps {
  initialVin?: string;
  initialMileage: number;
  initialDate: Date;
  onClose: () => void;
  onSubmit: (vin: string, decoded: { name: string; mileage: number; date: Date }, isSample?: boolean) => void;
}

export default function AddVinModal({
  initialVin,
  initialMileage,
  initialDate,
  onClose,
  onSubmit,
}: AddVinModalProps) {
  const [vin, setVin] = useState(initialVin ?? "");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [miles, setMiles] = useState(formatMiles(initialMileage));
  const [milesTouched, setMilesTouched] = useState(false);
  const [date, setDate] = useState(dateToInputValue(initialDate));

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  function handleMilesFocus() {
    if (!milesTouched) setMiles("");
  }

  function handleMilesBlur() {
    if (miles.trim() === "") {
      setMiles(formatMiles(initialMileage));
      setMilesTouched(false);
    }
  }

  async function handleSave() {
    const trimmed = vin.trim();
    if (!isPlausibleVin(trimmed)) {
      setStatus("error");
      setErrorMessage("Enter a valid 17-character VIN.");
      return;
    }

    setStatus("loading");
    const result = await decodeVin(trimmed);
    if (!result.ok) {
      setStatus("error");
      setErrorMessage(result.error);
      return;
    }

    const parsedMiles = Number(miles.replace(/[^0-9]/g, ""));
    const resolvedMiles = Number.isFinite(parsedMiles) && miles.trim() !== "" ? parsedMiles : initialMileage;
    const resolvedDate = date ? inputValueToDate(date) : today();

    onSubmit(trimmed.toUpperCase(), { name: result.name, mileage: resolvedMiles, date: resolvedDate });
  }

  // Skips the real decode entirely — the sample VINs aren't registered
  // vehicles, so hitting the live NHTSA API with one would just return an
  // error instead of the intended demo data.
  function handleViewSample() {
    const sample = pickSampleVehicle();
    setVin(sample.vin);
    setMiles(formatMiles(sample.mileage));
    setMilesTouched(true);
    setDate(dateToInputValue(sample.date));
    setStatus("idle");
    onSubmit(sample.vin, { name: sample.name, mileage: sample.mileage, date: sample.date }, true);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex cursor-pointer items-center justify-center bg-black/60"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="flex w-[400px] cursor-auto flex-col overflow-clip rounded-[10px] bg-white"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-vin-title"
      >
        <div className="flex w-full shrink-0 items-center gap-2 p-4">
          <p id="add-vin-title" className="flex-1 min-w-0 text-base font-bold text-black">
            Add VIN
          </p>
          <button type="button" onClick={onClose} className="size-5 shrink-0 cursor-pointer">
            <img src={xIcon} alt="Close" className="size-full" />
          </button>
        </div>

        <div className="flex w-full flex-col gap-4 p-4">
          <div className="flex w-full flex-col gap-2">
            <p className="w-full text-base font-bold text-black">Vin Number</p>
            <input
              type="text"
              value={vin}
              placeholder="VIN"
              onChange={(event) => {
                setVin(event.target.value);
                setStatus("idle");
              }}
              className="w-full rounded border border-divider px-3 py-2 text-base font-medium text-black placeholder:text-muted-2"
            />
            {status === "error" && <p className="w-full text-sm font-medium text-status-red-text">{errorMessage}</p>}
          </div>

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
        </div>

        <div className="flex w-full shrink-0 items-center justify-between gap-2 p-4">
          <button
            type="button"
            onClick={handleViewSample}
            className="cursor-pointer text-base font-bold text-accent-blue"
          >
            View Sample
          </button>
          <div className="flex shrink-0 items-start gap-2">
            <button
              type="button"
              onClick={onClose}
              className="cursor-pointer rounded border border-black px-3 py-2 text-base font-bold text-black"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={status === "loading"}
              className="cursor-pointer rounded bg-accent-blue px-3 py-2 text-base font-bold text-white disabled:opacity-60"
            >
              {status === "loading" ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
