import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Group, Vector3 } from "three";
import type { NatureEffect } from "./spell-appearance";
import { impactFraction } from "./visual-manifest";

type Props = {
  source: [number, number, number];
  target: [number, number, number];
  effect: NatureEffect;
  impact: boolean;
  speed: number;
  durationMs: number;
  reducedMotion: boolean;
};
const petals = Array.from({ length: 8 }, (_, index) => ({
  index,
  angle: (index * Math.PI) / 4,
}));
const thorns = Array.from({ length: 6 }, (_, index) => ({
  index,
  angle: (index * Math.PI) / 3,
}));
const up = new Vector3(0, 1, 0);
const colors: Record<NatureEffect, string> = {
  roots: "#9ab66d",
  bark: "#b5cb84",
  splinters: "#e3bf7e",
  leaves: "#b5f2b1",
  verdant: "#d3eda0",
  stone: "#c3c6a3",
  venom: "#b5d66c",
};

/** Cosmetic geometry only. Target positions and impact timing come from the replay. */
export function NatureFeedback({
  source,
  target,
  effect,
  impact,
  speed,
  durationMs,
  reducedMotion,
}: Props) {
  const projectile = useRef<Group>(null);
  const bloom = useRef<Group>(null);
  const elapsed = useRef(0);
  const start = useMemo(() => new Vector3(source[0], 1.4, source[2]), [source]);
  const end = useMemo(() => new Vector3(target[0], 1.15, target[2]), [target]);
  const direction = useMemo(
    () => end.clone().sub(start).normalize(),
    [start, end],
  );
  const color = colors[effect];
  const airborne =
    effect === "splinters" || effect === "leaves" || effect === "verdant";
  useFrame((_, delta) => {
    elapsed.current += Math.min(delta, 0.1) * speed * (1000 / durationMs);
    const travel = Math.min(1, elapsed.current / impactFraction);
    if (projectile.current) {
      projectile.current.position.copy(start).lerp(end, travel);
      projectile.current.position.y =
        start.y +
        (end.y - start.y) * travel +
        Math.sin(travel * Math.PI) * 0.65;
      projectile.current.quaternion.setFromUnitVectors(up, direction);
      projectile.current.visible =
        airborne && !impact && !reducedMotion && travel < 1;
    }
    if (!bloom.current || reducedMotion) return;
    const progress = Math.max(
      0,
      Math.min(1, (elapsed.current - impactFraction) / (1 - impactFraction)),
    );
    const emergence = Math.min(1, progress * 5);
    bloom.current.scale.set(
      0.85 + emergence * 0.15,
      0.2 + emergence * 0.8,
      0.85 + emergence * 0.15,
    );
    if (effect === "leaves" || effect === "verdant" || effect === "venom") {
      bloom.current.rotation.y = progress * 0.9;
      bloom.current.position.y =
        effect === "verdant" ? 0.9 - progress * 0.65 : 0.25 + progress * 0.35;
    }
    if (effect === "stone") bloom.current.scale.setScalar(0.8 + progress * 0.6);
  });
  return (
    <>
      <group ref={projectile} visible={false}>
        {[-1, 0, 1].map((offset) => (
          <mesh
            key={offset}
            position={[offset * 0.18, -Math.abs(offset) * 0.22, 0]}
            scale={[0.07, 0.38, 0.07]}
          >
            <octahedronGeometry args={[1, 0]} />
            <meshStandardMaterial
              color={effect === "splinters" ? "#9a764d" : color}
              emissive={color}
              emissiveIntensity={0.25}
              roughness={0.8}
            />
          </mesh>
        ))}
      </group>
      <group
        ref={bloom}
        position={[target[0], 0.25, target[2]]}
        visible={impact}
      >
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.91, 0.95, effect === "stone" ? 6 : 48]} />
          <meshBasicMaterial
            color={color}
            transparent
            opacity={0.65}
            depthWrite={false}
          />
        </mesh>
        <NatureShapes effect={effect} color={color} />
      </group>
    </>
  );
}

function NatureShapes({
  effect,
  color,
}: {
  effect: NatureEffect;
  color: string;
}) {
  if (effect === "roots" || effect === "bark")
    return (
      <>
        {thorns.map(({ index, angle }) => (
          <group
            key={index}
            position={[Math.cos(angle) * 0.96, 0, Math.sin(angle) * 0.96]}
            rotation={[0, -angle, 0]}
          >
            <mesh
              position={[0, effect === "roots" ? 0.24 : 0.36, 0]}
              rotation={[0, 0, effect === "roots" ? -0.16 : 0]}
              scale={
                effect === "roots" ? [0.12, 0.38, 0.12] : [0.12, 0.95, 0.38]
              }
            >
              <dodecahedronGeometry args={[1, 0]} />
              <meshStandardMaterial
                color={effect === "roots" ? "#75563a" : "#887149"}
                roughness={1}
                flatShading
              />
            </mesh>
            {effect === "roots" && (
              <mesh position={[-0.2, 0.53, 0]}>
                <torusGeometry args={[0.29, 0.065, 5, 10, Math.PI]} />
                <meshStandardMaterial
                  color="#75563a"
                  roughness={1}
                  flatShading
                />
              </mesh>
            )}
            <mesh
              position={[
                effect === "roots" ? -0.24 : -0.1,
                effect === "roots" ? 0.84 : 0.78,
                0,
              ]}
              scale={[0.19, 0.08, 0.1]}
            >
              <octahedronGeometry args={[1, 0]} />
              <meshBasicMaterial color={color} />
            </mesh>
          </group>
        ))}
      </>
    );
  if (effect === "stone" || effect === "splinters")
    return (
      <>
        {petals.map(({ index, angle }) => (
          <mesh
            key={index}
            position={[
              Math.cos(angle) * (1 + (index % 2) * 0.18),
              0.15 + (index % 3) * 0.13,
              Math.sin(angle) * (1 + (index % 2) * 0.18),
            ]}
            rotation={[angle, 0, 0.7]}
            scale={
              effect === "stone"
                ? [0.2, 0.15 + (index % 3) * 0.06, 0.22]
                : [0.07, 0.38, 0.07]
            }
          >
            <dodecahedronGeometry args={[1, 0]} />
            <meshStandardMaterial
              color={effect === "stone" ? "#8f9a83" : "#ba9356"}
              roughness={1}
              flatShading
            />
          </mesh>
        ))}
      </>
    );
  return (
    <>
      {petals.map(({ index, angle }) => (
        <mesh
          key={index}
          position={[
            Math.cos(angle) * 0.95,
            0.3 + (index % 4) * 0.45,
            Math.sin(angle) * 0.95,
          ]}
          rotation={[0.35, -angle, effect === "verdant" ? -0.5 : 0.65]}
          scale={
            effect === "venom"
              ? [0.12, 0.15, 0.12]
              : [0.13, effect === "verdant" ? 0.45 : 0.25, 0.065]
          }
        >
          <octahedronGeometry args={[1, 0]} />
          <meshBasicMaterial
            color={index % 2 === 0 ? color : "#739d54"}
            transparent
            opacity={0.9}
          />
        </mesh>
      ))}
      {effect === "venom" && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
          <circleGeometry args={[0.75, 24]} />
          <meshBasicMaterial
            color="#6c8141"
            transparent
            opacity={0.22}
            depthWrite={false}
          />
        </mesh>
      )}
    </>
  );
}
