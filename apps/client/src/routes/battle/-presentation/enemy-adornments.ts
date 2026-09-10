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

export type EnemyAdornment =
  | "ashen"
  | "revenant"
  | "crawler"
  | "wyvern"
  | "drake"
  | "thundermaw"
  | "fish-shaman"
  | "fish-scout"
  | "kelvaris";
const tints: Record<EnemyAdornment, string> = {
  ashen: "#b8a18d",
  revenant: "#e3b387",
  crawler: "#aca799",
  wyvern: "#bbd6ec",
  drake: "#a8b9d1",
  thundermaw: "#c9bbec",
  "fish-shaman": "#a4d6c7",
  "fish-scout": "#c4d9c9",
  kelvaris: "#e0d9ab",
};

/** Variant materials keep the original texture maps, with independent ownership. */
export function dressEnemyVariant(root: Object3D, variant: EnemyAdornment) {
  const ownedMaterials = new Set<Material>();
  const ownedGeometry = new Set<BufferGeometry>();
  const replacements: { mesh: Mesh; original: Mesh["material"] }[] = [];
  const additions: Group[] = [];
  const copied = new Map<Material, Material>();
  root.traverse((node) => {
    if (!(node instanceof Mesh)) return;
    const tint = (source: Material) => {
      const existing = copied.get(source);
      if (existing) return existing;
      const material = source.clone();
      if (material instanceof MeshStandardMaterial)
        material.color.set(tints[variant]);
      copied.set(source, material);
      ownedMaterials.add(material);
      return material;
    };
    replacements.push({ mesh: node, original: node.material });
    node.material = Array.isArray(node.material)
      ? node.material.map(tint)
      : tint(node.material);
  });
  const surface = (color: string, glow = false) => {
    const material = new MeshStandardMaterial({
      color,
      roughness: 0.75,
      flatShading: true,
      emissive: glow ? color : "#000000",
      emissiveIntensity: glow ? 0.45 : 0,
    });
    ownedMaterials.add(material);
    return material;
  };
  const add = (
    parent: Group,
    geometry: BufferGeometry,
    material: Material,
    position: [number, number, number],
  ) => {
    ownedGeometry.add(geometry);
    const mesh = new Mesh(geometry, material);
    mesh.position.set(...position);
    mesh.castShadow = true;
    parent.add(mesh);
    return mesh;
  };
  root.updateMatrixWorld(true);
  const bounds = new Box3()
    .setFromObject(root)
    .applyMatrix4(root.matrixWorld.clone().invert());
  const height = bounds.max.y - bounds.min.y;
  const attach = (group: Group, boneName: string) => {
    root.add(group);
    root.updateMatrixWorld(true);
    root.getObjectByName(boneName)?.attach(group);
    additions.push(group);
  };
  if (variant === "fish-shaman") {
    const hand = root.getObjectByName("Middle1R");
    if (hand) {
      const staff = new Group();
      staff.position.copy(
        root.worldToLocal(hand.getWorldPosition(new Vector3())),
      );
      const coral = surface("#c19d89");
      add(
        staff,
        new CylinderGeometry(height * 0.016, height * 0.025, height * 0.72, 6),
        coral,
        [0, height * 0.13, 0],
      );
      for (const side of [-1, 1]) {
        const fork = add(
          staff,
          new CylinderGeometry(
            height * 0.011,
            height * 0.015,
            height * 0.18,
            5,
          ),
          coral,
          [height * 0.047 * side, height * 0.4, 0],
        );
        fork.rotation.z = -side * 0.4;
      }
      add(
        staff,
        new IcosahedronGeometry(height * 0.055, 1),
        surface("#d4edda", true),
        [0, height * 0.48, 0],
      );
      attach(staff, "Middle1R");
    }
  }
  if (
    variant === "thundermaw" ||
    variant === "kelvaris" ||
    variant === "revenant"
  ) {
    const boneName = variant === "revenant" ? "head" : "Head";
    const head = root.getObjectByName(boneName);
    if (head) {
      const crown = new Group();
      crown.position.copy(
        root.worldToLocal(head.getWorldPosition(new Vector3())),
      );
      crown.position.y = bounds.max.y - height * 0.04;
      const crownMaterial = surface(
        variant === "thundermaw"
          ? "#b8cee8"
          : variant === "revenant"
            ? "#d7a05e"
            : "#ddc589",
        true,
      );
      for (const side of [-1, 0, 1]) {
        const prong = add(
          crown,
          new CylinderGeometry(
            0,
            height * 0.035,
            height * (side === 0 ? 0.18 : 0.14),
            5,
          ),
          crownMaterial,
          [side * height * 0.095, 0, 0],
        );
        prong.rotation.z = -side * 0.35;
      }
      attach(crown, boneName);
    }
  }
  return () => {
    replacements.forEach(({ mesh, original }) => {
      mesh.material = original;
    });
    additions.forEach((node) => node.removeFromParent());
    ownedGeometry.forEach((geometry) => geometry.dispose());
    ownedMaterials.forEach((material) => material.dispose());
  };
}
