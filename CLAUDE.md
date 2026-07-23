# Car Maintenance Tracker — Project Rules

Living notes on conventions, preferences, and decisions for this project.
Updated continuously as work progresses — treat this as the source of truth
alongside the code itself.

## Stack
- React 19 + TypeScript + Vite 8
- Tailwind CSS v4 (via `@tailwindcss/vite`)
- Oxlint for linting (`npm run lint`)
- Playwright installed (for e2e/verification — see `scripts/verify.mjs`)
- Not yet a git repository

## Dev
- `npm run dev` — starts Vite at http://localhost:5173/
- `npm run build` — `tsc -b && vite build`
- `npm run verify` — runs `scripts/verify.mjs`

## Conventions observed
- Components live in `src/components/`, one per file, PascalCase.
- Data/mock content in `src/data/`, pure calc helpers in `src/lib/`.
- State is lifted to `App.tsx` and passed down via props (no external state
  library yet).
- Tailwind utility classes used directly in JSX; custom semantic tokens like
  `bg-page-bg`, `bg-divider` suggest a small custom theme extension.

## Features
- **VIN search** (added 2026-07-19): `VehicleHeader` has "Add VIN" /
  "Update VIN" + "Update Manually" links (replacing the old single filled
  "Update" button). "Add VIN" opens `AddVinModal` (small centered dialog,
  400px, per Figma frame 80), which decodes the VIN via the free NHTSA vPIC
  API (`src/lib/vinDecode.ts`, no API key/`.env` needed) and updates
  `vehicle.vin` + `vehicle.name`. "Update Manually" still opens the
  existing right-drawer `UpdateMaintenanceModal` — unchanged.
- Figma source of truth: https://www.figma.com/design/Gqyvjz5Wi6OIm1y1vNN5u4/Car-Maintenance-Tracking
  (frames 66 = baseline header, 80 = Add VIN dialog, 81 = post-save header).

## Features (cont'd)
- **Toast notifications** (added 2026-07-19): `src/components/Toast.tsx`,
  rendered from `App.tsx` (`toastMessage` state), fires on both the manual
  update and VIN update success paths. Fixed bottom-center pill, auto-
  dismisses after 3s. Fade/slide-in via a `toast-in` `@keyframes` in
  `index.css` (Tailwind arbitrary `animate-[toast-in_0.25s_ease-out_forwards]`
  — needs `forwards` in the shorthand or the toast snaps back to invisible
  after the animation ends).
- **VehicleHeader layout** (updated 2026-07-19): mileage + "Last recorded"
  line now renders *above* the make/model title (was below) — matches the
  Figma frames more closely and is the user's explicit preference.
- **Mileage never regresses** (added 2026-07-19): `App.tsx`'s
  `handleUpdateSubmit` only advances `vehicle.mileage`/`currentDate`/
  `lastRecorded` when the entered mileage is `>=` the vehicle's current
  mileage. This lets a user log a maintenance item at a mileage lower than
  the vehicle's current reading (e.g. back-logging a cabin air filter done
  at 22,700 mi when the car's now at 24,500) — the item's
  `lastCompletedMileage`/`lastCompletedDate` always take the entered
  values, but the vehicle-level "current" mileage/date only ever move
  forward. The manual update modal still has only one Miles/Date pair per
  submission — mixing a "today" reading with a backdated item in the same
  submission isn't supported; that'd need per-item mileage/date fields if
  ever requested.

## Features (cont'd, 2026-07-19)
- **Empty state / VIN-first onboarding**: `data/maintenance.ts`'s seed
  `vehicle` now starts blank (`name: ""`, no `vin`, `mileage: 0`) and every
  `maintenanceSections` item starts with `lastCompletedMileage: 0` (the
  existing "never completed" sentinel — see `maintenanceCalc.ts`). Item
  *definitions* (name/intervalMiles/intervalMonths) are unchanged; only the
  demo completion history was removed. `App.tsx` renders
  `EmptyVehicleState` (message + "Add VIN" CTA) for the whole left column
  whenever `!vehicle.vin`, instead of the header/filters/sections — a car's
  name can currently *only* be set via VIN decode (manual update never
  touches `vehicle.name`), so VIN is the mandatory first step and "Update
  Manually" isn't reachable until a VIN exists.
- **"Never completed" is a real status now**: `MaintenanceStatus` gained a
  4th variant `"never"` (`maintenanceCalc.ts`), used whenever
  `lastCompletedMileage === 0`. It forces `progress: 1` and a distinct gray
  fill instead of computing green/yellow/red from a fake baseline — so a
  freshly-added vehicle shows fully gray bars, not a colored progress guess.
  `StatusCounts`/`StatusLegend` got a matching 4th gray pill so the
  section-level counts stay consistent with the items shown. Color is
  `bg-progress-track` (#e6e6e6, the same light gray as the bar's own empty
  track) — tried `bg-muted-2` (#8d8f92) first, but that read as too dark/
  saturated; user asked to lighten it back.

## Features (cont'd, 2026-07-19 pt.4)
- **AddVinModal now also captures Miles + Date**, not just the VIN
  (`AddVinModal.tsx` props: `initialMileage`, `initialDate`; `onSubmit`
  now passes `{ name, mileage, date }`). Mirrors `UpdateMaintenanceModal`'s
  miles input UX exactly (clear-on-focus, restore-on-blur-if-empty, comma
  formatting via the now-shared `formatMiles` in `maintenanceCalc.ts`).
  This exists because adding a VIN alone never set mileage (VIN decode
  can't know odometer readings — see chat), which left the header stuck at
  "0 miles" until a separate manual update. Now one form does both.
- `App.tsx`'s `handleVinSubmit` applies the entered mileage/date with the
  same "same vehicle vs. new vehicle" split as the reset logic: if the VIN
  is unchanged, the entered mileage still only advances forward (same
  never-regress rule as `handleUpdateSubmit`); if the VIN is different
  (new vehicle), the entered mileage/date become the new baseline outright
  — there's no valid "old" reading to protect once you've switched cars.
- **No free/paid API can supply real maintenance item history from a VIN**
  — NHTSA vPIC only decodes identity attributes (year/make/model/trim)
  encoded in the VIN itself; there is no accessible record of what
  service has actually been done. Discussed and explicitly ruled out —
  don't attempt to "look up" maintenance completion data from a VIN.
- **localStorage persistence**: `src/lib/persistence.ts` (`loadPersistedState`/
  `savePersistedState`) round-trips `vehicle` + `maintenanceSections` through
  `localStorage` under key `car-maintenance-tracker:v1`, converting `Date`
  fields to/from ISO strings (plain JSON can't hold `Date`). `App.tsx` lazy-
  inits both state slices from storage (falling back to the blank seed data)
  and saves on every change via a `useEffect`. Deliberately *not* persisted:
  `activeFilter`/`selectedItemId` (pure UI state, fine to reset each visit).
  If storage is unavailable (private browsing, quota), save fails silently —
  app still works in-memory for that session.
- **Header text color**: mileage, the separator dot, and "Last recorded" in
  `VehicleHeader` use `text-muted`/`bg-muted` (#767676) rather than black —
  explicit user preference, distinguishes secondary metadata from the bold
  black vehicle name.

## Features (cont'd, 2026-07-19 pt.3)
- **VIN input placeholder** is the literal text "VIN" (`AddVinModal.tsx`) —
  not an example VIN string.
- **Changing the VIN resets maintenance history**: `data/maintenance.ts` was
  refactored — `MAINTENANCE_SCHEDULE` is now a private template (id/name/
  interval only, no completion state), and `createBlankMaintenanceSections()`
  generates a fresh "never completed" section list from it on demand.
  `App.tsx`'s `handleVinSubmit` compares the incoming VIN to `vehicle.vin`:
  if it's actually different, it calls `createBlankMaintenanceSections()` to
  reset every item's history, since a different VIN means a different
  physical vehicle and the old car's service history doesn't apply. Re-
  saving the *same* VIN (e.g. via "Update VIN" without changing it) leaves
  history untouched — verified both paths with Playwright against the
  persisted localStorage state directly (DOM text assertions were flaky
  here because of toast timing; reading `localStorage["car-maintenance-
  tracker:v1"]` after each step was the reliable check).
  `vehicle.mileage`/`currentDate` are deliberately *not* reset on a VIN
  change — mileage is independent, user-entered data that VIN decoding has
  never touched.

## Features (cont'd, 2026-07-20)
- **3D car illustration in `DetailPanel`** — went through two full
  iterations before landing here; don't re-propose either rejected one:
  1. First built as a **2D hand-drawn SVG** using `roughjs` (sketchy/
     scribbly lines, CSS `transform`/`transform-origin` pan-zoom-tilt to
     simulate a camera move). **Explicitly rejected by the user**
     ("no scribbling, use clean lines... change it to a 3d model").
  2. Rebuilt as **real three.js**, procedurally generated (no 3D asset
     exists or should be sourced/downloaded). This is the current,
     approved version. `roughjs` was fully removed; `three` + `@types/three`
     are the only added dependency (deliberately no `@react-three/fiber`/
     `drei` — one small imperative library driven via `useRef`/`useEffect`,
     matching this project's established pattern, not a framework wrapper).
- **File layout**: `src/lib/carModel.ts` (pure geometry — `buildCarModel()`
  returns `{ car: THREE.Group; parts: Record<CarPartKey, THREE.Object3D> }`,
  `CarPartKey = "engine" | "battery" | "wheelFront" | "wipers"`) is fully
  decoupled from `src/lib/threeScene.ts` (renderer/camera/render-loop/
  lifecycle — `createCarScene(canvas) -> { setTarget(zone), dispose() }`).
  `src/components/CarIllustration.tsx` is a thin wrapper: one mount-only
  effect creates the scene and returns `dispose`, a second effect keyed on
  `[zone]` calls `setTarget`. `src/data/carHotspots.ts` keeps the same
  21-item → 5-zone (`engine`/`battery`/`wheel-front`/`wipers`/`default`)
  mapping from the 2D version unchanged — only `HotspotZone`'s shape
  changed, to orbit-camera params: `cameraAzimuthDeg`/`cameraElevationDeg`/
  `cameraDistance`/`targetPartKey`.
- **"Clean lines" mechanism**: every mesh gets flat-shaded
  `MeshLambertMaterial` (`flatShading: true`) plus a
  `THREE.EdgesGeometry` child for crisp deterministic edges — this *is*
  the "clean lines, no scribbling" answer, deliberately the opposite of
  roughjs's jitter. Low-poly primitives only (boxes for chassis/cabin,
  faceted low-segment cylinders for wheels) — no textures, no shadows, no
  PBR. (2026-07-20: the edge *rendering* technique and body fill were
  revised again — see the dated section below; `EdgesGeometry` itself is
  still the right tool, just fed into a different line-rendering material.)
- **Geometry anchors for `engine`/`battery`/`wipers`** (no opening hood on
  this model, so these zones have no distinct geometry of their own):
  originally invisible (`.visible = false`) boxes, used only for
  `Box3.setFromObject()` sizing (which walks via plain `.traverse()`,
  not `.traverseVisible()`, so invisible meshes still count). **Superseded
  2026-07-20 pt.4**: they're now always-visible flush "decal" panels
  instead, since painting the selected part blue needs an actual visible
  surface to paint — see pt.4 below.
- **Outline mechanism** (superseded 2026-07-20, see below for current
  version): originally a `THREE.Box3Helper`, repositioned to
  `new THREE.Box3().setFromObject(parts[zone.targetPartKey]).expandByScalar(0.08)`
  on each `setTarget()`, hidden when `targetPartKey` is `null` (the
  `default` zone). Deliberately *not* `OutlinePass`/`EffectComposer` — a
  full post-processing pipeline was considered and rejected as
  unnecessary complexity for what a simple wireframe box achieves just as
  clearly. (That reasoning still holds — only the box's own line-rendering
  swapped out, not the overall approach.)
- **Camera orbit tuning — the main iteration cost.** Distances/angles
  can't be guessed correctly from geometry coordinates alone; they need
  visual iteration. Concretely: initial per-zone distances (2.6–3.2) were
  copied at roughly the same scale as the whole-car default view's
  distance (10) without accounting for the car's actual size (~4.2 units
  long) — this put close-up cameras *inside* the chassis geometry.
  Fixed by scaling close-up distances to 5–6 (still much closer than the
  default's 10, but clearing the body). Separately, `wheel-front` needed a
  fundamentally different **azimuth**, not just a smaller distance: three.js
  `Spherical`'s `theta` is measured from `+Z` toward `+X`, so low azimuth
  (~0–35°) gives a side-on view and high azimuth (~55–70°, used for
  engine/battery/wipers, which sit *within* the car's silhouette and want
  a front-3/4 framing) gives a nose-on 3/4 view. The wheel pokes outward
  in Z past the chassis, so it needed the *low*-azimuth side-on family
  (settled on azimuth 35°, elevation 25°, distance 5.5) to clear the body
  — reusing the engine/battery angle family kept clipping through the
  chassis corner. If new zones are added, expect to iterate distance
  *and* azimuth family together, verified visually (Playwright screenshot
  loop), not computed once and trusted.
- **Lifecycle correctness differs from the old roughjs pattern.** roughjs
  used a `hasDrawnRef`-guarded "only run once, ignore Strict Mode's second
  mount" effect. That guard is **wrong** for a WebGL context — it risks
  leaking the first render's GPU context. The three.js version instead
  lets the mount effect create-and-return-`dispose` normally, trusting
  React 19 Strict Mode's real create→dispose→recreate double-invoke in
  dev (cheap here since everything is procedural, no asset to reload).
  Verified via `document.querySelectorAll('canvas').length === 1` staying
  true across mount and rapid re-selection.
- Reduced motion (`prefers-reduced-motion: reduce`) is handled inside
  `threeScene.ts` via `matchMedia` (checked at setup + a `change`
  listener) — when active, `setTarget()` snaps the camera's current
  spherical coords straight to the target instead of lerping over
  subsequent `requestAnimationFrame`s. This replaced the old CSS
  `@media (prefers-reduced-motion: reduce)` block, which no longer has
  anything to target once the illustration is a `<canvas>` — that block
  and the `.car-stage`/`hotspot-pop` CSS were all removed from
  `index.css`.
- **Gotcha for local dev**: swapping a dependency (`roughjs` → `three`)
  while the Vite dev server is still running from before the swap causes
  a `504 Outdated Optimize Dep` error (stale `node_modules/.vite` cache) —
  looks like a broken app (blank page) but isn't a code bug. Fix: stop the
  dev server, `rm -rf node_modules/.vite`, restart.

## Features (cont'd, 2026-07-20 pt.2) — car model styling: no fill, bold outline, rounded corners
- **No new dependency needed** for either ask — three's bundled
  `examples/jsm` (already ships inside the installed `three` package, no
  package.json change) has both pieces: `lines/{LineSegmentsGeometry,
  LineSegments2, LineMaterial}.js` (real adjustable-width lines) and
  `geometries/RoundedBoxGeometry.js`. `@types/three` has matching `.d.ts`
  files at the same paths, confirmed before use.
- **Why body edges needed a material swap, not just a bigger number**:
  `THREE.LineBasicMaterial.linewidth` is capped at 1px on most platforms
  (Chrome/ANGLE on Windows and macOS both ignore it — a WebGL/GL-core-
  profile limitation, not a three.js bug). Bumping that property silently
  does nothing. `LineMaterial` (screen-space width via a `resolution`
  uniform) is the real fix. `LineSegments2.onBeforeRender` auto-updates
  its own material's `resolution` every frame as long as it's actually
  rendered — **no manual resize wiring needed**, unlike what was assumed
  going in.
- **Shared `edgeMaterial` is a page-lifetime singleton, deliberately never
  disposed.** `carModel.ts` exports one `LineMaterial` instance reused by
  every body part's edges (color/width are identical everywhere, so
  there's no reason for one per mesh). This created a real trap:
  `threeScene.ts`'s `dispose()` used to walk the scene disposing every
  child's material — doing that to a *shared* material would leave any
  subsequent scene (React Strict Mode's dev double-invoke recreates the
  scene right after disposing the first one) rendering with an
  already-disposed material. Fixed by skipping material disposal
  specifically for `LineSegments2` children in `disposeObject3D` (their
  geometry is still per-instance and still gets disposed) — only
  non-shared `Mesh` materials (chassis/cabin/wheel/hub, each a fresh
  `MeshLambertMaterial` instance) get disposed per scene teardown. The
  highlight/selection outline's `LineMaterial`, by contrast, *is* created
  fresh per `createCarScene()` call (scene-instance-specific, not shared
  across scenes) and *is* safe to fully dispose in that scene's own
  `dispose()`.
- **`RoundedBoxGeometry` threshold-angle gotcha — got the direction backwards
  on the first attempt.** Initial instinct: use a *higher* `EdgesGeometry`
  threshold angle (35°) to "hide the noisy bevel-seam lines and keep only
  the major edges." Wrong, and the result was a fully blank car with zero
  visible edges — because rounding a box's corner **removes the sharp
  edge entirely**; there's no single ~90° transition left to be the
  "major edge." The entire former corner becomes a chain of small-angle
  bevel facets (with `segments: 3`, each step is roughly 20–30°), and
  *those small facet boundaries are the only edges that exist there* — a
  high threshold filters out literally all of them, including what used
  to be the visible panel boundaries. Fix: use a **lower** threshold (12°,
  down from the sharp-box default of 15°) so the bevel's own facet edges
  render, which is what actually reads as "a softly rounded corner" in
  line art. Lesson: for any rounded/beveled geometry, threshold angle
  needs to go *down* relative to a sharp-cornered version, not up — verify
  visually (a "blank car" render is the signature of getting this
  backwards), don't reason from geometry math alone.
- Net styling result (as of 2026-07-20 pt.2): `BODY_COLOR = 0xffffff` on
  `MeshLambertMaterial` (kept, not swapped to unlit `MeshBasicMaterial`)
  so white panels still pick up subtle light/shadow shading from the
  scene's directional light without reading as "colored in." Body edge
  width `EDGE_WIDTH = 2.5`px. Chassis rounding radius `0.08`, cabin `0.06`,
  both `segments: 3` — small/subtle, not a pill-shaped look. Wheels/hubs/
  anchors kept sharp `CylinderGeometry`/`BoxGeometry` (rounding wasn't
  requested there, and cylinders don't have the same sharp-corner problem).
  **Superseded same day, pt.3 below**: wheel/hub color and the
  highlight mechanism both changed again.

## Features (cont'd, 2026-07-20 pt.3) — all-white parts, blue highlight wash instead of an outline box
**Superseded same day, pt.4 below** — both the translucent overlay-box
highlight and the still-partially-gray body were replaced again after
follow-up feedback ("I don't want the selected parts to protrude. Paint
that part blue instead... use full white. I don't know why it's gray").
- All-white and the overlay-box highlight mechanics as originally built
  are described in git history / the pt.4 entry's contrast — not repeated
  here to avoid describing dead code as current.

## Features (cont'd, 2026-07-20 pt.4) — unlit materials (fixes the "why is it gray" confusion) + paint the actual part, no overlay
- **Root cause of "I don't know why it's gray"**: every body material was
  `MeshLambertMaterial`, a *lit* material — it shades each face based on
  its angle to the scene's lights, so even with `color: 0xffffff` most
  faces render as visibly gray (only faces pointed straight at the key
  light read close to white). Setting a material's color to white doesn't
  make it *render* white unless the material ignores lighting. Fixed by
  switching every body/wheel/hub material to `THREE.MeshBasicMaterial`
  (unlit — always renders the exact given color, regardless of face
  orientation). Net effect: the car now reads as genuinely, uniformly
  white everywhere. The scene's `AmbientLight`/`DirectionalLight` were
  removed from `threeScene.ts` entirely — with everything unlit, nothing
  reads them anymore, so keeping them would just be dead/confusing setup.
  **If any future request wants shading/depth cues back, that means
  reintroducing a lit material somewhere — don't just add lights back
  without also swapping the material type, they won't do anything with
  `MeshBasicMaterial`.**
- **Selected-part indicator now directly recolors the real part's own
  material** (paints it accent-blue), rather than any kind of separate
  overlay object — direct user request to stop the highlight from
  protruding. `carModel.ts` exports `paintPart(part, color)`, which
  traverses a part and sets `.color` on every child `Mesh`'s material,
  explicitly skipping `LineSegments2` children so the black edge lines
  never get recolored. `threeScene.ts` tracks `paintedPart` across calls:
  each `setTarget()` reverts the *previous* painted part back to
  `BODY_COLOR` (imported from `carModel.ts`) before painting the *new*
  target `ACCENT_BLUE`, and does nothing when `targetPartKey` is `null`
  (`default` zone). This deleted the entire highlight-mesh/box machinery
  from `threeScene.ts` (no more separate highlight `Object3D`, no
  `expandByScalar` padding, no highlight-specific dispose calls) —
  camera-target `Box3` computation is still needed (for the camera
  look-at center), just nothing is drawn from it anymore.
- **`engine`/`battery`/`wipers` changed from invisible anchor boxes to
  thin flush "decal" panels** (`buildDecal()` in `carModel.ts`): a very
  thin (`0.02` unit) white box sitting *just barely above* the chassis's
  own top surface (`CHASSIS_TOP_Y = 1.15`), with no `addEdges()` call —
  no border, so at the default white color it's visually indistinguishable
  from the surrounding chassis (same color, no seam), and when painted
  blue it reads as a flush colored patch directly on the hood/cowl rather
  than a raised block. This directly replaces the earlier
  `.visible = false` anchor approach (which had no real surface to paint,
  since it was invisible) — these anchors are now always visible, they
  just don't *look* like anything until selected. `wheelFront` needed no
  equivalent change — it's real, already-visible wheel/hub geometry, so
  `paintPart` recolors the actual wheel surfaces directly.

## Features (cont'd, 2026-07-22) — Figma frame 6:1044 sync: text color, "Due at" wording, section-header pills
- **`#000000` → `#333333` project-wide**: rather than hunting down every
  `text-black`/`bg-black`/`border-black` usage individually, overrode
  Tailwind's built-in `black` token itself — `index.css`'s `@theme` block now
  defines `--color-black: #333333`. Tailwind v4 resolves utility colors from
  theme CSS variables, so this one line repoints every existing `black`-based
  class (including opacity variants like the modal backdrop's `bg-black/60`
  and the `DetailPanel`/Figma-frame `EASY`/`MEDIUM`/`HARD` badge's
  `bg-black`) to the new value with no per-file edits. Matches the Figma
  source of truth, which uses `#333` instead of pure black throughout.
- **`MaintenanceItemCard`'s due line reworded** to "Due at {mileage} or
  {date}" (was "{mileage} / {date}", no "Due at" prefix, no color on the
  values) — matches the mockup's first-item variant (frame 6:1044, node
  18:55). "Due at" and "or" render in the (now-#333333) black; the mileage/
  date values themselves render `text-accent-blue`, also per the mockup.
  Single-interval items (only `intervalMiles` or only `intervalMonths` set,
  e.g. "Coolant flush"/"Brake fluid flush") correctly drop the "or" and show
  just "Due at {value}" — same null-handling as before, just re-derived
  around the new prefix/"or" pieces.
- **Removed the gray "never" pill from `StatusLegend`** (section headers
  now show only the green/yellow/red count pills, matching the mockup) —
  `LEGEND_ITEMS` no longer has a `never` entry. Deliberately left
  `MaintenanceSection`'s `counts.never` computation and the `never` status/
  color elsewhere (item dot, progress bar — see the 2026-07-19 "never
  completed" entry above) untouched; only the section-header legend pill
  itself was removed, not the underlying status.

## Rules & Preferences
- When decoding VIN data, watch for NHTSA's `Model`/`Trim` fields
  overlapping (e.g. model "Santa Fe Sport" + trim "Sport 2WD" →
  duplicated "Sport"). `dedupeTrim()` in `vinDecode.ts` strips a
  repeated leading trim word — extend that logic if new overlap
  patterns show up rather than special-casing individual makes.
- No `.env`/API-key infrastructure exists yet — the NHTSA vPIC API was
  deliberately chosen because it needs none. If a future integration
  requires a key, that'll be the first time env vars are introduced here.
