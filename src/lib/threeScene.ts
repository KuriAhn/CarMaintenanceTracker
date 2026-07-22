import * as THREE from "three";
import { LineSegments2 } from "three/examples/jsm/lines/LineSegments2.js";
import { buildCarModel, paintPart, ACCENT_COLOR, BODY_COLOR } from "./carModel";
import type { HotspotZone } from "../data/carHotspots";

const LERP_RATE = 6; // higher = snappier settle

// Manual orbit-drag / scroll-zoom tuning.
const ROTATE_SPEED = 0.006; // radians per pixel of drag
const ZOOM_SPEED = 0.01; // radius units per wheel-delta unit
const MIN_RADIUS = 3;
const MAX_RADIUS = 14;
const MIN_PHI = THREE.MathUtils.degToRad(8); // keep the camera from flipping over the top
const MAX_PHI = THREE.MathUtils.degToRad(172); // ...or underneath

interface OrbitState {
  spherical: THREE.Spherical; // radius, phi (from +Y), theta (around +Y)
  lookAt: THREE.Vector3;
}

function wrapAngle(angle: number): number {
  // wrap into (-PI, PI] so lerping always takes the shortest path around
  let a = angle % (Math.PI * 2);
  if (a > Math.PI) a -= Math.PI * 2;
  if (a < -Math.PI) a += Math.PI * 2;
  return a;
}

function zoneToOrbit(zone: HotspotZone, box: THREE.Box3): OrbitState {
  const phi = THREE.MathUtils.degToRad(90 - zone.cameraElevationDeg);
  const theta = THREE.MathUtils.degToRad(zone.cameraAzimuthDeg);
  return {
    spherical: new THREE.Spherical(zone.cameraDistance, phi, theta),
    lookAt: box.getCenter(new THREE.Vector3()),
  };
}

export interface CarScene {
  setTarget: (zone: HotspotZone) => void;
  dispose: () => void;
}

export function createCarScene(canvas: HTMLCanvasElement): CarScene {
  // All materials are unlit (MeshBasicMaterial), so no scene lights are
  // needed — nothing would read them.
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const scene = new THREE.Scene();
  // Near/far kept tight to the scene's actual size (~10 units across, closest
  // zoom ~5.5). A far plane of 100 wasted depth-buffer precision on empty
  // space, which caused z-fighting flicker at close zoom on thin geometry
  // (the flush decal panels, the clustered bevel edge lines) — most visible
  // on the front-facing "engine"/"wipers" zones, the closest zoom targets.
  const camera = new THREE.PerspectiveCamera(35, 1, 1, 30);

  const { car, parts } = buildCarModel();
  scene.add(car);
  const carBox = new THREE.Box3().setFromObject(car);

  // The currently-selected part (if any) is painted accent-blue in place —
  // no separate highlight object, so nothing protrudes above the surface.
  let paintedPart: THREE.Object3D | null = null;

  const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  let reducedMotion = reducedMotionQuery.matches;
  const handleMotionChange = (event: MediaQueryListEvent) => {
    reducedMotion = event.matches;
  };
  reducedMotionQuery.addEventListener("change", handleMotionChange);

  const current: OrbitState = {
    spherical: new THREE.Spherical(10, THREE.MathUtils.degToRad(70), THREE.MathUtils.degToRad(35)),
    lookAt: carBox.getCenter(new THREE.Vector3()),
  };
  const target: OrbitState = {
    spherical: current.spherical.clone(),
    lookAt: current.lookAt.clone(),
  };

  function applyCamera() {
    const offset = new THREE.Vector3().setFromSpherical(current.spherical);
    camera.position.copy(current.lookAt).add(offset);
    camera.lookAt(current.lookAt);
  }
  applyCamera();

  // Drag-to-orbit: applied straight to `current` (not just `target`) so the
  // model tracks the pointer 1:1 with no lerp lag, unlike zone transitions
  // which should ease. `target` is kept in sync too so the drag position
  // "sticks" instead of springing back on the next tick.
  let dragging = false;
  let lastPointerX = 0;
  let lastPointerY = 0;

  function handlePointerDown(event: PointerEvent) {
    if (event.button !== 0) return;
    dragging = true;
    lastPointerX = event.clientX;
    lastPointerY = event.clientY;
    canvas.setPointerCapture(event.pointerId);
    canvas.style.cursor = "grabbing";
  }

  function handlePointerMove(event: PointerEvent) {
    if (!dragging) return;
    const dx = event.clientX - lastPointerX;
    const dy = event.clientY - lastPointerY;
    lastPointerX = event.clientX;
    lastPointerY = event.clientY;

    const theta = wrapAngle(current.spherical.theta - dx * ROTATE_SPEED);
    const phi = THREE.MathUtils.clamp(current.spherical.phi - dy * ROTATE_SPEED, MIN_PHI, MAX_PHI);
    current.spherical.theta = theta;
    current.spherical.phi = phi;
    target.spherical.theta = theta;
    target.spherical.phi = phi;
  }

  function handlePointerUp(event: PointerEvent) {
    if (!dragging) return;
    dragging = false;
    canvas.releasePointerCapture(event.pointerId);
    canvas.style.cursor = "grab";
  }

  // Scroll-to-zoom, scoped to the canvas so it doesn't fight page scrolling.
  function handleWheelZoom(event: WheelEvent) {
    event.preventDefault();
    target.spherical.radius = THREE.MathUtils.clamp(
      target.spherical.radius + event.deltaY * ZOOM_SPEED,
      MIN_RADIUS,
      MAX_RADIUS
    );
  }

  canvas.style.cursor = "grab";
  canvas.style.touchAction = "none"; // prevent touch drag from also scrolling the page
  canvas.addEventListener("pointerdown", handlePointerDown);
  canvas.addEventListener("pointermove", handlePointerMove);
  canvas.addEventListener("pointerup", handlePointerUp);
  canvas.addEventListener("pointercancel", handlePointerUp);
  canvas.addEventListener("wheel", handleWheelZoom, { passive: false });

  function setTarget(zone: HotspotZone) {
    const part = zone.targetPartKey ? parts[zone.targetPartKey] : null;
    const box = part ? new THREE.Box3().setFromObject(part) : carBox;
    const orbit = zoneToOrbit(zone, box);

    target.spherical.copy(orbit.spherical);
    target.lookAt.copy(orbit.lookAt);

    if (paintedPart && paintedPart !== part) {
      paintPart(paintedPart, BODY_COLOR);
    }
    if (part) {
      paintPart(part, ACCENT_COLOR);
    }
    paintedPart = part;

    if (reducedMotion) {
      current.spherical.copy(target.spherical);
      current.lookAt.copy(target.lookAt);
      applyCamera();
    }
  }

  let rafId = 0;
  let lastTime = performance.now();

  function tick(now: number) {
    const dt = Math.min((now - lastTime) / 1000, 0.1);
    lastTime = now;

    const lerpFactor = 1 - Math.exp(-LERP_RATE * dt);

    current.spherical.radius += (target.spherical.radius - current.spherical.radius) * lerpFactor;
    current.spherical.phi += (target.spherical.phi - current.spherical.phi) * lerpFactor;
    current.spherical.theta += wrapAngle(target.spherical.theta - current.spherical.theta) * lerpFactor;
    current.lookAt.lerp(target.lookAt, lerpFactor);

    applyCamera();
    renderer.render(scene, camera);
    rafId = requestAnimationFrame(tick);
  }
  rafId = requestAnimationFrame(tick);

  const resizeObserver = new ResizeObserver((entries) => {
    const entry = entries[0];
    if (!entry) return;
    const { width, height } = entry.contentRect;
    if (width === 0 || height === 0) return;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  });
  resizeObserver.observe(canvas);

  // edgeMaterial (carModel.ts) is a page-lifetime singleton shared across
  // every body part's outline — intentionally NOT disposed here, or a
  // Strict Mode dispose→recreate cycle (or a future body-style rebuild)
  // would leave every subsequent car rendering with a disposed material.
  function disposeObject3D(object: THREE.Object3D) {
    object.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;
      child.geometry.dispose();
      if (child instanceof LineSegments2) return; // shared edgeMaterial, skip
      const material = child.material;
      if (Array.isArray(material)) material.forEach((m) => m.dispose());
      else material.dispose();
    });
  }

  function dispose() {
    cancelAnimationFrame(rafId);
    resizeObserver.disconnect();
    reducedMotionQuery.removeEventListener("change", handleMotionChange);
    canvas.removeEventListener("pointerdown", handlePointerDown);
    canvas.removeEventListener("pointermove", handlePointerMove);
    canvas.removeEventListener("pointerup", handlePointerUp);
    canvas.removeEventListener("pointercancel", handlePointerUp);
    canvas.removeEventListener("wheel", handleWheelZoom);
    disposeObject3D(car);
    renderer.dispose();
  }

  return { setTarget, dispose };
}
