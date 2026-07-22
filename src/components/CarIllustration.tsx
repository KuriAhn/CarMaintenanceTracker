import { useEffect, useRef } from "react";
import { createCarScene, type CarScene } from "../lib/threeScene";
import type { HotspotZone } from "../data/carHotspots";

interface CarIllustrationProps {
  zone: HotspotZone;
}

export default function CarIllustration({ zone }: CarIllustrationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<CarScene | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    const scene = createCarScene(canvasRef.current);
    sceneRef.current = scene;
    return () => {
      sceneRef.current = null;
      scene.dispose();
    };
  }, []);

  useEffect(() => {
    sceneRef.current?.setTarget(zone);
  }, [zone]);

  return (
    <div className="relative h-full w-full overflow-hidden">
      <canvas ref={canvasRef} className="block h-full w-full" />
    </div>
  );
}
