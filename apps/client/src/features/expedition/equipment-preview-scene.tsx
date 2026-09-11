import { Canvas, useThree } from "@react-three/fiber";
import { useEffect, useState } from "react";
import type { Character } from "@loot-game/game/base-entity";
import {
  Miniature,
  useMiniatureAssets,
} from "@/routes/battle/-presentation/miniature";
import { miniatures } from "@/routes/battle/-presentation/visual-manifest";
import { appearanceFor } from "@/routes/battle/-presentation/miniature-appearance";

function PreviewCamera() {
  const { camera, gl } = useThree();
  const [lost, setLost] = useState(false);
  useEffect(() => {
    camera.lookAt(0, 0.95, 0);
    const fail = () => setLost(true);
    gl.domElement.addEventListener("webglcontextlost", fail);
    return () => gl.domElement.removeEventListener("webglcontextlost", fail);
  }, [camera, gl]);
  if (lost) throw new Error("Preview context lost");
  return null;
}

export default function EquipmentPreviewScene({
  character,
  party,
}: {
  character: Character;
  party: Character[];
}) {
  const definition = miniatures.party;
  const assets = useMiniatureAssets([definition.url]);
  const result = assets.get(definition.url);
  const [angle, setAngle] = useState(0);
  const [reducedMotion] = useState(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  if (result?.error)
    return (
      <p className="expedition-preview-fallback" role="status">
        The character model could not load. Your equipment remains available
        below.
      </p>
    );
  if (!result?.asset)
    return (
      <p className="expedition-preview-fallback" role="status">
        Preparing your character preview…
      </p>
    );
  return (
    <div className="expedition-gear-canvas">
      <Canvas
        shadows
        dpr={[1, 1.5]}
        camera={{ position: [2.4, 2.1, 5], fov: 31, near: 0.1, far: 20 }}
        fallback={
          <p className="expedition-preview-fallback">
            WebGL is unavailable. Equipment can still be changed below.
          </p>
        }
      >
        <PreviewCamera />
        <hemisphereLight args={["#eef6e6", "#344b3b", 2]} />
        <directionalLight
          position={[3, 5, 4]}
          intensity={3}
          castShadow
          shadow-mapSize={[512, 512]}
        />
        <pointLight position={[-3, 2, -2]} color="#83dac8" intensity={12} />
        <group rotation={[0, angle, 0]}>
          <Miniature
            asset={result.asset}
            appearance={appearanceFor(character, party)}
            definition={definition}
            action="idle"
            cueKey="equipment-preview"
            reducedMotion={reducedMotion}
            deathSettled={false}
            speed={1}
            durationMs={1000}
          />
        </group>
        <mesh position={[0, -0.1, 0]} receiveShadow>
          <cylinderGeometry args={[0.95, 1.02, 0.16, 48]} />
          <meshStandardMaterial color="#24382d" roughness={0.85} />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.014, 0]}>
          <ringGeometry args={[0.88, 0.91, 48]} />
          <meshStandardMaterial color="#b6a977" roughness={0.7} />
        </mesh>
      </Canvas>
      <div className="expedition-preview-controls">
        <button
          type="button"
          onClick={() => setAngle((value) => value - Math.PI / 4)}
          aria-label="Rotate character left"
        >
          ↶
        </button>
        <span>Character preview</span>
        <button
          type="button"
          onClick={() => setAngle((value) => value + Math.PI / 4)}
          aria-label="Rotate character right"
        >
          ↷
        </button>
      </div>
    </div>
  );
}
