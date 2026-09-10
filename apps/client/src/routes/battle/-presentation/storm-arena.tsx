import {
  ArenaLighting,
  ArenaScatter,
  DriftingMotes,
  type ArenaMotion,
  type Placement,
} from "./arena-primitives";

const cliff: Placement[] = [];
const paving: Placement[] = [];
const shards: Placement[] = [];
for (let i = 0; i < 32; i++) {
  const a = (i / 32) * Math.PI * 2;
  cliff.push({
    position: [1.4 + Math.cos(a) * 11.6, -1, Math.sin(a) * 5.2],
    scale: [1.1, 1.2 + (i % 3) * 0.2, 0.8],
    rotation: [0, a, 0.06],
    color: ["#3f4c60", "#4d5e73", "#334256"][i % 3],
  });
}
for (let i = 0; i < 32; i++)
  paving.push({
    position: [-8.6 + (i % 8) * 2.85, -0.03, -3.35 + Math.floor(i / 8) * 2.2],
    scale: [2.75, 0.11, 2.1],
    color: ["#62718a", "#536780", "#5e6e83"][i % 3],
  });
for (const [i, x] of [-9.4, -3.7, 6.2, 12.1].entries())
  shards.push({
    position: [x, 1.35 + (i % 2) * 0.3, -5.3],
    scale: [0.42, 1.75 + (i % 2) * 0.4, 0.4],
    rotation: [0, i, 0.12],
    color: "#9ab8d8",
  });
export function StormArena(props: ArenaMotion) {
  return (
    <>
      <ArenaLighting
        background="#202c42"
        keyColor="#dfdfde"
        rimColor="#91bafa"
        ambientColor="#bfd0e9"
      />
      <mesh position={[1.4, -0.3, 0]} receiveShadow>
        <boxGeometry args={[23.4, 0.45, 10.6]} />
        <meshStandardMaterial color="#526680" roughness={1} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2.5, 0]}>
        <planeGeometry args={[150, 150]} />
        <meshStandardMaterial color="#35435b" roughness={1} />
      </mesh>
      <ArenaScatter shape="rock" placements={cliff} />
      <ArenaScatter shape="box" placements={paving} />
      <ArenaScatter shape="rock" placements={shards} emissive="#6f90bd" />
      {[-10.1, 11.8].map((x) => (
        <group key={x} position={[x, 0, -4.8]}>
          <mesh position={[0, 1.5, 0]}>
            <boxGeometry args={[0.75, 3, 0.8]} />
            <meshStandardMaterial color="#61738a" roughness={1} />
          </mesh>
          <mesh
            position={[x < 0 ? 1 : -1, 3, 0]}
            rotation={[0, 0, x < 0 ? -0.18 : 0.18]}
          >
            <boxGeometry args={[2.8, 0.5, 0.9]} />
            <meshStandardMaterial color="#708198" roughness={1} />
          </mesh>
        </group>
      ))}
      {[1.5, 2.25, 3].map((radius) => (
        <mesh
          key={radius}
          rotation={[-Math.PI / 2, 0, Math.PI / 4]}
          position={[1.4, 0.05, 0]}
        >
          <ringGeometry args={[radius, radius + 0.024, 4]} />
          <meshBasicMaterial
            color="#9fc4ec"
            transparent
            opacity={0.3}
            depthWrite={false}
          />
        </mesh>
      ))}
      <DriftingMotes {...props} color="#d7e6f5" />
    </>
  );
}
