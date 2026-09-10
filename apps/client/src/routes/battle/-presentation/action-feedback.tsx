import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Group, Vector3 } from "three";
import type { VisualCue } from "./timeline";
import { impactFraction } from "./visual-manifest";

export function cueColor(style: VisualCue["style"] | undefined) {
  return style === "heal"
    ? "#9ef0b7"
    : style === "ward"
      ? "#eacb82"
      : style === "spell"
        ? "#9bd9ef"
        : "#ffbd90";
}

/** A resolved event supplies the endpoints; movement carries no game meaning. */
export function ActionFeedback({
  cue,
  cueKey,
  positions,
  impact,
  speed,
  durationMs,
  reducedMotion,
}: {
  cue?: VisualCue;
  cueKey: string;
  positions: Map<string, [number, number, number]>;
  impact: boolean;
  speed: number;
  durationMs: number;
  reducedMotion: boolean;
}) {
  if (!cue || cue.kind !== "SPELL_CAST" || !cue.casterId) return null;
  const source = positions.get(cue.casterId);
  if (!source) return null;
  return (
    <>
      {cue.targetIds.map((id) => {
        const target = positions.get(id);
        if (!target || cue.style === "melee" || cue.style === "effect")
          return null;
        return (
          <SpellTrace
            key={`${cueKey}:${id}`}
            source={source}
            target={target}
            style={cue.style}
            impact={impact}
            speed={speed}
            durationMs={durationMs}
            reducedMotion={reducedMotion}
          />
        );
      })}
    </>
  );
}

function SpellTrace({
  source,
  target,
  style,
  impact,
  speed,
  durationMs,
  reducedMotion,
}: {
  source: [number, number, number];
  target: [number, number, number];
  style: VisualCue["style"];
  impact: boolean;
  speed: number;
  durationMs: number;
  reducedMotion: boolean;
}) {
  const projectile = useRef<Group>(null);
  const seal = useRef<Group>(null);
  const elapsed = useRef(0);
  const start = useMemo(
    () => new Vector3(source[0], 1.35, source[2]),
    [source],
  );
  const end = useMemo(() => new Vector3(target[0], 1.15, target[2]), [target]);
  const color = cueColor(style);
  useEffect(() => {
    elapsed.current = 0;
  }, [source, target, style]);
  useFrame((_, delta) => {
    elapsed.current += Math.min(delta, 0.1) * speed * (1000 / durationMs);
    const travel = Math.min(1, elapsed.current / impactFraction);
    if (projectile.current) {
      projectile.current.position.copy(start).lerp(end, travel);
      projectile.current.position.y += Math.sin(travel * Math.PI) * 0.8;
      projectile.current.visible = !impact && !reducedMotion && travel < 1;
    }
    if (seal.current && !reducedMotion) {
      seal.current.rotation.y = elapsed.current * 1.6;
      seal.current.scale.setScalar(
        impact
          ? 1 +
              Math.sin(
                Math.min(1, (elapsed.current - impactFraction) / 0.55) *
                  Math.PI,
              ) *
                0.22
          : 0.75,
      );
    }
  });
  return (
    <>
      <group ref={projectile} visible={!reducedMotion && !impact}>
        <mesh>
          <icosahedronGeometry args={[0.16, 1]} />
          <meshBasicMaterial color={color} />
        </mesh>
        <mesh>
          <sphereGeometry args={[0.29, 12, 8]} />
          <meshBasicMaterial
            color={color}
            transparent
            opacity={0.18}
            depthWrite={false}
          />
        </mesh>
      </group>
      <group
        ref={seal}
        position={[target[0], 0.23, target[2]]}
        visible={impact}
      >
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.88, 0.96, style === "ward" ? 6 : 40]} />
          <meshBasicMaterial
            color={color}
            transparent
            opacity={0.9}
            depthWrite={false}
          />
        </mesh>
      </group>
      {style === "heal" && (
        <group position={[target[0] + 0.9, 2.2, target[2]]} visible={impact}>
          <mesh>
            <boxGeometry args={[0.16, 0.65, 0.16]} />
            <meshBasicMaterial color={color} />
          </mesh>
          <mesh>
            <boxGeometry args={[0.5, 0.16, 0.16]} />
            <meshBasicMaterial color={color} />
          </mesh>
        </group>
      )}
    </>
  );
}
