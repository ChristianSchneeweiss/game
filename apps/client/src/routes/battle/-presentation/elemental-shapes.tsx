import type { ElementalEffect } from "./spell-appearance";
const spokes = Array.from({ length: 8 }, (_, index) => ({
  index,
  angle: (index * Math.PI) / 4,
}));
const chainLinks = Array.from({ length: 12 }, (_, index) => ({
  index,
  angle: (index * Math.PI) / 6,
}));
const boltPoints = [
  [-0.08, 0],
  [0.22, 0.5],
  [-0.18, 0.78],
  [0.16, 1.32],
  [-0.12, 1.72],
];
const boltSegments = boltPoints.slice(1).map((end, index) => {
  const start = boltPoints[index];
  const dx = end[0] - start[0];
  const dy = end[1] - start[1];
  return {
    index,
    x: (start[0] + end[0]) / 2,
    y: (start[1] + end[1]) / 2,
    length: Math.hypot(dx, dy) + 0.025,
    rotation: -Math.atan2(dx, dy),
  };
});

export function FlameImpact({
  effect,
  color,
}: {
  effect: ElementalEffect;
  color: string;
}) {
  return (
    <>
      {spokes.map(({ index, angle }) => (
        <mesh
          key={index}
          position={[
            Math.cos(angle) * 0.82,
            0.35 + (index % 3) * 0.2,
            Math.sin(angle) * 0.82,
          ]}
          rotation={[0, angle, 0.15]}
          scale={[0.13, 0.35 + (index % 3) * 0.15, 0.12]}
        >
          <octahedronGeometry />
          <meshBasicMaterial color={index % 2 ? color : "#ffe0aa"} />
        </mesh>
      ))}
      {effect === "brand" && (
        <mesh position={[0, 0.9, 0]} rotation={[0, 0, Math.PI / 4]}>
          <torusGeometry args={[0.64, 0.035, 4, 4]} />
          <meshBasicMaterial color="#ffb77a" />
        </mesh>
      )}
      {effect === "chains" &&
        chainLinks.map(({ index, angle }) => (
          <mesh
            key={index}
            position={[
              Math.cos(angle) * 0.88,
              0.35 + (index % 3) * 0.32,
              Math.sin(angle) * 0.88,
            ]}
            rotation={[0, -angle, ((index % 2) * Math.PI) / 2]}
          >
            <torusGeometry args={[0.18, 0.035, 4, 8]} />
            <meshStandardMaterial
              color="#6b4a3d"
              emissive={color}
              emissiveIntensity={0.45}
              roughness={0.8}
            />
          </mesh>
        ))}
    </>
  );
}

export function LightningImpact({
  color,
  storm,
}: {
  color: string;
  storm: boolean;
}) {
  return (
    <>
      {[-1, 1].map((index) => (
        <group
          key={index}
          position={[index * 0.58, 0.15, 0.12]}
          rotation={[0, index * 0.45, 0]}
        >
          {boltSegments.map((segment) => (
            <mesh
              key={segment.index}
              position={[segment.x, segment.y, 0]}
              rotation={[0, 0, segment.rotation]}
            >
              <boxGeometry args={[0.055, segment.length, 0.045]} />
              <meshBasicMaterial color={color} />
            </mesh>
          ))}
        </group>
      ))}
      {storm &&
        [0, 1].map((index) => (
          <mesh
            key={index}
            position={[0, 0.55 + index * 0.55, 0]}
            rotation={[Math.PI / 2, 0, index]}
          >
            <torusGeometry args={[0.95, 0.028, 4, 40, Math.PI * 1.6]} />
            <meshBasicMaterial color={color} transparent opacity={0.65} />
          </mesh>
        ))}
    </>
  );
}

export function WaterImpact({
  effect,
  color,
}: {
  effect: ElementalEffect;
  color: string;
}) {
  if (effect === "tide-spear")
    return (
      <>
        <mesh
          position={[0, 1, 0]}
          rotation={[0, 0, -0.6]}
          scale={[0.11, 1.15, 0.11]}
        >
          <octahedronGeometry />
          <meshBasicMaterial color="#d4f4ed" />
        </mesh>
        {spokes.map(({ index, angle }) => (
          <mesh
            key={index}
            position={[
              Math.cos(angle),
              0.1 + (index % 3) * 0.1,
              Math.sin(angle),
            ]}
            scale={[0.08, 0.14, 0.08]}
          >
            <icosahedronGeometry args={[1, 0]} />
            <meshBasicMaterial color={color} />
          </mesh>
        ))}
      </>
    );
  return (
    <>
      {[0, 1, 2].map((index) => (
        <mesh
          key={index}
          position={[0, 0.22 + index * 0.32, 0]}
          rotation={[Math.PI / 2, 0, index * 0.8]}
        >
          <torusGeometry
            args={[
              0.72 + index * 0.14,
              effect === "torrent" ? 0.085 : 0.045,
              5,
              36,
              effect === "restore" ? Math.PI * 1.4 : Math.PI * 1.7,
            ]}
          />
          <meshBasicMaterial
            color={color}
            transparent
            opacity={0.72 - index * 0.1}
            depthWrite={false}
          />
        </mesh>
      ))}
      {spokes.map(({ index, angle }) => (
        <mesh
          key={index}
          position={[
            Math.cos(angle) * 0.85,
            0.45 + (index % 3) * 0.43,
            Math.sin(angle) * 0.85,
          ]}
          scale={[0.08, 0.14, 0.08]}
        >
          <icosahedronGeometry args={[1, 0]} />
          <meshBasicMaterial color={index % 2 ? color : "#d9f0dc"} />
        </mesh>
      ))}
    </>
  );
}

export function SoulImpact({ color }: { color: string }) {
  return (
    <>
      {[0, 1, 2].map((index) => (
        <mesh
          key={index}
          position={[0, 0.65 + index * 0.27, 0]}
          rotation={[Math.PI / 2, 0, index]}
        >
          <torusGeometry
            args={[0.82 - index * 0.13, 0.06, 5, 32, Math.PI * 1.3]}
          />
          <meshBasicMaterial
            color={color}
            transparent
            opacity={0.8}
            depthWrite={false}
          />
        </mesh>
      ))}
      {spokes.map(({ index, angle }) => (
        <mesh
          key={index}
          position={[
            Math.cos(angle) * 0.9,
            0.2 + (index % 4) * 0.3,
            Math.sin(angle) * 0.9,
          ]}
          scale={[0.07, 0.2, 0.07]}
        >
          <octahedronGeometry />
          <meshBasicMaterial color={color} />
        </mesh>
      ))}
    </>
  );
}
