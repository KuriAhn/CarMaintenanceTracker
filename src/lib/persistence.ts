import type { Difficulty, MaintenanceSectionData, Vehicle } from "../data/maintenance";

const STORAGE_KEY = "car-maintenance-tracker:v1";

interface PersistedItem {
  id: string;
  name: string;
  intervalMiles: number | null;
  intervalMonths: number | null;
  difficulty: Difficulty;
  lastCompletedMileage: number;
  lastCompletedDate: string;
}

interface PersistedSection {
  id: string;
  title: string;
  items: PersistedItem[];
}

interface PersistedState {
  vehicle: {
    name: string;
    vin?: string;
    mileage: number;
    lastRecorded: string;
    currentDate: string;
  };
  maintenanceSections: PersistedSection[];
}

export interface LoadedState {
  vehicle: Vehicle;
  maintenanceSections: MaintenanceSectionData[];
}

export function loadPersistedState(): LoadedState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedState;

    return {
      vehicle: { ...parsed.vehicle, currentDate: new Date(parsed.vehicle.currentDate) },
      maintenanceSections: parsed.maintenanceSections.map((section) => ({
        ...section,
        items: section.items.map((item) => ({
          ...item,
          lastCompletedDate: new Date(item.lastCompletedDate),
        })),
      })),
    };
  } catch {
    return null;
  }
}

export function savePersistedState(vehicle: Vehicle, maintenanceSections: MaintenanceSectionData[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ vehicle, maintenanceSections }));
  } catch {
    // localStorage unavailable (private browsing, quota exceeded, etc.) — the app still
    // works in-memory for this session, it just won't persist across visits.
  }
}
