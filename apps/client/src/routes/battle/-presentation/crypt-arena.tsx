import {
  ArenaLighting,
  ArenaScatter,
  DriftingMotes,
  type ArenaMotion,
  type Placement,
} from "./arena-primitives";

const masonry: Placement[] = [];
const paving: Placement[] = [];
const rubble: Placement[] = [];
const archSites = [-8.8, -3.7, 1.4, 6.5, 11.6];
for (const [i, x] of archSites.entries()) {
  for (const side of [-1, 1]) {
    masonry.push({
      position: [x + side * 1.7, 1.55, -6],
      scale: [0.55, 3.2, 0.85],
      color: i % 2 ? "#41434d" : "#4c4b51",
    });
    masonry.push({
      position: [x + side * 1.7, 0.2, -6],
      scale: [0.9, 0.5, 1.1],
      color: "#62606a",
    });
    masonry.push({
      position: [x + side * 1.1, 3.4, -6],
      scale: [1.9, 0.5, 0.85],
      rotation: [0, 0, -side * 0.56],
      color: "#50515a",
    });
  }
}
for (let i = 0; i < 40; i++)
  paving.push({
    position: [-9 + (i % 10) * 2.3, -0.015, -3.55 + Math.floor(i / 10) * 2.35],
    scale: [2.23, 0.08, 2.26],
    rotation: [0, 0, 0],
    color: ["#45454b", "#4b4c52", "#3d4148"][i % 3],
  });
for (let i = 0; i < 24; i++)
  rubble.push({
    position: [-10.5 + (i % 12) * 2.1, 0.14, Math.floor(i / 12) ? 4.9 : -5.2],
    scale: [0.3 + (i % 3) * 0.12, 0.18 + (i % 4) * 0.08, 0.4],
    rotation: [0, i, 0.2],
    color: i % 2 ? "#62616a" : "#51515b",
  });

export function CryptArena(props: ArenaMotion) {
  return (
    <>
      <ArenaLighting
        background="#151720"
        keyColor="#e3ddd0"
        rimColor="#a5b6dd"
        ambientColor="#bbc0d3"
      />
      <mesh position={[1.4, -0.3, 0]} receiveShadow>
        <boxGeometry args={[23.4, 0.5, 9.6]} />
        <meshStandardMaterial color="#32343d" roughness={1} />
      </mesh>
      <mesh position={[1.4, 1.1, -6.5]}>
        <boxGeometry args={[26, 3.2, 0.8]} />
        <meshStandardMaterial color="#262936" roughness={1} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.8, 0]}>
        <planeGeometry args={[120, 120]} />
        <meshStandardMaterial color="#141720" />
      </mesh>
      <ArenaScatter shape="box" placements={masonry} />
      <ArenaScatter shape="box" placements={paving} />
      <ArenaScatter shape="rock" placements={rubble} />
      {archSites.map((x) => (
        <group key={x} position={[x, 0, -5.85]}>
          <mesh position={[0, 1.65, 0]}>
            <boxGeometry args={[1.8, 2.9, 0.08]} />
            <meshStandardMaterial color="#171d2c" roughness={1} />
          </mesh>
          <mesh position={[0, 0.23, 0.6]}>
            <cylinderGeometry args={[0.36, 0.47, 0.45, 6]} />
            <meshStandardMaterial color="#6c6874" />
          </mesh>
          <mesh position={[0, 0.65, 0.6]} scale={[0.19, 0.38, 0.19]}>
            <octahedronGeometry />
            <meshStandardMaterial
              color="#a0d3d0"
              emissive="#75b6c0"
              emissiveIntensity={0.9}
            />
          </mesh>
        </group>
      ))}
      <mesh rotation={[-Math.PI / 2, 0, Math.PI / 4]} position={[1.4, 0.04, 0]}>
        <ringGeometry args={[2.55, 2.59, 4]} />
        <meshBasicMaterial
          color="#afb3ce"
          transparent
          opacity={0.2}
          depthWrite={false}
        />
      </mesh>
      <DriftingMotes {...props} color="#b3c9d5" />
    </>
  );
}
