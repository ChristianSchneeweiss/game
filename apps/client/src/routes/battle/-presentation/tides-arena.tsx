import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Group } from "three";
import {
  ArenaLighting,
  ArenaScatter,
  DriftingMotes,
  type ArenaMotion,
  type Placement,
} from "./arena-primitives";

const paving: Placement[] = [];
const coral: Placement[] = [];
const columns: Placement[] = [];
for (let i = 0; i < 30; i++)
  paving.push({
    position: [-8.9 + (i % 10) * 2.24, -0.03, -2.9 + Math.floor(i / 10) * 2.9],
    scale: [1.12, 0.09, 1.35],
    rotation: [0, (i % 2) * 0.15, 0],
    color: ["#a29d83", "#87988b", "#929a85"][i % 3],
  });
for (const [i, x] of [-10.2, -2.5, 5.3, 12.2].entries()) {
  columns.push({
    position: [x, 0.95, -5.4],
    scale: [0.58, 2.7, 0.58],
    color: "#7c9c97",
  });
  columns.push({
    position: [x, 2.32, -5.4],
    scale: [1.4, 0.3, 1.4],
    color: "#92aaa0",
  });
  for (let branch = 0; branch < 3; branch++)
    coral.push({
      position: [
        x + Math.sin(branch * 2) * 0.45,
        0.7 + branch * 0.16,
        i % 2 ? 4.8 : -4.6,
      ],
      scale: [0.13, 1.4, 0.14],
      rotation: [0, 0, (branch - 1) * 0.65],
      color: i % 2 ? "#ca9580" : "#9bbaa7",
    });
}
function Waterline({ reducedMotion, speed }: ArenaMotion) {
  const water = useRef<Group>(null);
  const time = useRef(0);
  useFrame((_, delta) => {
    if (reducedMotion || !water.current) return;
    time.current += Math.min(delta, 0.1) * speed;
    water.current.position.y = -0.27 + Math.sin(time.current * 0.4) * 0.015;
  });
  return (
    <group ref={water} position={[1.4, -0.27, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[150, 150]} />
        <meshStandardMaterial
          color="#284e58"
          roughness={0.45}
          metalness={0.15}
        />
      </mesh>
      {[1, 1.12, 1.24].map((scale) => (
        <mesh
          key={scale}
          scale={[12.6 * scale, 5.1 * scale, 1]}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, 0.02, 0]}
        >
          <ringGeometry args={[0.99, 1, 64]} />
          <meshBasicMaterial
            color="#a4cfcd"
            transparent
            opacity={0.18}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  );
}
export function TidesArena(props: ArenaMotion) {
  return (
    <>
      <ArenaLighting
        background="#1c3339"
        keyColor="#f0e2c4"
        rimColor="#8bcbd1"
        ambientColor="#c0d7d4"
      />
      <Waterline {...props} />
      <mesh position={[1.4, -0.35, 0]} scale={[11.8, 1, 4.9]} receiveShadow>
        <cylinderGeometry args={[1, 1.06, 0.62, 12]} />
        <meshStandardMaterial color="#637f77" roughness={1} />
      </mesh>
      <ArenaScatter shape="rock" placements={paving} />
      <ArenaScatter shape="box" placements={columns} />
      <ArenaScatter shape="wood" placements={coral} />
      <mesh position={[1.4, 2.8, -5.4]}>
        <boxGeometry args={[8.4, 0.5, 1.2]} />
        <meshStandardMaterial color="#799b94" roughness={1} />
      </mesh>
      <mesh position={[1.4, 3.38, -5.4]} scale={[0.35, 0.65, 0.25]}>
        <octahedronGeometry />
        <meshStandardMaterial
          color="#bcd9c7"
          emissive="#87c4b9"
          emissiveIntensity={0.4}
        />
      </mesh>
      <DriftingMotes {...props} color="#c9e5de" />
    </>
  );
}
