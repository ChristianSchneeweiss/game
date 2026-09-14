import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  Component,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { PCFShadowMap, Vector3 } from "three";
import type { Entity } from "@loot-game/game/entity-types";
import type { Stats, VisualCue } from "./timeline";
import { useMiniatureAssets } from "./miniature";
import { miniatureFor, sceneFault } from "./visual-manifest";
import { ActionFeedback } from "./action-feedback";
import type { TimelineEventFull } from "@loot-game/game/timeline-events";
import { BattleEnvironment } from "./battle-environment";
import { encounterFor } from "./encounter-presentation";
import { appearanceFor } from "./miniature-appearance";
import { BattleActor } from "./battle-actor";
import { BattleLabels } from "./battle-labels";
import type { ConditionDetail } from "./battle-effects";
import type { GridState } from "@loot-game/game/tactical/types";
import type { BattleSession } from "../-hooks/use-battle";
import { TacticalArena } from "./tactical-arena";
import { gridCameraZoom, tileToWorld } from "./tactical-presentation";

type Props = {
  grid?: GridState;
  tactical?: BattleSession["tactical"];
  participants: Entity[];
  stats: Map<string, Stats>;
  conditions: Map<string, ConditionDetail>;
  durationMs: number;
  activeId?: string;
  selected: string[];
  legal: string[];
  inspected?: string;
  onPick: (id: string) => void;
  cue?: VisualCue;
  resolvedEvent?: TimelineEventFull["event"];
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
          ? [-7 + i * 3.15, 0, members.length === 1 ? 0 : (i - 0.5) * 4.4]
          : [
              (i % 2) * 6.3 + Math.floor(i / 2) * 3.15,
              0,
              members.length <= 2
                ? (i - (members.length - 1) / 2) * 3.5
                : (Math.floor(i / 2) - 0.5) * 4.4,
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
  participants,
  grid,
}: {
  positions: Map<string, [number, number, number]>;
  labels: Map<string, HTMLDivElement>;
  onFailure: () => void;
  cueKind?: string;
  participants: Entity[];
  grid?: GridState;
}) {
  const { camera, size, gl } = useThree();
  const times = useRef<number[]>([]);
  const activeTimes = useRef<number[]>([]);
  const activeKinds = useRef(new Set<string>());
  const frameCount = useRef(0);
  const point = useMemo(() => new Vector3(), []);
  const labelHeights = useMemo(
    () =>
      new Map(
        participants.map((entity) => [
          entity.id,
          miniatureFor(entity).labelHeight,
        ]),
      ),
    [participants],
  );
  useEffect(() => {
    gl.domElement.addEventListener("webglcontextlost", onFailure);
    return () =>
      gl.domElement.removeEventListener("webglcontextlost", onFailure);
  }, [gl, onFailure]);
  useEffect(() => {
    if ("zoom" in camera) {
      camera.zoom = grid
        ? gridCameraZoom(
            grid.battlefield.width,
            grid.battlefield.height,
            size.width,
            size.height,
          )
        : Math.min(size.width / 24, size.height / 9.3);
      camera.position.set(grid ? 0 : 1.4, grid ? 19 : 9.5, grid ? 18 : 15);
      camera.lookAt(grid ? 0 : 1.4, grid ? 0 : 1.65, 0);
      camera.updateProjectionMatrix();
    }
  }, [camera, size, grid?.battlefield.width, grid?.battlefield.height]);
  useFrame((_, delta) => {
    for (const [id, position] of positions) {
      point
        .set(position[0], labelHeights.get(id) ?? 2.6, position[2])
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
  const definitions = useMemo(
    () => props.participants.map(miniatureFor),
    [props.participants],
  );
  const assets = useMiniatureAssets(
    definitions.map((definition) => definition.url),
  );
  const positions = useMemo(
    () =>
      props.grid
        ? new Map(
            props.participants.map((entity) => [
              entity.id,
              tileToWorld(
                props.grid!.positions[entity.id],
                props.grid!.battlefield,
              ),
            ]),
          )
        : formation(props.participants),
    [props.participants, props.grid],
  );
  const moveElapsed = useRef(0);
  useEffect(() => {
    moveElapsed.current = 0;
  }, [props.cueKey]);
  useFrame((_, delta) => {
    if (
      !props.grid ||
      props.cue?.kind !== "MOVE" ||
      !props.cue.casterId ||
      !props.cue.path?.length ||
      props.reducedMotion
    )
      return;
    moveElapsed.current +=
      (Math.min(delta, 0.1) * props.speed * 1000) / props.durationMs;
    const route = props.cue.path;
    const fraction = Math.min(1, moveElapsed.current) * (route.length - 1);
    const segment = Math.min(route.length - 1, Math.floor(fraction));
    const start = tileToWorld(route[segment], props.grid.battlefield);
    const end = tileToWorld(
      route[Math.min(segment + 1, route.length - 1)],
      props.grid.battlefield,
    );
    const position = positions.get(props.cue.casterId);
    if (position) {
      position[0] = start[0] + (end[0] - start[0]) * (fraction - segment);
      position[2] = start[2] + (end[2] - start[2]) * (fraction - segment);
    }
  });
  useEffect(() => {
    const failed = new Set<string>();
    let loading = false;
    let missingClip = false;
    for (const definition of definitions) {
      const result = assets.get(definition.url);
      if (result?.error) failed.add(definition.name);
      else if (!result?.asset) loading = true;
      else {
        const clips = new Set<string>();
        for (const clip of result.asset.animations)
          if (clip.duration > 0) clips.add(clip.name);
        missingClip ||= Object.values(definition.clips).some(
          (name) => name !== null && !clips.has(name),
        );
      }
    }
    onAssetStatus(
      failed.size
        ? `${[...failed].join(", ")} unavailable · simple miniature fallback`
        : loading
          ? "Loading miniatures…"
          : missingClip
            ? "Animation unavailable · impact markers remain active"
            : "",
    );
    if (!loading && !failed.size) performance.mark("battle-model-ready");
  }, [assets, definitions, onAssetStatus]);
  if (sceneFault === "graphics")
    throw new Error("Development graphics failure check");
  return (
    <>
      <CameraAndMetrics
        grid={props.grid}
        positions={positions}
        participants={props.participants}
        labels={labels}
        onFailure={onFailure}
        cueKind={props.speed > 0 ? props.cue?.kind : undefined}
      />
      {props.grid ? (
        <TacticalArena
          grid={props.grid}
          tactical={props.tactical}
          footprint={props.cue?.tiles}
          encounter={encounterFor(props.participants).id}
        />
      ) : (
        <BattleEnvironment
          encounter={encounterFor(props.participants)}
          reducedMotion={props.reducedMotion}
          speed={props.speed}
        />
      )}
      {props.participants.map((entity) => (
        <BattleActor
          key={entity.id}
          {...props}
          entity={entity}
          stats={props.stats.get(entity.id)}
          selected={props.selected.includes(entity.id)}
          legal={props.legal.includes(entity.id)}
          active={props.activeId === entity.id}
          // Movement planning picks the ground through the miniature's tall hitbox.
          onPick={
            props.tactical &&
            (!props.tactical.targeting ||
              (props.tactical.spellGuidance?.castPositions.length ?? 0) > 0) &&
            props.tactical.reachable.length > 0
              ? undefined
              : props.onPick
          }
          appearance={appearanceFor(entity, props.participants)}
          position={positions.get(entity.id)!}
          asset={assets.get(miniatureFor(entity).url)?.asset}
        />
      ))}
      <ActionFeedback
        event={props.resolvedEvent}
        cue={props.cue}
        cueKey={props.cueKey}
        positions={positions}
        durationMs={props.durationMs}
        impact={props.impact}
        speed={props.speed}
        reducedMotion={props.reducedMotion}
      />
    </>
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
          camera={{ position: [0.4, 8.5, 15], near: 0.1, far: 100, zoom: 50 }}
          fallback={<p>WebGL is unavailable. Use Cards to continue.</p>}
        >
          <Diorama
            {...props}
            labels={labels.current}
            onAssetStatus={setAssetStatus}
          />
        </Canvas>
      </GraphicsBoundary>
      <BattleLabels {...props} labels={labels.current} />
      {assetStatus && (
        <p className="battle-asset-notice" role="status">
          {assetStatus}
        </p>
      )}
    </div>
  );
}
