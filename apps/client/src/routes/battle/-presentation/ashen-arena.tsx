import {
  ArenaLighting,
  ArenaScatter,
  DriftingMotes,
  type ArenaMotion,
  type Placement,
} from "./arena-primitives";

const slabs: Placement[] = [];
const columns: Placement[] = [];
const embers: Placement[] = [];
for (let i = 0; i < 44; i++) {
  const x = -9.3 + (i % 11) * 2.14;
  const z = -3.45 + Math.floor(i / 11) * 2.3;
  slabs.push({
    position: [x + Math.sin(i * 3) * 0.05, -0.03, z],
    scale: [2.02, 0.16 + (i % 3) * 0.015, 2.13],
    rotation: [0, Math.sin(i) * 0.025, 0],
    color: ["#444047", "#51494a", "#393a40"][i % 3],
  });
}
for (let i = 0; i < 13; i++) {
  const height = 2.1 + ((i * 7) % 5) * 0.72;
  columns.push({
    position: [-11 + i * 2.1, height / 2 - 0.55, -6.3 - Math.sin(i) * 0.3],
    scale: [0.7, height, 0.75],
    rotation: [0, i * 0.6, 0],
    color: ["#302f37", "#403a40", "#514044"][i % 3],
  });
}
for (let i = 0; i < 20; i++) {
  const angle = (i / 20) * Math.PI * 2;
  embers.push({
    position: [1.4 + Math.cos(angle) * 11.5, -0.18, Math.sin(angle) * 4.7],
    scale: [0.3, 0.11, 0.25],
    color: "#d7773a",
  });
}
export function AshenArena(props: ArenaMotion) {
  return (
    <>
      <ArenaLighting
        background="#21191e"
        keyColor="#f1d4b3"
        rimColor="#df8c60"
        ambientColor="#c9b6bd"
      />
      <mesh position={[1.4, -0.4, 0]} receiveShadow>
        <boxGeometry args={[23.6, 0.65, 9.8]} />
        <meshStandardMaterial
          color="#713e30"
          emissive="#6b2e1c"
          emissiveIntensity={0.3}
          roughness={1}
        />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.85, 0]}>
        <planeGeometry args={[120, 120]} />
        <meshStandardMaterial color="#2e1e20" roughness={1} />
      </mesh>
      <ArenaScatter shape="box" placements={slabs} />
      <ArenaScatter shape="wood" placements={columns} />
      <ArenaScatter shape="rock" placements={embers} emissive="#da6330" />
      {[-9.7, 12.2].map((x) => (
        <group key={x} position={[x, 0, -3.7]}>
          <mesh position={[0, 0.45, 0]}>
            <cylinderGeometry args={[0.7, 0.42, 0.9, 6]} />
            <meshStandardMaterial color="#5c4d49" roughness={1} />
          </mesh>
          <mesh position={[0, 1.2, 0]} scale={[0.36, 0.7, 0.36]}>
            <octahedronGeometry />
            <meshStandardMaterial
              color="#e8a25a"
              emissive="#d56c2b"
              emissiveIntensity={0.8}
            />
          </mesh>
        </group>
      ))}
      <DriftingMotes {...props} color="#efb575" rising />
    </>
  );
}
