import * as THREE from "three";
import { LineSegmentsGeometry } from "three/examples/jsm/lines/LineSegmentsGeometry.js";
import { LineSegments2 } from "three/examples/jsm/lines/LineSegments2.js";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial.js";

export type CarPartKey = "engine" | "battery" | "wheelFront" | "wipers";

export interface CarModel {
  car: THREE.Group;
  parts: Record<CarPartKey, THREE.Object3D>;
}

const EDGE_COLOR = 0x1a1a1a;
const EDGE_WIDTH = 2.5; // pixels (screen-space, LineMaterial worldUnits: false)

// Every part uses this exact white — an *unlit* MeshBasicMaterial, not a
// lit material. A lit material (MeshLambertMaterial etc.) shades faces
// based on their angle to the scene's lights, so even a pure-white
// material renders many faces as visibly gray — that was the earlier
// "why is it gray" bug. MeshBasicMaterial ignores lighting entirely and
// always renders the exact color given, so every face reads as true white.
export const BODY_COLOR = 0xffffff;

// The single accent color used for "this part is selected" (paintPart, driven from
// threeScene.ts) — the ONLY place color appears anywhere on the car. Every other
// surface stays BODY_COLOR so blue always means one specific thing.
export const ACCENT_COLOR = 0x1059e0;

// Shared across every body edge so they all render with identical width/color —
// LineSegments2 self-updates this material's `resolution` every frame via its
// onBeforeRender hook, so no manual resize wiring is needed here.
// polygonOffset pulls the edge lines a hair toward the camera: their geometry
// sits exactly on the mesh surface it traces (zero gap), which z-fights with
// that surface — invisible on a static frame at most angles/distances (same
// winner every pixel) but flickers/dashes where the margin is marginal (a
// line loses the z-fight for part of its length and the white surface shows
// through, reading as the outline "turning white" or, in a static frame,
// as a dashed/broken line). Doubled twice now (-1/-4 -> -2/-8 -> -4/-16):
// the first doubling covered ordinary free-rotation at the default zoom: the
// second was needed after finding a still-dashed edge at a hotspot zone's
// close camera distance (~5.5, vs the default view's 10) and a moderate
// (non-grazing) viewing angle — polygonOffset's factor term scales with a
// triangle's screen-space depth slope, which is small for a roughly camera-
// facing triangle, so at closer zoom the mostly-constant `units` term needs
// to be bigger in absolute terms to keep covering the same world-space gap.
export const edgeMaterial = new LineMaterial({
  color: EDGE_COLOR,
  linewidth: EDGE_WIDTH,
  worldUnits: false,
  polygonOffset: true,
  polygonOffsetFactor: -4,
  polygonOffsetUnits: -16,
});

// Complements edgeMaterial's own polygonOffset (which pulls the outline lines
// toward the camera) by pushing real fill surfaces slightly away from it —
// a bigger combined gap between coincident geometry from both sides, instead
// of relying on the line's offset alone to fully resolve the z-fight. Only
// spread into materials for real (depth-tested) body geometry — buildDecal/
// buildHeadlight already use depthTest:false, where polygonOffset is a no-op.
const FILL_POLYGON_OFFSET = {
  polygonOffset: true,
  polygonOffsetFactor: 2,
  polygonOffsetUnits: 8,
} as const;

// Car faces +X (nose/front) / -X (tail/rear). Width along Z, height along Y,
// ground at y=0.
const WHEEL_RADIUS = 0.5;
const WHEEL_THICKNESS = 0.32;
const WHEEL_X = 1.3;
const WHEEL_Z = 1.02;

const CHASSIS_LENGTH = 4.4; // was 4.2 — the extra length buys room for a bigger bevel + sloped nose/tail without crowding the wheel arches
const CHASSIS_WIDTH = 1.9;
const CHASSIS_BOTTOM_Y = 0.45;
const CHASSIS_TOP_Y = 1.25;

// How far back the nose/tail lean in from bottom to top, instead of a flat
// vertical bumper face — the single biggest lever for "less boxy": a sheer
// vertical front/rear face reads as a slab no matter how rounded its edges
// are. Kept comfortably under CHASSIS_LENGTH/2 - (WHEEL_X + ARCH_HALF_X)
// (0.35) so the slope's top edge stays ahead of the wheel-arch's outer wall
// — no risk of the profile folding back on itself near the arch corner.
const NOSE_SLOPE = 0.25;
const TAIL_SLOPE = 0.3; // slightly longer, echoing the cabin's own fastback asymmetry

// The cabin is a separate mesh from the welded body, so it always draws its
// own full outline. Sitting it exactly flush on the shell (bottom ==
// CHASSIS_TOP_Y) exposed that whole outline, including its own bevel, as a
// visible seam ring where the cabin meets the roof. Sinking it down by more
// than its own bevel (CABIN_BEVEL) buries that curved base inside the
// opaque shell — it's simply occluded by the surrounding solid, not merged
// — so only the cabin's raked glass walls and roof poke up above the
// roofline and get an edge line, matching how a real cabin-to-body panel
// line reads instead of a hard rectangle stamped on top.
const CABIN_EMBED = 0.1;

// Cabin footprint (front/rear X) is unchanged from the old plain-box cabin —
// same centerline ((CABIN_REAR_X + CABIN_FRONT_X) / 2 == -0.15 as before).
// The shape itself is now a raked wedge instead of a rectangle: a sloped
// windshield, a flat roof, and a longer sloped rear glass/decklid line — the
// fastback-ish silhouette common to real "futuristic EV sedans."
const CABIN_REAR_X = -1.15;
const CABIN_FRONT_X = 0.85;
const CABIN_HEIGHT = 0.6; // was 0.4 — taller greenhouse, requested after the previous sleeker-roofline pass went too low
const CABIN_BOTTOM_Y = CHASSIS_TOP_Y - CABIN_EMBED;
const CABIN_ROOF_Y = CABIN_BOTTOM_Y + CABIN_HEIGHT;
const WINDSHIELD_RAKE = 0.4; // horizontal run of the sloped windshield
const REAR_RAKE = 0.55; // longer than the windshield rake = fastback slope
const CABIN_WIDTH = 1.6;
const CABIN_BEVEL = 0.05;

// Wheel-arch cutout: at radius 0.5 each wheel's top (y=1.0) reaches well
// past the chassis underside (0.45) — rather than embedding the wheel in
// solid body (which hid its top half, see git history) or lifting the whole
// chassis clear of it (which read as an oversized-clearance SUV stance and
// still needed re-tuning every zoom), the lower body is now built in pieces
// that leave an actual gap open around each wheel. Only a thin upper
// "fender" shell continues over the top of the arch; the full-height/width
// body resumes in the overhang (nose/tail) and the mid rocker between the
// two axles.
const ARCH_MARGIN = 0.05;
const ARCH_HALF_X = WHEEL_RADIUS + ARCH_MARGIN; // 0.55 — half-width of each open notch, centered on a wheel
const ARCH_INNER_X = WHEEL_X - ARCH_HALF_X; // 0.75 — half-length of the solid mid rocker between the wheels
const NOTCH_TOP_Y = WHEEL_RADIUS * 2 + ARCH_MARGIN; // 1.05 — where the open notch ends and the upper shell begins
// Corner-softening radius for the whole extruded body. Capped by the shortest edge
// in the profile — the front/rear overhang bottoms, CHASSIS_LENGTH / 2 - (WHEEL_X +
// ARCH_HALF_X) = 0.35 long — a bevel any bigger than half that (0.175) risks the
// insets from each end of that short edge overlapping. 0.15 leaves margin.
const BODY_BEVEL = 0.15;

// Tried raising this to a smooth many-segment round: a 90deg corner split
// into enough segments puts each facet-to-facet angle under EdgesGeometry's
// threshold, so no lines show on the curve at all — genuinely smooth, not a
// faceted chamfer. It corrupted the *entire* body's triangulation instead,
// at every bevel size tried down to 0.05, not just a local glitch near the
// wheel arches. The wheel-arch notch corners are reflex (concave), and
// ExtrudeGeometry's bevel is a simple per-vertex miter offset, not a robust
// straight-skeleton one — at a reflex corner that miter can overshoot by far
// more than the nominal bevel size, and once it crosses the outline earcut's
// triangulation breaks for the whole shape, not just that corner. Staying at
// 1 segment (a single offset, nothing to compound) is the proven-safe choice
// here. (The cabin has no reflex corners, so it never had this specific
// problem — but many-segment bevels there hit a different issue instead; see
// CABIN_BEVEL_SEGMENTS below.)
const BODY_BEVEL_SEGMENTS = 1;

// Tried a second approach — rounding the body profile's 8 convex corners
// directly in the 2D shape via quadraticCurveTo, sidestepping the reflex-
// corner bevel limitation above entirely (only ever touching corners known
// safe by construction, leaving the 4 reflex wheel-arch corners as sharp
// lineTo joins). The resulting geometry itself was verified sound — no
// self-intersection, no NaNs, correct triangulation, and it visually
// rendered fine across a wide orbit sweep. But it introduced a new, real,
// narrow-but-reproducible bug: at specific extreme near-top-down/near-
// bottom-up camera angles (reachable via normal free rotation), large
// stretches of the body's outline vanished — confirmed via wireframe (mesh
// itself intact) and a double-sided colored-fill test (fill intact, only
// the LineSegments2 edge lines failed to draw). Root cause: three.js's
// "fat lines" (LineSegments2) renderer computes each line's screen-space
// width from its projected on-screen direction; the extra edges/vertices
// this rounding approach added made it far more likely for a cluster of
// (mostly parallel, roof/sill-aligned) edges to simultaneously hit a
// viewing angle where their projected direction degenerates near zero-
// length, which the width shader can't handle. The original chamfered
// body (below) has too few/differently-positioned edges to hit this in
// practice. Reverted rather than chasing a robust fix for a three.js-level
// fat-line limitation — see git history for the rounded-corner version if
// revisiting this.

// Cabin's wedge has 4 purely convex corners (no reflex/concave points like the
// body's wheel arches), so the earcut-corruption risk that keeps
// BODY_BEVEL_SEGMENTS at 1 never applied here — a many-segment smooth round
// (each ~90deg-or-less corner split 12 ways, putting every facet-to-facet
// angle under EdgesGeometry's threshold) was used for a while. But it turned
// out to hit the *other* documented bevel-segment problem instead: the same
// fat-line (LineSegments2) screen-space-width degeneracy that broke the
// body's rounded corners (see BODY_BEVEL_SEGMENTS above) — visible here as
// the flat roof edge rendering noticeably thinner than the rest of the car
// even at the default camera angle, not just an extreme one. Reverted to a
// plain single-facet chamfer, matching the body's proven-safe choice.
const CABIN_BEVEL_SEGMENTS = 1;

function addEdges(mesh: THREE.Mesh, thresholdAngle = 15): void {
  const edges = new THREE.EdgesGeometry(mesh.geometry, thresholdAngle);
  const lineGeometry = new LineSegmentsGeometry().fromEdgesGeometry(edges);
  const lines = new LineSegments2(lineGeometry, edgeMaterial);
  mesh.add(lines);
}

// The body used to be 4 separate boxes (upper shell + mid rocker + 2
// overhangs) merged after the fact via BufferGeometryUtils, on the theory
// that EdgesGeometry would drop the coplanar seams between them. That was
// structurally broken, not just unreliable: EdgesGeometry always draws a
// "boundary" edge (one that belongs to only a single triangle), no angle
// check involved. The upper shell's bottom face was one quad spanning the
// full car length (vertices only at the very ends); the narrower rocker/
// overhang pieces touching it had their own perimeter vertices in the
// *interior* of that face, with nothing there to weld against — a classic
// T-junction. Their touching-face edges could never become non-boundary, so
// they were guaranteed to render, always, as a visible seam (plus a genuine
// z-fighting problem from the two coincident, opposite-facing face sets).
// It only looked fixed in fixed-angle screenshots because self-occlusion
// and z-fight resolution are angle-dependent.
//
// The actual fix is to never construct separate pieces that need
// reconciling: build the body as one 2D side-profile Shape — including the
// wheel-arch notches as literal concave indentations cut into the outline
// itself — and extrude it. ExtrudeGeometry's own earcut triangulation
// shares real vertices at every internal boundary by construction, so no
// T-junction is possible and EdgesGeometry has nothing ambiguous to decide.
function buildBodyGeometry(): THREE.BufferGeometry {
  const REAR_X = -CHASSIS_LENGTH / 2;
  const FRONT_X = CHASSIS_LENGTH / 2;

  const shape = new THREE.Shape();
  shape.moveTo(REAR_X, CHASSIS_BOTTOM_Y);
  shape.lineTo(-WHEEL_X - ARCH_HALF_X, CHASSIS_BOTTOM_Y);
  shape.lineTo(-WHEEL_X - ARCH_HALF_X, NOTCH_TOP_Y);
  shape.lineTo(-ARCH_INNER_X, NOTCH_TOP_Y);
  shape.lineTo(-ARCH_INNER_X, CHASSIS_BOTTOM_Y);
  shape.lineTo(ARCH_INNER_X, CHASSIS_BOTTOM_Y);
  shape.lineTo(ARCH_INNER_X, NOTCH_TOP_Y);
  shape.lineTo(WHEEL_X + ARCH_HALF_X, NOTCH_TOP_Y);
  shape.lineTo(WHEEL_X + ARCH_HALF_X, CHASSIS_BOTTOM_Y);
  shape.lineTo(FRONT_X, CHASSIS_BOTTOM_Y);
  shape.lineTo(FRONT_X - NOSE_SLOPE, CHASSIS_TOP_Y);
  shape.lineTo(REAR_X + TAIL_SLOPE, CHASSIS_TOP_Y);
  shape.closePath(); // draws the sloped tail face back down to the start point

  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: CHASSIS_WIDTH,
    bevelEnabled: true,
    bevelThickness: BODY_BEVEL,
    bevelSize: BODY_BEVEL,
    bevelSegments: BODY_BEVEL_SEGMENTS,
    steps: 1,
  });
  geometry.translate(0, 0, -CHASSIS_WIDTH / 2); // center on Z, matching wheel/decal positioning
  return geometry;
}

// Same Shape+ExtrudeGeometry technique as buildBodyGeometry, sized down for the
// cabin: a 4-point trapezoid (rear glass up to the roof, flat roof, windshield back
// down) instead of a rectangle. REAR_RAKE + WINDSHIELD_RAKE (0.95) is comfortably
// less than the full cabin length (CABIN_FRONT_X - CABIN_REAR_X == 2), leaving a
// valid ~1.05-long flat roof segment — a simple, non-self-intersecting wedge.
function buildCabinGeometry(): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(CABIN_REAR_X, CABIN_BOTTOM_Y);
  shape.lineTo(CABIN_REAR_X + REAR_RAKE, CABIN_ROOF_Y);
  shape.lineTo(CABIN_FRONT_X - WINDSHIELD_RAKE, CABIN_ROOF_Y);
  shape.lineTo(CABIN_FRONT_X, CABIN_BOTTOM_Y);
  shape.closePath();

  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: CABIN_WIDTH,
    bevelEnabled: true,
    bevelThickness: CABIN_BEVEL,
    bevelSize: CABIN_BEVEL,
    bevelSegments: CABIN_BEVEL_SEGMENTS,
    steps: 1,
  });
  geometry.translate(0, 0, -CABIN_WIDTH / 2);
  return geometry;
}

function buildWheel(z: number): THREE.Mesh {
  const geometry = new THREE.CylinderGeometry(WHEEL_RADIUS, WHEEL_RADIUS, WHEEL_THICKNESS, 14);
  const mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ color: BODY_COLOR, ...FILL_POLYGON_OFFSET }));
  mesh.rotation.x = Math.PI / 2;
  mesh.position.set(0, WHEEL_RADIUS, z);
  addEdges(mesh, 20);

  const hubGeometry = new THREE.CylinderGeometry(WHEEL_RADIUS * 0.45, WHEEL_RADIUS * 0.45, WHEEL_THICKNESS + 0.02, 10);
  const hub = new THREE.Mesh(hubGeometry, new THREE.MeshBasicMaterial({ color: BODY_COLOR, ...FILL_POLYGON_OFFSET }));
  addEdges(hub, 20);
  mesh.add(hub);

  return mesh;
}

// Lifts a flush decal/marker a hair off the surface it sits against, in place
// of the depthTest:false + renderOrder trick this used to rely on. That trick
// avoided the local z-fight against the coincident chassis surface directly
// beneath a decal, but at the cost of a worse bug: with depth testing off
// entirely, the decal drew *unconditionally* every frame — including when the
// rest of the opaque car body should have been occluding it from other
// viewing angles (reported as "I can see the headlights through the car").
// A real (if tiny) position offset lets normal depth testing do both jobs at
// once: it's plenty to win the local z-fight against the surface right below
// it (0.01 world units is far above the depth-buffer precision floor at this
// scene's scale/distances), while still correctly losing the depth test
// against genuine occluders like the opposite side of the car body.
const DECAL_OFFSET = 0.01;

// The paintable region for a zone that has no distinct geometry of its own
// (engine bay / battery / cowl on a car with no opening hood): a flat patch
// painted directly onto the chassis surface, not a raised panel. White and
// borderless by default so it blends invisibly into the chassis; paintPart()
// recolors it when selected.
function buildDecal(width: number, depth: number, x: number, z: number): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, depth), new THREE.MeshBasicMaterial({ color: BODY_COLOR }));
  mesh.rotation.x = -Math.PI / 2; // lie flat, facing up
  mesh.position.set(x, CHASSIS_TOP_Y + DECAL_OFFSET, z);
  return mesh;
}

const HEADLIGHT_RADIUS = 0.2;
const HEADLIGHT_Y = CHASSIS_BOTTOM_Y + 0.25; // low on the nose, close to where the slope has moved least off FRONT_X
const HEADLIGHT_Z = 0.55; // within CHASSIS_WIDTH/2 (0.95), clear of the corner bevel

// A plain geometric marker, not a colored light — "nothing colored unless
// selected" rules out an actually-lit-looking accent color, so front/back is
// conveyed by shape alone: two circular outlines on the nose only, matching
// the rest of the car's white-fill/black-line look. Uses the same DECAL_OFFSET
// real-separation trick as buildDecal (see its comment) so it doesn't z-fight
// with the sloped nose surface it sits against, but IS still correctly
// occluded by the rest of the body from other angles — unlike a paint decal,
// this also calls addEdges so the circle's outline is always visible, not
// just when painted. CircleGeometry's outer rim edges are pure mesh boundary
// (each belongs to exactly one triangle), so EdgesGeometry always draws them
// regardless of threshold — with enough segments that reads as a smooth
// circle, same reasoning as the wheel rims.
function buildHeadlight(z: number): THREE.Mesh {
  // The nose is sloped (NOSE_SLOPE over CHASSIS_TOP_Y - CHASSIS_BOTTOM_Y of
  // height), so "flush at this height" isn't simply x=FRONT_X — interpolate
  // along the same slope the body profile uses.
  const slopeFraction = (HEADLIGHT_Y - CHASSIS_BOTTOM_Y) / (CHASSIS_TOP_Y - CHASSIS_BOTTOM_Y);
  const x = CHASSIS_LENGTH / 2 - NOSE_SLOPE * slopeFraction;

  const mesh = new THREE.Mesh(new THREE.CircleGeometry(HEADLIGHT_RADIUS, 24), new THREE.MeshBasicMaterial({ color: BODY_COLOR }));
  mesh.rotation.y = Math.PI / 2; // face +X, outward on the nose
  mesh.position.set(x + DECAL_OFFSET, HEADLIGHT_Y, z); // offset along the nose-outward normal (+X)
  addEdges(mesh, 20);
  return mesh;
}

// Recolors every paintable mesh within a part (skipping the black edge
// lines, which always stay their own color regardless of selection state).
export function paintPart(part: THREE.Object3D, color: THREE.ColorRepresentation): void {
  part.traverse((child) => {
    if (child instanceof THREE.Mesh && !(child instanceof LineSegments2)) {
      (child.material as THREE.MeshBasicMaterial).color.set(color);
    }
  });
}

export function buildCarModel(): CarModel {
  const car = new THREE.Group();

  // One welded mesh for the whole lower body + upper shell (see
  // buildBodyGeometry) — reads as a single cohesive shape with the wheel
  // arches cut into it, not a stack of separate blocks.
  const body = new THREE.Mesh(buildBodyGeometry(), new THREE.MeshBasicMaterial({ color: BODY_COLOR, ...FILL_POLYGON_OFFSET }));
  addEdges(body, 12);
  car.add(body);

  const cabin = new THREE.Mesh(buildCabinGeometry(), new THREE.MeshBasicMaterial({ color: BODY_COLOR, ...FILL_POLYGON_OFFSET }));
  addEdges(cabin, 12);
  car.add(cabin);

  car.add(buildHeadlight(HEADLIGHT_Z));
  car.add(buildHeadlight(-HEADLIGHT_Z));

  const rearLeft = buildWheel(-WHEEL_Z);
  rearLeft.position.x = -WHEEL_X;
  const rearRight = buildWheel(WHEEL_Z);
  rearRight.position.x = -WHEEL_X;
  car.add(rearLeft, rearRight);

  // Front wheels are grouped so the "wheel-front" zone can target/paint
  // both of them together as a single part.
  const wheelFrontGroup = new THREE.Group();
  wheelFrontGroup.position.set(WHEEL_X, 0, 0);
  wheelFrontGroup.add(buildWheel(-WHEEL_Z), buildWheel(WHEEL_Z));
  car.add(wheelFrontGroup);

  const engine = buildDecal(0.6, 1.2, 1.7, 0);
  car.add(engine);

  // z=0.8/depth=0.3 (was z=0.55/depth=0.4) keeps this fully outside the
  // engine patch's z range (-0.6 to 0.6) — the two used to overlap by a
  // small corner. That was harmless when both were unpainted, but with
  // depthTest disabled (see buildDecal) painting one no longer defers to
  // actual depth in the overlap, so the other decal would flatly win there
  // regardless of which is "in front" — visible as a notch bitten out of
  // whichever patch got painted.
  const battery = buildDecal(0.35, 0.3, 1.5, 0.8);
  car.add(battery);

  const wipers = buildDecal(0.15, 1.5, 0.85, 0);
  car.add(wipers);

  return {
    car,
    parts: {
      engine,
      battery,
      wheelFront: wheelFrontGroup,
      wipers,
    },
  };
}
