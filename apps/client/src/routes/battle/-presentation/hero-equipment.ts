import {
  CylinderGeometry,
  Group,
  IcosahedronGeometry,
  Mesh,
  MeshStandardMaterial,
  TorusGeometry,
  type BufferGeometry,
  type Material,
  type Object3D,
} from "three";
import {
  accessoryVisualFor,
  armorVisuals,
  weaponVisuals,
} from "../../../lib/equipment-visuals";
import { EQUIPMENT_SLOTS } from "@loot-game/game/items/equipment/equipment-slots";
import type { EquipmentSlot } from "@loot-game/game/items/equipment/equipment";

export type HeroEquipmentIdentity = {
  equipped?: Partial<Record<EquipmentSlot, { itemType: string }>>;
};
export type HeroAppearance = {
  kind: "hero";
  accent: "amber" | "teal";
  weapon: keyof typeof weaponVisuals | null;
  armor: keyof typeof armorVisuals | null;
  accessories?: Partial<Record<EquipmentSlot, string>>;
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
      weapon && Object.hasOwn(weaponVisuals, weapon)
        ? (weapon as keyof typeof weaponVisuals)
        : null,
    armor:
      armor && Object.hasOwn(armorVisuals, armor)
        ? (armor as keyof typeof armorVisuals)
        : null,
  };
  const accessories = EQUIPMENT_SLOTS.flatMap((slot) => {
    const type = entity.equipped?.[slot]?.itemType;
    return accessoryVisualFor(type)?.slot === slot ? [[slot, type]] : [];
  });
  if (accessories.length) look.accessories = Object.fromEntries(accessories);
  const key = `${look.accent}:${look.weapon}:${look.armor}:${JSON.stringify(look.accessories)}`;
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
  const weapon = look.weapon ? weaponVisuals[look.weapon] : undefined;
  const armor = look.armor ? armorVisuals[look.armor] : undefined;
  const plate = armor?.kind === "plate";
  const cloth = look.accent === "amber" ? "#bc8745" : "#32938d";
  const armorColor = armor?.color ?? "#8a6950";
  const accessoryColor = (slot: EquipmentSlot) =>
    accessoryVisualFor(look.accessories?.[slot])?.color;
  root.traverse((node) => {
    if (!(node instanceof Mesh)) return;
    originals.push({
      mesh: node,
      material: node.material,
      visible: node.visible,
    });
    if (node.name === "1H_Sword") node.visible = weapon?.kind === "sword";
    if (node.name === "Badge_Shield") node.visible = plate;
    if (node.name === "Knight_Helmet")
      node.visible = plate || Boolean(accessoryColor("HELMET"));
    const isArmor = [
      "Knight_Body",
      "Knight_ArmLeft",
      "Knight_ArmRight",
      "Knight_LegLeft",
      "Knight_LegRight",
      "Knight_Helmet",
    ].includes(node.name);
    const isCloth = node.name === "Knight_Cape" || node.name === "Badge_Shield";
    const tintSword =
      node.name === "1H_Sword" &&
      weapon?.kind === "sword" &&
      look.weapon !== "iron-sword";
    const accessoryTint =
      node.name === "Knight_Helmet"
        ? accessoryColor("HELMET")
        : node.name.startsWith("Knight_Arm")
          ? accessoryColor("GLOVES")
          : node.name.startsWith("Knight_Leg")
            ? accessoryColor("BOOTS")
            : node.name === "Knight_Cape"
              ? accessoryColor("CLOAK")
              : undefined;
    if (!isArmor && !isCloth && !tintSword) return;
    const tint = (original: Material) => {
      const own = original.clone();
      if (own instanceof MeshStandardMaterial) {
        own.color.set(
          accessoryTint ??
            (tintSword ? weapon!.color : isCloth ? cloth : armorColor),
        );
        own.metalness = tintSword || (isArmor && plate) ? 0.65 : 0;
        own.roughness = tintSword || (isArmor && plate) ? 0.36 : 0.9;
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
  if (weapon?.kind === "staff") {
    const socket = root.getObjectByName("handslotr");
    const sword = root.getObjectByName("1H_Sword");
    if (socket && sword) {
      const staff = new Group();
      staff.name =
        look.weapon === "oakwarden-staff"
          ? "Equipped_Oakwarden_Staff"
          : `Equipped_${look.weapon}`;
      staff.position.copy(sword.position);
      staff.quaternion.copy(sword.quaternion);
      // This rig's grip uses local +X as up in Idle; our staff is built on +Y.
      staff.rotateZ(-Math.PI / 2);
      const wood = material(weapon.color);
      const gold = material("#cda86a");
      const seed = material(weapon.gem, true);
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
  if (armor?.kind === "robes") {
    const hips = root.getObjectByName("hips");
    if (hips) {
      const robe = new Group();
      robe.name =
        look.armor === "int-armor"
          ? "Equipped_Arcanist_Robes"
          : `Equipped_${look.armor}`;
      add(
        robe,
        new CylinderGeometry(0.22, 0.34, 0.45, 8),
        material(armor.skirt),
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
  for (const slot of ["BELT", "AMULET", "RING"] as const) {
    const type = look.accessories?.[slot];
    const color = accessoryColor(slot);
    const socket = root.getObjectByName(slot === "RING" ? "handslotr" : "hips");
    if (!type || !color || !socket) continue;
    const accessory = new Group();
    accessory.name = `Equipped_${type}`;
    if (slot === "BELT") {
      add(
        accessory,
        new CylinderGeometry(0.235, 0.235, 0.06, 8),
        material(color),
        0.13,
      );
    } else if (slot === "AMULET") {
      const pendant = add(
        accessory,
        new IcosahedronGeometry(0.045, 0),
        material(color, true),
        0.4,
      );
      pendant.position.z = 0.22;
    } else {
      add(accessory, new TorusGeometry(0.035, 0.009, 4, 8), material(color), 0);
    }
    socket.add(accessory);
    additions.push(accessory);
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
