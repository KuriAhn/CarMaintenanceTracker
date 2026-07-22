export type HotspotZoneId = "engine" | "battery" | "wheel-front" | "wipers" | "default";
export type CarPartKey = "engine" | "battery" | "wheelFront" | "wipers";

export interface HotspotZone {
  id: HotspotZoneId;
  cameraAzimuthDeg: number;
  cameraElevationDeg: number;
  cameraDistance: number;
  targetPartKey: CarPartKey | null;
}

// Orbit-camera parameters per zone. The car's nose faces +X; azimuth 0 is a
// side-profile view, positive azimuth sweeps toward a front-3/4 angle.
// `targetPartKey` selects which CarModel part gets the highlight outline and
// look-at center (null only for "default", the wide whole-car view).
export const HOTSPOT_ZONES: Record<HotspotZoneId, HotspotZone> = {
  default: { id: "default", cameraAzimuthDeg: 35, cameraElevationDeg: 20, cameraDistance: 10, targetPartKey: null },
  engine: { id: "engine", cameraAzimuthDeg: 55, cameraElevationDeg: 30, cameraDistance: 6, targetPartKey: "engine" },
  battery: { id: "battery", cameraAzimuthDeg: 60, cameraElevationDeg: 28, cameraDistance: 5.5, targetPartKey: "battery" },
  "wheel-front": { id: "wheel-front", cameraAzimuthDeg: 35, cameraElevationDeg: 25, cameraDistance: 5.5, targetPartKey: "wheelFront" },
  wipers: { id: "wipers", cameraAzimuthDeg: 40, cameraElevationDeg: 38, cameraDistance: 5.5, targetPartKey: "wipers" },
};

// Every maintenance item id maps to the zone showing its physical location.
// Items with no physical location (admin/paperwork) map to "default".
export const ITEM_ZONE_MAP: Record<string, HotspotZoneId> = {
  "ef-oil-synthetic": "engine",
  "ef-engine-air-filter": "engine",
  "ef-coolant-flush": "engine",
  "ef-brake-fluid-flush": "engine",
  "ef-transmission-fluid": "engine",
  "ef-power-steering-fluid": "engine",
  "bf-serpentine-belt": "engine",
  "bf-timing-belt": "engine",
  "bf-fuel-filter": "engine",
  "im-spark-plugs": "engine",

  "be-battery-test": "battery",
  "be-battery-terminals": "battery",

  // Cabin air intake sits at the windshield base — approximated on the
  // windshield/cowl hotspot rather than a separate interior model.
  "ef-cabin-air-filter": "wipers",
  "be-wiper-blades": "wipers",

  "tb-tire-rotation": "wheel-front",
  "tb-tire-pressure-check": "wheel-front",
  "tb-wheel-alignment": "wheel-front",
  "tb-brake-pad-inspection": "wheel-front",
  "tb-brake-pad-replacement": "wheel-front",

  "im-emissions-inspection": "default",
  "im-registration-renewal": "default",
};

export function resolveHotspotZone(itemId?: string): HotspotZone {
  const zoneId = (itemId && ITEM_ZONE_MAP[itemId]) || "default";
  return HOTSPOT_ZONES[zoneId];
}
