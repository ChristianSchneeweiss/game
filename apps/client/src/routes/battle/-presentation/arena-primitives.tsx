import { useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Color, InstancedMesh, Object3D, Points } from "three";

export type Placement = {
  position: [number, number, number];
  scale: [number, number, number];
  rotation?: [number, number, number];
  color: string;
};
export type ArenaMotion = { reducedMotion: boolean; speed: number };

/** Immutable scenery transforms are uploaded once, with one draw per material. */
export function ArenaScatter({
  shape,
  placements,
  emissive,
}: {
  shape: "rock" | "wood" | "leaf" | "box";
  placements: Placement[];
  emissive?: string;
}) {
  const mesh = useRef<InstancedMesh>(null);
  useLayoutEffect(() => {
    const transform = new Object3D();
    const color = new Color();
    placements.forEach((item, index) => {
      transform.position.set(...item.position);
      transform.scale.set(...item.scale);
      transform.rotation.set(...(item.rotation ?? [0, 0, 0]));
      transform.updateMatrix();
      mesh.current!.setMatrixAt(index, transform.matrix);
      mesh.current!.setColorAt(index, color.set(item.color));
    });
    mesh.current!.instanceMatrix.needsUpdate = true;
    if (mesh.current!.instanceColor)
      mesh.current!.instanceColor.needsUpdate = true;
    mesh.current!.computeBoundingSphere();
  }, [placements]);
  return (
    <instancedMesh
      ref={mesh}
      args={[undefined, undefined, placements.length]}
      castShadow={!emissive}
      receiveShadow
    >
      {shape === "wood" ? (
        <cylinderGeometry args={[0.75, 1, 1, 6]} />
      ) : shape === "leaf" ? (
        <coneGeometry args={[1, 1, 4]} />
      ) : shape === "box" ? (
        <boxGeometry />
      ) : (
        <icosahedronGeometry args={[1, 0]} />
      )}
      <meshStandardMaterial
        roughness={1}
        flatShading
        emissive={emissive ?? "#000000"}
        emissiveIntensity={emissive ? 0.6 : 0}
      />
    </instancedMesh>
  );
}

export function ArenaLighting({
  background,
  keyColor,
  rimColor,
  ambientColor,
}: {
  background: string;
  keyColor: string;
  rimColor: string;
  ambientColor: string;
}) {
  return (
    <>
      <color attach="background" args={[background]} />
      <fog attach="fog" args={[background, 20, 42]} />
      <ambientLight intensity={1.5} color={ambientColor} />
      <directionalLight
        position={[-4, 10, 7]}
        intensity={2.7}
        color={keyColor}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-14}
        shadow-camera-right={15}
        shadow-camera-top={11}
        shadow-camera-bottom={-9}
        shadow-bias={-0.001}
      />
      <directionalLight
        position={[5, 7, -6]}
        intensity={2.1}
        color={rimColor}
      />
    </>
  );
}

export function DriftingMotes({
  reducedMotion,
  speed,
  color,
  rising = false,
}: ArenaMotion & { color: string; rising?: boolean }) {
  const cloud = useRef<Points>(null);
  const time = useRef(0);
  const positions = useMemo(
    () =>
      new Float32Array(
        Array.from({ length: 28 }, (_, index) => [
          1.4 + Math.sin(index * 2.39) * 10.6,
          0.5 + (index % 7) * 0.39,
          -4.5 + Math.cos(index * 4.2) * 1.1,
        ]).flat(),
      ),
    [],
  );
  useFrame((_, delta) => {
    if (reducedMotion || !cloud.current) return;
    time.current += Math.min(delta, 0.1) * speed;
    cloud.current.position.y =
      Math.sin(time.current * 0.4) * (rising ? 0.45 : 0.12);
    cloud.current.position.x =
      Math.sin(time.current * 0.25) * (rising ? 0.15 : 0.45);
  });
  return (
    <points ref={cloud}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        color={color}
        size={rising ? 0.055 : 0.04}
        transparent
        opacity={0.6}
        depthWrite={false}
      />
    </points>
  );
}
