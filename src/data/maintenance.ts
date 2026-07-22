import { addMonths, formatShortDate, today } from "../lib/maintenanceCalc";

export interface Vehicle {
  name: string;
  vin?: string;
  mileage: number;
  lastRecorded: string;
  currentDate: Date;
}

export interface FilterCategory {
  id: string;
  label: string;
  active?: boolean;
}

export type Difficulty = "EASY" | "MEDIUM" | "HARD";

export interface MaintenanceItem {
  id: string;
  name: string;
  intervalMiles: number | null;
  intervalMonths: number | null;
  difficulty: Difficulty;
  lastCompletedMileage: number;
  lastCompletedDate: Date;
  selected?: boolean;
}

export interface MaintenanceSectionData {
  id: string;
  title: string;
  items: MaintenanceItem[];
}

export const vehicle: Vehicle = {
  name: "",
  mileage: 0,
  lastRecorded: formatShortDate(today()),
  currentDate: today(),
};

export const filterCategories: FilterCategory[] = [
  { id: "all", label: "All", active: true },
  { id: "engine-fluids", label: "Engine & Fluids" },
  { id: "tires-brakes", label: "Tires & Brakes" },
  { id: "battery-electrical", label: "Battery & Electrical" },
  { id: "belts-filters", label: "Belts & Filters" },
  { id: "inspections-misc", label: "Inspections & Misc" },
];

type MaintenanceItemTemplate = Pick<MaintenanceItem, "id" | "name" | "intervalMiles" | "intervalMonths" | "difficulty">;

interface MaintenanceSectionTemplate {
  id: string;
  title: string;
  items: MaintenanceItemTemplate[];
}

// The fixed maintenance schedule this app tracks. Completion history is
// intentionally not part of the template — it starts blank ("never
// completed") for every vehicle and is regenerated fresh whenever a new
// VIN is added (see createBlankMaintenanceSections below), since a
// different vehicle's service history doesn't carry over.
const MAINTENANCE_SCHEDULE: MaintenanceSectionTemplate[] = [
  {
    id: "engine-fluids",
    title: "Engine & Fluids",
    items: [
      { id: "ef-oil-synthetic", name: "Oil change (synthetic)", intervalMiles: 7500, intervalMonths: 6, difficulty: "MEDIUM" },
      { id: "ef-engine-air-filter", name: "Engine air filter", intervalMiles: 15000, intervalMonths: 12, difficulty: "EASY" },
      { id: "ef-cabin-air-filter", name: "Cabin air filter", intervalMiles: 15000, intervalMonths: 12, difficulty: "EASY" },
      { id: "ef-coolant-flush", name: "Coolant flush", intervalMiles: 30000, intervalMonths: 60, difficulty: "HARD" },
      { id: "ef-brake-fluid-flush", name: "Brake fluid flush", intervalMiles: null, intervalMonths: 24, difficulty: "HARD" },
      { id: "ef-transmission-fluid", name: "Transmission fluid change", intervalMiles: 60000, intervalMonths: null, difficulty: "HARD" },
      { id: "ef-power-steering-fluid", name: "Power steering fluid", intervalMiles: 50000, intervalMonths: null, difficulty: "MEDIUM" },
    ],
  },
  {
    id: "tires-brakes",
    title: "Tires & Brakes",
    items: [
      { id: "tb-tire-rotation", name: "Tire rotation", intervalMiles: 7500, intervalMonths: null, difficulty: "MEDIUM" },
      { id: "tb-tire-pressure-check", name: "Tire pressure check", intervalMiles: null, intervalMonths: 1, difficulty: "EASY" },
      { id: "tb-wheel-alignment", name: "Wheel alignment", intervalMiles: null, intervalMonths: 12, difficulty: "HARD" },
      { id: "tb-brake-pad-inspection", name: "Brake pad inspection", intervalMiles: 12000, intervalMonths: null, difficulty: "MEDIUM" },
      { id: "tb-brake-pad-replacement", name: "Brake pad replacement", intervalMiles: 65000, intervalMonths: null, difficulty: "HARD" },
    ],
  },
  {
    id: "battery-electrical",
    title: "Battery & Electrical",
    items: [
      { id: "be-battery-test", name: "Battery test", intervalMiles: null, intervalMonths: 12, difficulty: "EASY" },
      { id: "be-battery-terminals", name: "Battery terminals clean/check", intervalMiles: null, intervalMonths: 6, difficulty: "EASY" },
      { id: "be-wiper-blades", name: "Wiper blades", intervalMiles: null, intervalMonths: 12, difficulty: "EASY" },
    ],
  },
  {
    id: "belts-filters",
    title: "Belts & Filters",
    items: [
      { id: "bf-serpentine-belt", name: "Serpentine/drive belt inspection", intervalMiles: 30000, intervalMonths: null, difficulty: "EASY" },
      { id: "bf-timing-belt", name: "Timing belt", intervalMiles: 100000, intervalMonths: null, difficulty: "HARD" },
      { id: "bf-fuel-filter", name: "Fuel filter", intervalMiles: 30000, intervalMonths: null, difficulty: "HARD" },
    ],
  },
  {
    id: "inspections-misc",
    title: "Inspections & Misc",
    items: [
      { id: "im-spark-plugs", name: "Spark plugs", intervalMiles: 100000, intervalMonths: null, difficulty: "MEDIUM" },
      { id: "im-emissions-inspection", name: "State emissions/safety inspection", intervalMiles: null, intervalMonths: 12, difficulty: "EASY" },
      { id: "im-registration-renewal", name: "Registration renewal", intervalMiles: null, intervalMonths: 12, difficulty: "EASY" },
    ],
  },
];

// Sentinel: lastCompletedMileage === 0 means "never completed" (see maintenanceCalc.ts).
export function createBlankMaintenanceSections(): MaintenanceSectionData[] {
  const baseline = today();
  return MAINTENANCE_SCHEDULE.map((section) => ({
    ...section,
    items: section.items.map((item) => ({
      ...item,
      lastCompletedMileage: 0,
      lastCompletedDate: baseline,
    })),
  }));
}

const AVG_MILES_PER_MONTH = 1000; // ~12k/year, used only to keep sample numbers proportional

function randomInt(min: number, max: number): number {
  return Math.floor(min + Math.random() * (max - min + 1));
}

// Used by the "View Sample" flow (AddVinModal) to fill a freshly-added demo
// vehicle with plausible history instead of leaving everything blank. Each
// item gets its own randomized "last completed" point somewhere within
// (up to 1.4x) its own interval — some items land recent, some overdue,
// some (long-interval items on a low-mileage sample car) naturally clamp to
// the "never completed" sentinel below — the same spread a real car's
// service history would show, rather than one identical baseline for every
// item. Mileage is derived from the same random time offset (at ~1,000
// mi/month) so it stays consistent with the completion date instead of
// being an independent, potentially-contradictory random number.
export function createSampleMaintenanceSections(
  vehicleMileage: number,
  currentDate: Date
): MaintenanceSectionData[] {
  return MAINTENANCE_SCHEDULE.map((section) => ({
    ...section,
    items: section.items.map((item) => {
      const intervalMonths =
        item.intervalMonths ?? Math.max(1, Math.round((item.intervalMiles ?? 12000) / AVG_MILES_PER_MONTH));
      const monthsAgo = randomInt(0, Math.round(intervalMonths * 1.4));
      const lastCompletedDate = addMonths(currentDate, -monthsAgo);
      const milesSince = Math.max(0, monthsAgo * AVG_MILES_PER_MONTH + randomInt(-300, 300));
      const lastCompletedMileage = Math.max(0, vehicleMileage - milesSince);

      return { ...item, lastCompletedMileage, lastCompletedDate };
    }),
  }));
}

export const maintenanceSections: MaintenanceSectionData[] = createBlankMaintenanceSections();
