import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Points } from "three";

import { ArenaScatter as Scatter, type Placement } from "./arena-primitives";

const trunks: Placement[] = [];
const crowns: Placement[] = [];
const stones: Placement[] = [];
const plants: Placement[] = [];
// Deliberate, stable scenery. Every tall silhouette is outside the fighting area.
const treeSites = [
  [-10.4, -3.8, 4.4],
  [-7.8, -6.5, 4.8],
  [-2.2, -7.2, 5.5],
  [4.5, -7, 4.8],
  [10.3, -6, 5.3],
  [13, -2.7, 4.5],
];
for (const [index, [x, z, height]] of treeSites.entries()) {
  trunks.push({
    position: [x, height / 2 - 0.15, z],
    scale: [0.38, height, 0.44],
    rotation: [0, index, index % 2 ? 0.08 : -0.07],
    color: index % 2 ? "#333d30" : "#474936",
  });
  for (let arm = 0; arm < 3; arm++) {
    const angle = arm * 2.1 + index;
    trunks.push({
      position: [
        x + Math.cos(angle) * 0.55,
        height * 0.77,
        z + Math.sin(angle) * 0.45,
      ],
      scale: [0.15, 1.8, 0.17],
      rotation: [Math.sin(angle) * 0.8, 0, Math.cos(angle) * 0.8],
      color: "#3b4431",
    });
    crowns.push({
      position: [
        x + Math.cos(angle) * 1.05,
        height + 0.25 + arm * 0.15,
        z + Math.sin(angle) * 0.75,
      ],
      scale: [2.15, 1.15, 1.65],
      rotation: [0.15, index + arm, 0.1],
      color: ["#233e30", "#2e4c34", "#36533a"][arm],
    });
    trunks.push({
      position: [x + Math.cos(angle) * 0.75, 0.09, z + Math.sin(angle) * 0.8],
      scale: [0.16, 2.3, 0.19],
      rotation: [Math.PI / 2, 0, -angle],
      color: "#565a3c",
    });
  }
}
for (let index = 0; index < 46; index++) {
  const angle = (index / 46) * Math.PI * 2;
  stones.push({
    position: [1.4 + Math.cos(angle) * 11.4, -0.13, Math.sin(angle) * 5.1],
    scale: [0.62 + (index % 3) * 0.1, 0.35 + (index % 4) * 0.08, 0.46],
    rotation: [0, angle, 0.12],
    color: index % 3 ? "#465340" : "#647058",
  });
  if (index % 2 === 0) {
    const x = 1.4 + Math.cos(angle) * 10.8;
    const z = Math.sin(angle) * 4.9;
    for (let blade = 0; blade < 3; blade++)
      plants.push({
        position: [x + blade * 0.16, 0.19, z],
        scale: [0.18, 0.55 + blade * 0.16, 0.13],
        rotation: [0.25 * (blade - 1), angle, 0.24 * (blade - 1)],
        color: ["#697b43", "#4e733f", "#8a8c4d"][blade],
      });
  }
}
const pathStones: Placement[] = Array.from({ length: 30 }, (_, index) => ({
  position: [
    -8.3 + (index % 10) * 2.15,
    -0.045,
    -2.9 + Math.floor(index / 10) * 2.75 + Math.sin(index * 2) * 0.22,
  ],
  scale: [1.05 + (index % 3) * 0.12, 0.07, 0.65],
  rotation: [0, index * 1.7, 0],
  color: ["#57634c", "#4e5c46", "#667159"][index % 3],
}));

function Fireflies({
  reducedMotion,
  speed,
}: {
  reducedMotion: boolean;
  speed: number;
}) {
  const cloud = useRef<Points>(null);
  const time = useRef(0);
  const positions = useMemo(
    () =>
      new Float32Array(
        Array.from({ length: 32 }, (_, index) => [
          1.4 + Math.sin(index * 2.39) * 10.6,
          0.5 + (index % 7) * 0.39,
          -3.7 + Math.cos(index * 4.2) * 1.1,
        ]).flat(),
      ),
    [],
  );
  useFrame((_, delta) => {
    if (reducedMotion || !cloud.current) return;
    time.current += Math.min(delta, 0.1) * speed;
    cloud.current.position.y = Math.sin(time.current * 0.45) * 0.12;
  });
  return (
    <points ref={cloud}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        color="#e1ce88"
        size={0.065}
        transparent
        opacity={0.7}
        depthWrite={false}
      />
    </points>
  );
}

export function ForestArena({
  reducedMotion,
  speed,
}: {
  reducedMotion: boolean;
  speed: number;
}) {
  return (
    <>
      <color attach="background" args={["#101c18"]} />
      <fog attach="fog" args={["#101c18", 19, 37]} />
      <ambientLight intensity={1.3} color="#bcd5c9" />
      <directionalLight
        position={[-4, 10, 6]}
        intensity={2.7}
        color="#f0dfb0"
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-14}
        shadow-camera-right={15}
        shadow-camera-top={11}
        shadow-camera-bottom={-9}
        shadow-bias={-0.001}
      />
      <directionalLight position={[5, 7, -6]} intensity={2.1} color="#8ac9c0" />
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.68, 0]}
        receiveShadow
      >
        <planeGeometry args={[150, 150]} />
        <meshStandardMaterial color="#172820" roughness={1} />
      </mesh>
      <mesh position={[1.4, -0.34, 0]} scale={[11.6, 1, 5.25]} receiveShadow>
        <cylinderGeometry args={[1, 1.015, 0.6, 48]} />
        <meshStandardMaterial color="#354b35" roughness={1} flatShading />
      </mesh>
      <Scatter shape="wood" placements={trunks} />
      <Scatter shape="rock" placements={crowns} />
      <Scatter shape="rock" placements={stones} />
      <Scatter shape="rock" placements={pathStones} />
      <Scatter shape="leaf" placements={plants} />
      <mesh position={[1.4, 0.006, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[3.4, 3.44, 64]} />
        <meshBasicMaterial
          color="#92a775"
          transparent
          opacity={0.24}
          depthWrite={false}
        />
      </mesh>
      <Fireflies reducedMotion={reducedMotion} speed={speed} />
    </>
  );
}
