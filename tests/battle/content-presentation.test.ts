import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { Mesh, MeshStandardMaterial } from "three";
import { clone } from "three/addons/utils/SkeletonUtils.js";
import { loadModelGeometry } from "../../scripts/enemy-model-geometry";
import {
  armorVisualFor,
  accessoryVisualFor,
  weaponVisualFor,
} from "../../apps/client/src/lib/equipment-visuals";
import {
  dressHeroEquipment,
  heroAppearanceFor,
} from "../../apps/client/src/routes/battle/-presentation/hero-equipment";
import { contentHero, newItems } from "./support/content-expansion";
import {
  TIERED_EQUIPMENT,
  tieredEquipmentTypes,
} from "../../apps/game/src/items/equipment/tiered-equipment";

test("every new item retains its identity and dresses the real knight with owned, disposable resources", async () => {
  const asset = await loadModelGeometry(
    readFileSync(
      new URL(
        "../../apps/client/public/models/battle-v2/knight.glb",
        import.meta.url,
      ),
    ),
  );
  const root = clone(asset.scene);
  for (const type of [
    ...newItems,
    ...tieredEquipmentTypes.filter((type) =>
      ["WEAPON", "ARMOR"].includes(TIERED_EQUIPMENT[type].equipmentSlot),
    ),
  ]) {
    const hero = contentHero([], [type]);
    const look = heroAppearanceFor(hero, "amber");
    const weapon = weaponVisualFor(type);
    const armor = armorVisualFor(type);
    expect((weapon ? look.weapon : look.armor) === type).toBe(true);
    const originals = new Map<Mesh, Mesh["material"]>();
    root.traverse((node) => {
      if (node instanceof Mesh) originals.set(node, node.material);
    });
    const undo = dressHeroEquipment(root, look);
    expect(root.getObjectByName("1H_Sword")!.visible).toBe(
      weapon?.kind === "sword",
    );
    expect(root.getObjectByName("Knight_Helmet")!.visible).toBe(
      armor?.kind === "plate",
    );
    if (weapon?.kind === "staff" || armor?.kind === "robes") {
      expect(root.getObjectByName(`Equipped_${type}`)?.parent?.name).toBe(
        weapon ? "handslotr" : "hips",
      );
    }
    if (weapon?.kind === "sword" || armor) {
      const mesh = root.getObjectByName(
        weapon ? "1H_Sword" : "Knight_Body",
      ) as Mesh;
      const material = (
        Array.isArray(mesh.material) ? mesh.material[0] : mesh.material
      ) as MeshStandardMaterial;
      expect(`#${material.color.getHexString()}`).toBe(
        (weapon ?? armor)!.color,
      );
    }
    const ownedMaterials = new Set<MeshStandardMaterial>();
    const addedGeometries = new Set<Mesh["geometry"]>();
    root.traverse((node) => {
      if (!(node instanceof Mesh)) return;
      const material = Array.isArray(node.material)
        ? node.material
        : [node.material];
      const previous = originals.get(node);
      const shared = Array.isArray(previous) ? previous : [previous];
      for (const surface of material)
        if (!shared.includes(surface)) ownedMaterials.add(surface);
      if (!originals.has(node)) addedGeometries.add(node.geometry);
    });
    let disposedMaterials = 0,
      disposedGeometries = 0;
    ownedMaterials.forEach((material) =>
      material.addEventListener("dispose", () => disposedMaterials++),
    );
    addedGeometries.forEach((geometry) =>
      geometry.addEventListener("dispose", () => disposedGeometries++),
    );
    undo();
    expect(disposedMaterials).toBe(ownedMaterials.size);
    expect(disposedGeometries).toBe(addedGeometries.size);
    expect(root.getObjectByName(`Equipped_${type}`)).toBeUndefined();
    for (const [mesh, material] of originals)
      expect(mesh.material).toBe(material);
  }
});

test("every accessory retains its appearance identity and restores the knight after preview", async () => {
  const asset = await loadModelGeometry(
    readFileSync(
      new URL(
        "../../apps/client/public/models/battle-v2/knight.glb",
        import.meta.url,
      ),
    ),
  );
  const root = clone(asset.scene);
  const helmet = root.getObjectByName("Knight_Helmet") as Mesh;
  const originalMaterial = helmet.material;
  const originalVisibility = helmet.visible;
  for (const type of tieredEquipmentTypes) {
    const visual = accessoryVisualFor(type);
    if (!visual) continue;
    const look = heroAppearanceFor(contentHero([], [type]), "amber");
    expect(look.accessories?.[visual.slot]).toBe(type);
    expect(look).toBe(heroAppearanceFor(contentHero([], [type]), "amber"));
    const dispose = dressHeroEquipment(root, look);
    expect(helmet.visible).toBe(visual.slot === "HELMET");
    if (
      visual.slot === "BELT" ||
      visual.slot === "RING" ||
      visual.slot === "AMULET"
    ) {
      const fitting = root.getObjectByName(`Equipped_${type}`)!;
      expect(fitting.parent?.name).toBe(
        visual.slot === "RING" ? "handslotr" : "hips",
      );
      let disposed = false;
      (fitting.children[0] as Mesh).geometry.addEventListener("dispose", () => {
        disposed = true;
      });
      dispose();
      expect(disposed).toBe(true);
      expect(root.getObjectByName(`Equipped_${type}`)).toBeUndefined();
    } else {
      const meshName = {
        HELMET: "Knight_Helmet",
        GLOVES: "Knight_ArmLeft",
        BOOTS: "Knight_LegLeft",
        CLOAK: "Knight_Cape",
      }[visual.slot];
      const mesh = root.getObjectByName(meshName) as Mesh;
      const material = (
        Array.isArray(mesh.material) ? mesh.material[0] : mesh.material
      ) as MeshStandardMaterial;
      expect(`#${material.color.getHexString()}`).toBe(visual.color);
      dispose();
    }
    expect(helmet.material).toBe(originalMaterial);
    expect(helmet.visible).toBe(originalVisibility);
  }
});
