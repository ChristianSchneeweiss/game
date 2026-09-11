import {
  CylinderGeometry,
  Group,
  IcosahedronGeometry,
  Mesh,
  MeshStandardMaterial,
  type BufferGeometry,
  type Material,
  type Object3D,
} from "three";

export type HeroEquipmentIdentity = {
  equipped?: { WEAPON?: { itemType: string }; ARMOR?: { itemType: string } };
};
export type HeroAppearance = {
  kind: "hero";
  accent: "amber" | "teal";
  weapon: "iron-sword" | "oakwarden-staff" | null;
  armor: "iron-cuirass" | "int-armor" | null;
};
const appearances = new Map<string, HeroAppearance>();

export function heroAppearanceFor(
  entity: HeroEquipmentIdentity,
  accent: HeroAppearance["accent"],
): HeroAppearance {
  const weapon = entity.equipped?.WEAPON?.itemType;
  const armor = entity.equipped?.ARMOR?.itemType;
  const look: HeroAppearance = {
    kind: "hero",
    accent,
    weapon:
      weapon === "iron-sword" || weapon === "oakwarden-staff" ? weapon : null,
    armor: armor === "iron-cuirass" || armor === "int-armor" ? armor : null,
  };
  const key = `${look.accent}:${look.weapon}:${look.armor}`;
  const existing = appearances.get(key);
  if (existing) return existing;
  appearances.set(key, look);
  return look;
}

/** Dress only the cloned knight. Cached meshes, textures and rig data remain untouched. */
export function dressHeroEquipment(root: Object3D, look: HeroAppearance) {
  const materials = new Set<Material>();
  const geometries = new Set<BufferGeometry>();
  const additions: Object3D[] = [];
  const originals: {
    mesh: Mesh;
    material: Mesh["material"];
    visible: boolean;
  }[] = [];
  const cloth = look.accent === "amber" ? "#bc8745" : "#32938d";
  const armorColor =
    look.armor === "iron-cuirass"
      ? "#9ab1c7"
      : look.armor === "int-armor"
        ? "#7660a6"
        : "#8a6950";
  root.traverse((node) => {
    if (!(node instanceof Mesh)) return;
    originals.push({
      mesh: node,
      material: node.material,
      visible: node.visible,
    });
    if (node.name === "1H_Sword") node.visible = look.weapon === "iron-sword";
    if (node.name === "Badge_Shield" || node.name === "Knight_Helmet")
      node.visible = look.armor === "iron-cuirass";
    const isArmor = [
      "Knight_Body",
      "Knight_ArmLeft",
      "Knight_ArmRight",
      "Knight_LegLeft",
      "Knight_LegRight",
      "Knight_Helmet",
    ].includes(node.name);
    const isCloth = node.name === "Knight_Cape" || node.name === "Badge_Shield";
    if (!isArmor && !isCloth) return;
    const tint = (original: Material) => {
      const own = original.clone();
      if (own instanceof MeshStandardMaterial) {
        own.color.set(isCloth ? cloth : armorColor);
        own.metalness = isArmor && look.armor === "iron-cuirass" ? 0.65 : 0;
        own.roughness = isArmor && look.armor === "iron-cuirass" ? 0.36 : 0.9;
      }
      materials.add(own);
      return own;
    };
    node.material = Array.isArray(node.material)
      ? node.material.map(tint)
      : tint(node.material);
  });
  const material = (color: string, emissive = false) => {
    const own = new MeshStandardMaterial({
      color,
      flatShading: true,
      roughness: 0.7,
      ...(emissive ? { emissive: color, emissiveIntensity: 0.35 } : {}),
    });
    materials.add(own);
    return own;
  };
  const add = (
    parent: Group,
    geometry: BufferGeometry,
    surface: Material,
    y: number,
  ) => {
    geometries.add(geometry);
    const mesh = new Mesh(geometry, surface);
    mesh.position.y = y;
    mesh.castShadow = true;
    parent.add(mesh);
    return mesh;
  };
  if (look.weapon === "oakwarden-staff") {
    const socket = root.getObjectByName("handslotr");
    const sword = root.getObjectByName("1H_Sword");
    if (socket && sword) {
      const staff = new Group();
      staff.name = "Equipped_Oakwarden_Staff";
      staff.position.copy(sword.position);
      staff.quaternion.copy(sword.quaternion);
      // This rig's grip uses local +X as up in Idle; our staff is built on +Y.
      staff.rotateZ(-Math.PI / 2);
      const wood = material("#74502c");
      const gold = material("#cda86a");
      const seed = material("#8bdd9e", true);
      add(staff, new CylinderGeometry(0.024, 0.018, 2.05, 7), wood, 0.425);
      for (const y of [-0.1, 0.04, 1.35])
        add(staff, new CylinderGeometry(0.032, 0.032, 0.045, 8), gold, y);
      add(staff, new IcosahedronGeometry(0.11, 0), seed, 1.57);
      for (const side of [-1, 1]) {
        const branch = add(
          staff,
          new CylinderGeometry(0.011, 0.025, 0.32, 5),
          wood,
          1.5,
        );
        branch.position.x = side * 0.09;
        branch.rotation.z = -side * 0.45;
      }
      socket.add(staff);
      additions.push(staff);
    }
  }
  if (look.armor === "int-armor") {
    const hips = root.getObjectByName("hips");
    if (hips) {
      const robe = new Group();
      robe.name = "Equipped_Arcanist_Robes";
      add(
        robe,
        new CylinderGeometry(0.22, 0.34, 0.45, 8),
        material("#594376"),
        -0.09,
      );
      add(
        robe,
        new CylinderGeometry(0.335, 0.34, 0.035, 8),
        material(cloth),
        -0.3,
      );
      hips.add(robe);
      additions.push(robe);
    }
  }
  return () => {
    for (const { mesh, material, visible } of originals) {
      mesh.material = material;
      mesh.visible = visible;
    }
    additions.forEach((node) => node.removeFromParent());
    materials.forEach((item) => item.dispose());
    geometries.forEach((item) => item.dispose());
  };
}
