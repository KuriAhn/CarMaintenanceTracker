import type { MaintenanceItem, Vehicle } from "../data/maintenance";

export type MaintenanceStatus = "green" | "yellow" | "red" | "never";

export interface StatusCounts {
  green: number;
  yellow: number;
  red: number;
  never: number;
}

export interface ComputedMaintenance {
  targetMileageLabel: string | null;
  targetDateLabel: string | null;
  remainingLabel: string;
  lastCompletedLabel: string;
  progress: number;
  status: MaintenanceStatus;
}

const MS_PER_DAY = 1000 * 60 * 60 * 24;

export function addMonths(date: Date, months: number): Date {
  const result = new Date(date.getTime());
  result.setUTCMonth(result.getUTCMonth() + months);
  return result;
}

function daysBetween(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / MS_PER_DAY);
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

function formatNumber(value: number): string {
  return Math.round(Math.abs(value)).toLocaleString("en-US");
}

export function formatMiles(value: number): string {
  return value.toLocaleString("en-US");
}

export function formatShortDate(date: Date): string {
  return `${date.getUTCMonth() + 1}/${date.getUTCDate()}/${String(date.getUTCFullYear()).slice(-2)}`;
}

export function dateToInputValue(date: Date): string {
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${date.getUTCFullYear()}-${month}-${day}`;
}

export function inputValueToDate(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

export function today(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
}

export function statusFromProgress(progress: number): MaintenanceStatus {
  if (progress >= 0.5) return "green";
  if (progress > 0.25) return "yellow";
  return "red";
}

export function computeMaintenance(item: MaintenanceItem, vehicle: Vehicle): ComputedMaintenance {
  const neverCompleted = item.lastCompletedMileage === 0;
  const lastCompletedLabel = neverCompleted
    ? "Last Completed: Never"
    : `Last Completed: ${formatNumber(item.lastCompletedMileage)} mi. on ${formatDate(
        item.lastCompletedDate
      )}`;

  const targetMileage =
    item.intervalMiles != null ? item.lastCompletedMileage + item.intervalMiles : null;
  const targetDate =
    item.intervalMonths != null ? addMonths(item.lastCompletedDate, item.intervalMonths) : null;

  const mileageRemaining = targetMileage != null ? targetMileage - vehicle.mileage : null;
  const daysRemaining = targetDate != null ? daysBetween(vehicle.currentDate, targetDate) : null;

  const mileageFraction =
    mileageRemaining != null && item.intervalMiles ? mileageRemaining / item.intervalMiles : null;
  const dateFraction =
    daysRemaining != null && targetDate != null && item.intervalMonths
      ? daysRemaining / daysBetween(item.lastCompletedDate, targetDate)
      : null;

  const fractions = [mileageFraction, dateFraction].filter(
    (fraction): fraction is number => fraction != null
  );
  const rawProgress = fractions.length ? Math.min(...fractions) : 1;
  const progress = neverCompleted ? 1 : rawProgress < 0 ? 0.02 : Math.min(rawProgress, 1);
  const status: MaintenanceStatus = neverCompleted ? "never" : statusFromProgress(progress);

  const mileageOverdue = mileageRemaining != null && mileageRemaining < 0;
  const dateOverdue = daysRemaining != null && daysRemaining < 0;

  const overdueBits: string[] = [];
  if (mileageOverdue) overdueBits.push(`${formatNumber(mileageRemaining!)} mi.`);
  if (dateOverdue) overdueBits.push(`${formatNumber(daysRemaining!)} days`);

  const remainingBits: string[] = [];
  if (mileageRemaining != null && !mileageOverdue) remainingBits.push(`${formatNumber(mileageRemaining)} mi.`);
  if (daysRemaining != null && !dateOverdue) remainingBits.push(`${formatNumber(daysRemaining)} days`);

  let remainingLabel: string;
  if (overdueBits.length) {
    remainingLabel = `Overdue by ${overdueBits.join(" / ")}`;
    if (remainingBits.length) remainingLabel += ` (${remainingBits.join(" / ")} remaining)`;
  } else {
    remainingLabel = `${remainingBits.join(" / ")} remaining`;
  }

  return {
    targetMileageLabel: targetMileage != null ? `${formatNumber(targetMileage)} mi.` : null,
    targetDateLabel: targetDate != null ? formatDate(targetDate) : null,
    remainingLabel,
    lastCompletedLabel,
    progress,
    status,
  };
}
