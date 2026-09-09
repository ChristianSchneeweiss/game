import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  Component,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Group, PCFShadowMap, Vector3 } from "three";
import type { Entity } from "@loot-game/game/entity-types";
import type { Stats, VisualCue } from "./timeline";
import { Miniature, useMiniatureAsset } from "./miniature";
import { miniature, sceneFault } from "./visual-manifest";
import { entityLabel } from "./entity-label";

type Props = {
  participants: Entity[];
  stats: Map<string, Stats>;
  activeId?: string;
  selected: string[];
  legal: string[];
  inspected?: string;
  onPick: (id: string) => void;
  cue?: VisualCue;
  cueKey: string;
  impact: boolean;
  speed: number;
  reducedMotion: boolean;
  onFailure: () => void;
};
type FrameSample = { frames: number; p50: number; p95: number; max: number };
export type SceneMetrics = FrameSample & {
  calls: number;
  triangles: number;
  geometries: number;
  textures: number;
  playback?: FrameSample & { kinds: string[] };
};
function frameSample(values: number[]): FrameSample {
  const sorted = [...values].sort((a, b) => a - b);
  return {
    frames: values.length,
    p50: sorted[Math.floor(sorted.length * 0.5)] ?? 0,
    p95: sorted[Math.floor(sorted.length * 0.95)] ?? 0,
    max: sorted.at(-1) ?? 0,
  };
}

declare global {
  interface Window {
    __battleSceneMetrics?: SceneMetrics;
  }
}

export class GraphicsBoundary extends Component<
  { children: ReactNode; onFailure: () => void },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onFailure();
  }
  render() {
    return this.state.failed ? (
      <p role="alert">
        The 3D renderer could not start. Switch to Cards to continue fighting.
      </p>
    ) : (
      this.props.children
    );
  }
}

export function formation(participants: Entity[]) {
  const positions = new Map<string, [number, number, number]>();
  for (const team of ["TEAM_A", "TEAM_B"]) {
    const members = participants.filter((p) => p.team === team);
    members.forEach((entity, i) => {
      positions.set(
        entity.id,
        team === "TEAM_A"
          ? [-3.7, 0, members.length === 1 ? 0 : (i - 0.5) * 3.6]
          : [
              2.3 + (i % 2) * 3.1,
              0,
              members.length <= 2
                ? (i - (members.length - 1) / 2) * 3.5
                : (Math.floor(i / 2) - 0.5) * 3.6,
            ],
      );
    });
  }
  return positions;
}

function CameraAndMetrics({
  positions,
  labels,
  onFailure,
  cueKind,
}: {
  positions: Map<string, [number, number, number]>;
  labels: Map<string, HTMLDivElement>;
  onFailure: () => void;
  cueKind?: string;
}) {
  const { camera, size, gl } = useThree();
  const times = useRef<number[]>([]);
  const activeTimes = useRef<number[]>([]);
  const activeKinds = useRef(new Set<string>());
  const frameCount = useRef(0);
  const point = useMemo(() => new Vector3(), []);
  useEffect(() => {
    gl.domElement.addEventListener("webglcontextlost", onFailure);
    return () =>
      gl.domElement.removeEventListener("webglcontextlost", onFailure);
  }, [gl, onFailure]);
  useEffect(() => {
    if ("zoom" in camera) {
      camera.zoom = Math.min(size.width / 15, size.height / 10.5);
      camera.position.set(0, 11, 13);
      camera.lookAt(0, 0, 0);
      camera.updateProjectionMatrix();
    }
  }, [camera, size]);
  useFrame((_, delta) => {
    for (const [id, position] of positions) {
      point
        .set(position[0], miniature.labelHeight, position[2])
        .project(camera);
      const label = labels.get(id);
      if (label)
        label.style.transform = `translate(${((point.x + 1) * size.width) / 2}px, ${((-point.y + 1) * size.height) / 2}px) translate(-50%, -100%)`;
    }
    const values = times.current;
    values.push(delta * 1000);
    if (values.length > 1800) values.shift();
    if (cueKind) {
      activeTimes.current.push(delta * 1000);
      if (activeTimes.current.length > 1800) activeTimes.current.shift();
      activeKinds.current.add(cueKind);
    }
    if (++frameCount.current % 60 === 0) {
      window.__battleSceneMetrics = {
        ...frameSample(values),
        playback: {
          ...frameSample(activeTimes.current),
          kinds: [...activeKinds.current],
        },
        calls: gl.info.render.calls,
        triangles: gl.info.render.triangles,
        geometries: gl.info.memory.geometries,
        textures: gl.info.memory.textures,
      };
    }
  });
  return null;
}

function Diorama({
  onFailure,
  labels,
  onAssetStatus,
  ...props
}: Props & {
  labels: Map<string, HTMLDivElement>;
  onAssetStatus: (status: string) => void;
}) {
  const { asset, error } = useMiniatureAsset();
  const positions = useMemo(
    () => formation(props.participants),
    [props.participants],
  );
  useEffect(() => {
    onAssetStatus(
      error
        ? "Model unavailable · using simple miniatures"
        : !asset
          ? "Loading miniatures…"
          : Object.values(miniature.clips).some(
                (name) =>
                  !asset.animations.some(
                    (clip) => clip.name === name && clip.duration > 0,
                  ),
              )
            ? "Animation unavailable · impact markers remain active"
            : "",
    );
    if (asset) performance.mark("battle-model-ready");
  }, [asset, error, onAssetStatus]);
  if (sceneFault === "graphics")
    throw new Error("Development graphics failure check");
  return (
    <>
      <CameraAndMetrics
        positions={positions}
        labels={labels}
        onFailure={onFailure}
        cueKind={props.speed > 0 ? props.cue?.kind : undefined}
      />
      <color attach="background" args={["#11191a"]} />
      <fog attach="fog" args={["#11191a", 19, 37]} />
      <ambientLight intensity={1.2} color="#ccd5c7" />
      <directionalLight
        position={[-4, 10, 5]}
        intensity={3}
        color="#ffe2b0"
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-9}
        shadow-camera-right={9}
        shadow-camera-top={8}
        shadow-camera-bottom={-8}
        shadow-bias={-0.001}
      />
      <directionalLight position={[5, 5, -5]} intensity={2} color="#71b5be" />
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.18, 0]}
        receiveShadow
      >
        <planeGeometry args={[200, 200]} />
        <meshStandardMaterial color="#141c1d" roughness={1} />
      </mesh>
      <mesh position={[0, -0.12, 0]} receiveShadow>
        <boxGeometry args={[14.6, 0.3, 9.2]} />
        <meshStandardMaterial color="#303a38" roughness={1} />
      </mesh>
      {Array.from({ length: 28 }, (_, i) => (
        <mesh
          key={i}
          position={[-6 + (i % 7) * 2, 0.045, -3 + Math.floor(i / 7) * 2]}
          receiveShadow
        >
          <boxGeometry args={[1.97, 0.05, 1.97]} />
          <meshStandardMaterial
            color={i % 3 === 0 ? "#37413d" : "#323b38"}
            roughness={1}
          />
        </mesh>
      ))}
      {[-1, 1].flatMap((side) =>
        [-1, 1].map((end) => (
          <group key={`${side}:${end}`} position={[side * 6.8, 0, end * 4.2]}>
            <mesh position={[0, 0.35, 0]} castShadow>
              <boxGeometry args={[0.65, 0.7, 0.65]} />
              <meshStandardMaterial color="#464740" />
            </mesh>
            <mesh position={[0, 0.92, 0]}>
              <octahedronGeometry args={[0.18]} />
              <meshStandardMaterial
                color="#edba6d"
                emissive="#db8f32"
                emissiveIntensity={1.5}
              />
            </mesh>
          </group>
        )),
      )}
      {props.participants.map((entity) => (
        <Actor
          key={entity.id}
          {...props}
          entity={entity}
          position={positions.get(entity.id)!}
          asset={asset}
        />
      ))}
    </>
  );
}

function Actor({
  entity,
  position,
  asset,
  ...props
}: Omit<Props, "onFailure"> & {
  entity: Entity;
  position: [number, number, number];
  asset: ReturnType<typeof useMiniatureAsset>["asset"];
}) {
  const root = useRef<Group>(null);
  const stats = props.stats.get(entity.id);
  const dead = stats?.flags.dead;
  const selected = props.selected.includes(entity.id);
  const legal = props.legal.includes(entity.id) && !dead;
  const active = props.activeId === entity.id;
  const hit = props.impact && props.cue?.targetIds.includes(entity.id);
  const casting =
    props.cue?.casterId === entity.id && props.cue.kind === "SPELL_CAST";
  const action = dead
    ? "death"
    : casting
      ? "attack"
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
    elapsed.current += delta * props.speed;
    if (!root.current) return;
    root.current.position.x =
      !props.reducedMotion && casting
        ? Math.sin(Math.min(elapsed.current, 1) * Math.PI) *
          (entity.team === "TEAM_A" ? 0.4 : -0.4)
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
        <mesh position={[0, 3.2, 0]} rotation={[0, 0, Math.PI]}>
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
      {hit && (
        <mesh position={[0, 1.2, 0]}>
          <sphereGeometry args={[0.9, 12, 8]} />
          <meshBasicMaterial
            color={(stats?.deltaHealth ?? 0) > 0 ? "#82d6af" : "#f0ac77"}
            wireframe
            transparent
            opacity={0.45}
          />
        </mesh>
      )}
      <group
        ref={root}
        rotation={[
          0,
          entity.team === "TEAM_A" ? miniature.facing : -miniature.facing,
          0,
        ]}
        position={[0, 0.2, 0]}
      >
        {asset ? (
          <Miniature
            asset={asset}
            action={action}
            cueKey={dead ? "death" : casting || hit ? props.cueKey : action}
            speed={props.speed}
            reducedMotion={props.reducedMotion}
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

export default function BattleScene(props: Props) {
  const labels = useRef(new Map<string, HTMLDivElement>());
  const [assetStatus, setAssetStatus] = useState("Loading miniatures…");
  return (
    <div className="battle-canvas-wrap">
      <GraphicsBoundary onFailure={props.onFailure}>
        <Canvas
          orthographic
          shadows={{ type: PCFShadowMap }}
          dpr={[1, 1.5]}
          camera={{ position: [0, 11, 13], near: 0.1, far: 100, zoom: 50 }}
          fallback={<p>WebGL is unavailable. Use Cards to continue.</p>}
        >
          <Diorama
            {...props}
            labels={labels.current}
            onAssetStatus={setAssetStatus}
          />
        </Canvas>
      </GraphicsBoundary>
      <div className="battle-label-layer">
        {props.participants.map((entity) => {
          const stats = props.stats.get(entity.id);
          const marker = stats?.flags.dead
            ? "✕ Fallen"
            : props.selected.includes(entity.id)
              ? "◎ Selected"
              : props.activeId === entity.id
                ? "◆ Acting"
                : props.legal.includes(entity.id)
                  ? "◇ Legal target"
                  : entity.team === "TEAM_A"
                    ? "I Party"
                    : "II Enemy";
          return (
            <div
              className="battle-actor-label"
              key={entity.id}
              ref={(node) => {
                if (node) labels.current.set(entity.id, node);
                else labels.current.delete(entity.id);
              }}
              data-entity-label={entity.id}
            >
              <span>{marker}</span>
              <strong>{entityLabel(entity, props.participants)}</strong>
              <div>
                <i
                  style={{
                    width: `${Math.max(0, (stats?.health ?? 0) / entity.maxHealth) * 100}%`,
                  }}
                />
              </div>
              <small>
                {stats?.health ?? 0} / {entity.maxHealth} HP
                {stats?.activeEffects.length
                  ? ` · ✦ ${stats.activeEffects.length}`
                  : ""}
              </small>
              {props.impact && stats?.deltaHealth ? (
                <b
                  className={stats.deltaHealth > 0 ? "is-healing" : "is-damage"}
                >
                  {stats.deltaHealth > 0 ? "+" : ""}
                  {stats.deltaHealth}
                </b>
              ) : null}
            </div>
          );
        })}
      </div>
      {assetStatus && (
        <p className="battle-asset-notice" role="status">
          {assetStatus}
        </p>
      )}
    </div>
  );
}
