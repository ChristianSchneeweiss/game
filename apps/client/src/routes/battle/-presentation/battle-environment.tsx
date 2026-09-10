import { CryptArena } from "./crypt-arena";
import { AshenArena } from "./ashen-arena";
import { StormArena } from "./storm-arena";
import { TidesArena } from "./tides-arena";
import { ForestArena } from "./forest-arena";
import type { EncounterPresentation } from "./encounter-presentation";

export function BattleEnvironment({
  encounter,
  reducedMotion,
  speed,
}: {
  encounter: EncounterPresentation;
  reducedMotion: boolean;
  speed: number;
}) {
  if (encounter.id === "forest")
    return <ForestArena reducedMotion={reducedMotion} speed={speed} />;
  if (encounter.id === "crypt")
    return <CryptArena reducedMotion={reducedMotion} speed={speed} />;
  if (encounter.id === "ashen")
    return <AshenArena reducedMotion={reducedMotion} speed={speed} />;
  if (encounter.id === "storm")
    return <StormArena reducedMotion={reducedMotion} speed={speed} />;
  if (encounter.id === "tides")
    return <TidesArena reducedMotion={reducedMotion} speed={speed} />;
  return (
    <>
      <color attach="background" args={["#11191a"]} />
      <fog attach="fog" args={["#11191a", 19, 37]} />
      <ambientLight intensity={1.5} color="#c7d4e0" />
      <directionalLight
        position={[-3, 9, 8]}
        intensity={2.7}
        color="#ffe2b0"
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-12}
        shadow-camera-right={13}
        shadow-camera-top={8}
        shadow-camera-bottom={-8}
        shadow-bias={-0.001}
      />
      <directionalLight position={[4, 6, -6]} intensity={2.2} color="#8caed0" />
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.18, 0]}
        receiveShadow
      >
        <planeGeometry args={[200, 200]} />
        <meshStandardMaterial color="#141c1d" roughness={1} />
      </mesh>
      <mesh position={[1.4, -0.12, 0]} receiveShadow>
        <boxGeometry args={[22.2, 0.3, 9.2]} />
        <meshStandardMaterial color="#303a38" roughness={1} />
      </mesh>
      {Array.from({ length: 28 }, (_, i) => (
        <mesh
          key={i}
          position={[-7.9 + (i % 7) * 3.1, 0.045, -3 + Math.floor(i / 7) * 2]}
          receiveShadow
        >
          <boxGeometry args={[3.07, 0.05, 1.97]} />
          <meshStandardMaterial
            color={i % 3 === 0 ? "#37413d" : "#323b38"}
            roughness={1}
          />
        </mesh>
      ))}
      {[-1, 1].flatMap((side) =>
        [-1, 1].map((end) => (
          <group
            key={`${side}:${end}`}
            position={[1.4 + side * 10.6, 0, end * 4.2]}
          >
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
    </>
  );
}
