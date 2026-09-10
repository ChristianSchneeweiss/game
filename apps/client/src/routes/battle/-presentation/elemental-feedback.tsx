import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Group, Vector3 } from "three";
import type { ElementalEffect } from "./spell-appearance";
import { impactFraction } from "./visual-manifest";
import {
  FlameImpact,
  LightningImpact,
  SoulImpact,
  WaterImpact,
} from "./elemental-shapes";

type Props = {
  source: [number, number, number];
  target: [number, number, number];
  effect: ElementalEffect;
  impact: boolean;
  speed: number;
  durationMs: number;
  reducedMotion: boolean;
};
const colors: Record<ElementalEffect, string> = {
  fire: "#eda15b",
  brand: "#e58b52",
  chains: "#efb178",
  soul: "#e8bc88",
  drain: "#c9899d",
  lightning: "#cfdbfa",
  storm: "#b6d6f6",
  water: "#a2d9db",
  torrent: "#9edee2",
  "tide-spear": "#b8e9df",
  restore: "#c6edcf",
};
const up = new Vector3(0, 1, 0);

export function ElementalFeedback({
  source,
  target,
  effect,
  impact,
  speed,
  durationMs,
  reducedMotion,
}: Props) {
  const projectile = useRef<Group>(null);
  const seal = useRef<Group>(null);
  const elapsed = useRef(0);
  const start = useMemo(() => new Vector3(source[0], 1.4, source[2]), [source]);
  const end = useMemo(() => new Vector3(target[0], 1.2, target[2]), [target]);
  const direction = useMemo(
    () => end.clone().sub(start).normalize(),
    [start, end],
  );
  const color = colors[effect];
  const lightning = effect === "lightning" || effect === "storm";
  useFrame((_, delta) => {
    elapsed.current += Math.min(delta, 0.1) * speed * (1000 / durationMs);
    const travel = Math.min(1, elapsed.current / impactFraction);
    if (projectile.current) {
      projectile.current.position.copy(start).lerp(end, travel);
      projectile.current.position.y =
        start.y +
        (end.y - start.y) * travel +
        Math.sin(travel * Math.PI) * (lightning ? 0.2 : 0.55);
      projectile.current.quaternion.setFromUnitVectors(up, direction);
      projectile.current.visible = !impact && !reducedMotion && travel < 1;
    }
    if (!seal.current || reducedMotion) return;
    const progress = Math.max(
      0,
      Math.min(1, (elapsed.current - impactFraction) / (1 - impactFraction)),
    );
    seal.current.scale.setScalar(0.9 + Math.sin(progress * Math.PI) * 0.13);
    // One steady discharge; no rapid flashes, camera shake or screen-wide bloom.
    if (!lightning)
      seal.current.rotation.y = progress * (effect === "torrent" ? 2.4 : 0.7);
    seal.current.position.y =
      0.24 + (effect === "restore" ? progress * 0.3 : 0);
  });
  return (
    <>
      <group ref={projectile} visible={false}>
        {[0, 1, 2].map((index) => (
          <mesh
            key={index}
            position={[0, -index * 0.28, 0]}
            scale={[
              0.13 - index * 0.025,
              lightning ? 0.42 : 0.23,
              0.13 - index * 0.025,
            ]}
          >
            <octahedronGeometry />
            <meshBasicMaterial color={index === 0 ? "#f5ead2" : color} />
          </mesh>
        ))}
      </group>
      <group
        ref={seal}
        position={[target[0], 0.24, target[2]]}
        visible={impact}
      >
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.91, 0.945, lightning ? 6 : 48]} />
          <meshBasicMaterial
            color={color}
            transparent
            opacity={0.65}
            depthWrite={false}
          />
        </mesh>
        <ElementalShape effect={effect} color={color} />
      </group>
    </>
  );
}
function ElementalShape({
  effect,
  color,
}: {
  effect: ElementalEffect;
  color: string;
}) {
  if (effect === "lightning" || effect === "storm")
    return <LightningImpact color={color} storm={effect === "storm"} />;
  if (effect === "fire" || effect === "brand" || effect === "chains")
    return <FlameImpact effect={effect} color={color} />;
  if (effect === "soul" || effect === "drain")
    return <SoulImpact color={color} />;
  return <WaterImpact effect={effect} color={color} />;
}
