export type VinDecodeResult =
  | { ok: true; year: number; make: string; model: string; trim?: string; name: string }
  | { ok: false; error: string };

interface NhtsaResultRow {
  Variable: string;
  Value: string | null;
}

interface NhtsaResponse {
  Results: NhtsaResultRow[];
}

export function isPlausibleVin(vin: string): boolean {
  return /^[A-HJ-NPR-Z0-9]{17}$/i.test(vin.trim());
}

// NHTSA's Model and Trim fields sometimes overlap (e.g. model "Santa Fe Sport"
// + trim "Sport 2WD"). Strip a trim's leading word if it repeats the model's
// trailing word so the combined name doesn't read "Sport Sport".
function dedupeTrim(model: string, trim: string): string {
  const trimWords = trim.trim().split(/\s+/);
  const lastModelWord = model.trim().split(/\s+/).pop()?.toLowerCase();
  if (trimWords[0]?.toLowerCase() === lastModelWord) trimWords.shift();
  return trimWords.join(" ");
}

export async function decodeVin(vin: string): Promise<VinDecodeResult> {
  const trimmed = vin.trim().toUpperCase();

  let response: Response;
  try {
    response = await fetch(
      `https://vpic.nhtsa.dot.gov/api/vehicles/decodevin/${encodeURIComponent(trimmed)}?format=json`
    );
  } catch {
    return { ok: false, error: "Couldn't reach the VIN decode service. Check your connection and try again." };
  }

  if (!response.ok) {
    return { ok: false, error: "The VIN decode service returned an error. Please try again." };
  }

  const data = (await response.json()) as NhtsaResponse;
  const lookup = (variable: string) =>
    data.Results.find((row) => row.Variable === variable)?.Value?.trim() || "";

  const year = lookup("Model Year");
  const make = lookup("Make");
  const model = lookup("Model");
  const trim = lookup("Trim");
  const errorCode = lookup("Error Code");

  if (!year || !make || !model || (errorCode && errorCode !== "0")) {
    return { ok: false, error: "Couldn't decode that VIN. Double-check the number and try again." };
  }

  const dedupedTrim = trim ? dedupeTrim(model, trim) : "";
  const name = `${year} ${make} ${model}${dedupedTrim ? ` ${dedupedTrim}` : ""}`;

  return { ok: true, year: Number(year), make, model, trim: trim || undefined, name };
}
