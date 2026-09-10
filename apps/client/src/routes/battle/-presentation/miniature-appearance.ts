import {
  Box3,
  CylinderGeometry,
  Group,
  IcosahedronGeometry,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  Vector3,
  type BufferGeometry,
  type Material,
} from "three";
import { dressEnemyVariant, type EnemyAdornment } from "./enemy-adornments";

type Identity = { id: string; team: string; type?: string };
export type MiniatureAppearance =
  | EnemyAdornment
  | "amber"
  | "teal"
  | "shaman"
  | "elder"
  | "oakwarden"
  | "original";
const enemyAdornments = new Map<string, EnemyAdornment>([
  ["ashen-skeleton", "ashen"],
  ["emberbound-revenant", "revenant"],
  ["crypt-crawler", "crawler"],
  ["skybolt-wyvern", "wyvern"],
  ["thunder-drake", "drake"],
  ["thundermaw", "thundermaw"],
  ["fishfolk-shaman", "fish-shaman"],
  ["fishfolk-scout", "fish-scout"],
  ["commander-kelvaris", "kelvaris"],
]);
const adornmentNames = new Set<MiniatureAppearance>(enemyAdornments.values());

export function appearanceFor(
  entity: Identity,
  participants: Identity[],
): MiniatureAppearance {
  if (entity.team === "TEAM_A") {
    const ids: string[] = [];
    for (const participant of participants) {
      if (participant.team === "TEAM_A") ids.push(participant.id);
    }
    ids.sort();
    return ids.indexOf(entity.id) % 2 === 0 ? "amber" : "teal";
  }
  if (entity.type === "barkhide-shaman") return "shaman";
  if (entity.type === "elder-treant") return "elder";
  if (entity.type === "hollowed-oakwarden") return "oakwarden";
  return enemyAdornments.get(entity.type ?? "") ?? "original";
}

/** Dress an instance, never the cached asset. Only newly owned resources are disposed. */
export function dressMiniature(
  root: Object3D,
  appearance: MiniatureAppearance,
) {
  if (adornmentNames.has(appearance))
    return dressEnemyVariant(root, appearance as EnemyAdornment);
  const materials = new Set<Material>();
  const geometries = new Set<BufferGeometry>();
  const additions: Object3D[] = [];
  const replacements: { mesh: Mesh; original: Mesh["material"] }[] = [];
  const material = (color: string, glow = false) => {
    const value = new MeshStandardMaterial({
      color,
      roughness: 0.8,
      flatShading: true,
      ...(glow ? { emissive: color, emissiveIntensity: 0.55 } : {}),
    });
    materials.add(value);
    return value;
  };
  if (appearance === "amber" || appearance === "teal") {
    const cloth = material(appearance === "amber" ? "#c99145" : "#3b9995");
    root.traverse((node) => {
      if (
        node instanceof Mesh &&
        ["Knight_Cape", "Badge_Shield"].includes(node.name)
      ) {
        replacements.push({ mesh: node, original: node.material });
        node.material = cloth;
      }
    });
  } else if (appearance !== "original") {
    root.updateMatrixWorld(true);
    const bounds = new Box3()
      .setFromObject(root)
      .applyMatrix4(root.matrixWorld.clone().invert());
    const height = bounds.max.y - bounds.min.y;
    const center = bounds.getCenter(new Vector3());
    const top = bounds.max.y;
    const bark = material(appearance === "oakwarden" ? "#6b5435" : "#786247");
    const leaf = material(appearance === "elder" ? "#8d9c46" : "#4d8154");
    const seed = material(
      appearance === "shaman" ? "#dcbb68" : "#bddd91",
      true,
    );
    const addMesh = (
      group: Group,
      geometry: BufferGeometry,
      surface: Material,
      position: [number, number, number],
      scale?: [number, number, number],
    ) => {
      geometries.add(geometry);
      const mesh = new Mesh(geometry, surface);
      mesh.position.set(...position);
      if (scale) mesh.scale.set(...scale);
      mesh.castShadow = true;
      group.add(mesh);
      return mesh;
    };
    const attach = (group: Group, boneName: string) => {
      root.add(group);
      root.updateMatrixWorld(true);
      root.getObjectByName(boneName)?.attach(group);
      additions.push(group);
    };
    if (appearance === "shaman") {
      const staff = new Group();
      const hand = root.getObjectByName("handR");
      const handPosition = hand
        ? root.worldToLocal(hand.getWorldPosition(new Vector3()))
        : new Vector3(center.x + height * 0.3, top - height * 0.55, center.z);
      staff.position.copy(handPosition);
      addMesh(
        staff,
        new CylinderGeometry(height * 0.015, height * 0.025, height * 0.66, 5),
        bark,
        [0, height * 0.13, 0],
      );
      addMesh(staff, new IcosahedronGeometry(height * 0.075, 0), seed, [
        0,
        height * 0.49,
        0,
      ]);
      for (const side of [-1, 1]) {
        const twig = addMesh(
          staff,
          new CylinderGeometry(height * 0.008, height * 0.015, height * 0.2, 4),
          bark,
          [side * height * 0.045, height * 0.39, 0],
        );
        twig.rotation.z = -side * 0.6;
        addMesh(
          staff,
          new IcosahedronGeometry(height * 0.06, 0),
          leaf,
          [side * height * 0.085, height * 0.46, 0],
          [1, 0.5, 0.7],
        );
      }
      attach(staff, "handR");
    } else {
      const crown = new Group();
      crown.position.set(
        center.x,
        top - height * (appearance === "elder" ? 0.15 : 0.08),
        center.z,
      );
      for (let i = 0; i < 5; i++) {
        const angle = (i / 5) * Math.PI * 2;
        const radius = height * 0.105;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        if (appearance === "elder") {
          addMesh(
            crown,
            new IcosahedronGeometry(height * 0.1, 0),
            leaf,
            [x, 0, z],
            [1.2, 0.5, 1],
          );
        } else {
          const branch = addMesh(
            crown,
            new CylinderGeometry(
              0,
              height * 0.027,
              height * (i % 2 ? 0.18 : 0.23),
              5,
            ),
            bark,
            [x, height * 0.065, z],
          );
          branch.rotation.set(Math.sin(angle) * 0.3, 0, -Math.cos(angle) * 0.3);
          addMesh(crown, new IcosahedronGeometry(height * 0.03, 0), seed, [
            x * 1.2,
            height * 0.15,
            z * 1.2,
          ]);
        }
      }
      attach(crown, "spine008");
    }
  }
  return () => {
    replacements.forEach(({ mesh, original }) => {
      mesh.material = original;
    });
    additions.forEach((node) => node.removeFromParent());
    geometries.forEach((geometry) => geometry.dispose());
    materials.forEach((surface) => surface.dispose());
  };
}
