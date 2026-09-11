import { useFrame } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import { Group } from "three";
import type { Entity } from "@loot-game/game/entity-types";
import type { Stats, VisualCue } from "./timeline";
import { Miniature, type MiniatureAssetResult } from "./miniature";
import { miniatureFor } from "./visual-manifest";
import { cueColor, hasSpellFeedback } from "./spell-appearance";
import type { MiniatureAppearance } from "./miniature-appearance";

type ActorProps = {
  entity: Entity;
  position: [number, number, number];
  asset: MiniatureAssetResult["asset"];
  appearance: MiniatureAppearance;
  stats?: Stats;
  active: boolean;
  selected: boolean;
  legal: boolean;
  cue?: VisualCue;
  cueKey: string;
  impact: boolean;
  speed: number;
  durationMs: number;
  reducedMotion: boolean;
  onPick: (id: string) => void;
};

export function BattleActor({
  entity,
  position,
  asset,
  appearance,
  stats,
  active,
  selected,
  legal: isLegal,
  ...props
}: ActorProps) {
  const root = useRef<Group>(null);
  const definition = miniatureFor(entity);
  const dead = stats?.flags.dead;
  const legal = isLegal && !dead;
  const hit = props.impact && props.cue?.targetIds.includes(entity.id);
  const casting =
    props.cue?.casterId === entity.id &&
    props.cue.kind === "SPELL_CAST" &&
    props.cue.style !== "effect";
  const action = dead
    ? "death"
    : casting
      ? props.cue?.style === "melee"
        ? "attack"
        : props.cue?.style === "heal" || props.cue?.style === "ward"
          ? "heal"
          : "cast"
      : hit && (stats?.deltaHealth ?? 0) < 0
        ? "hit"
        : "idle";
  const color = dead
    ? "#535652"
    : selected
      ? "#f2d393"
      : legal
        ? "#b3d7cf"
        : entity.team === "TEAM_A"
          ? "#719ec0"
          : "#c68873";
  const elapsed = useRef(0);
  useEffect(() => {
    elapsed.current = 0;
  }, [props.cueKey]);
  useFrame((_, delta) => {
    elapsed.current +=
      Math.min(delta, 0.1) * props.speed * (1000 / props.durationMs);
    if (!root.current) return;
    root.current.position.x =
      !props.reducedMotion && casting && props.cue?.style === "melee"
        ? Math.sin(Math.min(elapsed.current, 1) * Math.PI) *
          (entity.team === "TEAM_A" ? 0.7 : -0.7)
        : 0;
  });
  return (
    <group position={position}>
      <mesh position={[0, 0.1, 0]} receiveShadow>
        <cylinderGeometry args={[0.8, 0.9, 0.14, 32]} />
        <meshStandardMaterial color="#222a29" roughness={0.9} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.18, 0]}>
        <ringGeometry
          args={[selected ? 0.84 : 0.78, selected ? 1 : 0.84, legal ? 6 : 48]}
        />
        <meshBasicMaterial color={color} />
      </mesh>
      {active && (
        <mesh
          position={[0, definition.labelHeight + 0.22, 0]}
          rotation={[0, 0, Math.PI]}
        >
          <coneGeometry args={[0.18, 0.36, 4]} />
          <meshBasicMaterial color="#e3bd74" />
        </mesh>
      )}
      {selected &&
        [0, 1, 2, 3].map((i) => (
          <mesh
            key={i}
            position={[
              Math.cos((i * Math.PI) / 2) * 1.04,
              0.22,
              Math.sin((i * Math.PI) / 2) * 1.04,
            ]}
            rotation={[0, (-i * Math.PI) / 2, Math.PI / 2]}
          >
            <coneGeometry args={[0.1, 0.22, 3]} />
            <meshBasicMaterial color="#ffdf9c" />
          </mesh>
        ))}
      {hit && props.cue && !hasSpellFeedback(props.cue) && (
        <mesh position={[0, 1.2, 0]}>
          <sphereGeometry args={[0.9, 12, 8]} />
          <meshBasicMaterial
            color={cueColor(props.cue?.style)}
            wireframe
            transparent
            opacity={0.45}
          />
        </mesh>
      )}
      <group
        ref={root}
        rotation={[0, definition.facing, 0]}
        position={[0, 0.2, 0]}
      >
        {asset ? (
          <Miniature
            asset={asset}
            appearance={appearance}
            definition={definition}
            action={action}
            cueKey={dead ? "death" : casting || hit ? props.cueKey : action}
            speed={props.speed}
            durationMs={props.durationMs}
            reducedMotion={props.reducedMotion}
            deathSettled={!!dead && (!hit || props.cue?.kind === "DEATH")}
          />
        ) : (
          <group rotation={[0, 0, dead ? Math.PI / 2 : 0]}>
            <mesh position={[0, 0.85, 0]} castShadow>
              <capsuleGeometry args={[0.35, 0.85, 4, 8]} />
              <meshStandardMaterial color={color} />
            </mesh>
            <mesh position={[0, 1.7, 0]}>
              <icosahedronGeometry args={[0.3, 0]} />
              <meshStandardMaterial color="#e5d6b4" />
            </mesh>
          </group>
        )}
      </group>
      {/* One stable generous proxy; scenery and model details do not compete for input. */}
      <mesh
        position={[0, 1.3, 0]}
        onClick={(event) => {
          event.stopPropagation();
          props.onPick(entity.id);
        }}
      >
        <boxGeometry args={[1.7, 2.8, 1.7]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  );
}
