import { today } from "./maintenanceCalc";

interface SampleVehicleTemplate {
  vin: string;
  name: string;
  modelYear: number;
}

// Hand-picked, plausible-format VINs — not looked up against the real NHTSA
// database. "View Sample" is meant to work instantly (and offline), so it
// skips the decode API entirely and uses these names directly instead of
// risking a made-up VIN returning a wrong or failed real decode.
const SAMPLE_VEHICLES: SampleVehicleTemplate[] = [
  { vin: "JTDACAAU5R3000001", name: "2024 Toyota Prius XLE", modelYear: 2024 },
  { vin: "1HGCM82633A004352", name: "2023 Honda Accord EX-L", modelYear: 2023 },
  { vin: "5YJ3E1EA7KF317000", name: "2019 Tesla Model 3 Long Range", modelYear: 2019 },
  { vin: "1FTFW1ET5DFC10312", name: "2021 Ford F-150 XLT", modelYear: 2021 },
  { vin: "4S4BSANC5N3123456", name: "2022 Subaru Outback Premium", modelYear: 2022 },
];

const AVG_MILES_PER_YEAR = 12000;

function randomInt(min: number, max: number): number {
  return Math.floor(min + Math.random() * (max - min + 1));
}

export interface SampleVehicle {
  vin: string;
  name: string;
  mileage: number;
  date: Date;
}

// Mileage scales with the model's age (a 2024 car won't show 90,000 miles;
// a 2019 one won't show 800) with some jitter so repeated clicks don't feel
// canned. Date is always "today" — this represents just having checked the
// odometer, matching how the manual-entry flow treats a fresh reading.
export function pickSampleVehicle(): SampleVehicle {
  const template = SAMPLE_VEHICLES[randomInt(0, SAMPLE_VEHICLES.length - 1)];
  const date = today();
  const ageYears = Math.max(0, date.getUTCFullYear() - template.modelYear);
  const expectedMileage = ageYears * AVG_MILES_PER_YEAR;
  const mileage = Math.max(500, expectedMileage + randomInt(-3000, 3000));

  return { vin: template.vin, name: template.name, mileage, date };
}
