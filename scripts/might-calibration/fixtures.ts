import { BaseEntity } from "../../apps/game/src/base-entity";
import { BM } from "../../apps/game/src/bm";
import { itemFactory } from "../../apps/game/src/items/equipment/item-factory";
import type { ItemType } from "../../apps/game/src/items/item-types";
import { createSpellFromType } from "../../apps/game/src/spells/base/spell-from-type";
import type { SpellType } from "../../apps/game/src/spells/base/spell-types";

export type Probe = {
  id: string;
  rounds: number;
  stat: number;
  spell?: SpellType;
  repeat?: boolean;
  weapon?: "iron-sword" | "oakwarden-staff";
  enemies?: number;
  enemyHealth?: number;
  enemyArmor?: number;
  enemyCuirass?: boolean;
  retaliate?: boolean;
  casterHealth?: number;
  casterMana?: number;
  casterCuirass?: boolean;
  partnerStat?: number;
  fleetTarget?: "caster" | "partner";
};

/** Synthetic reference actors: combat attributes are inputs, not progression levels. */
function actor(id: string, stat: number, agility: number, enemy = false) {
  const entity = new BaseEntity(id, id, enemy ? "TEAM_B" : "TEAM_A", 1000, 100,
    { strength: stat, intelligence: stat, vitality: stat, agility, movement: 3 });
  entity.isBot = enemy;
  entity.spells = [createSpellFromType(`${id}:basic-attack`, "basic-attack")];
  return entity;
}

function equip(entity: BaseEntity, item: ItemType) {
  const equipment = itemFactory(item, `${entity.id}:${item}`, entity);
  entity.equipped[equipment.equipmentSlot] = equipment;
}

export function fixture(probe: Probe, seed: string) {
  const caster = actor("caster", probe.stat, 100);
  equip(caster, probe.weapon ?? "oakwarden-staff");
  if (probe.casterCuirass) equip(caster, "iron-cuirass");
  caster.health = probe.casterHealth ?? 1000;
  caster.mana = probe.casterMana ?? 100;
  if (probe.spell) caster.spells.push(createSpellFromType(`caster:${probe.spell}`, probe.spell));
  const partner = probe.partnerStat === undefined ? undefined : actor("partner", probe.partnerStat, 90);
  if (partner) equip(partner, "iron-sword");
  const enemies = Array.from({ length: probe.enemies ?? 1 }, (_, i) => {
    const entity = actor(`enemy-${i}`, 20, 10 - i, true);
    entity.health = probe.enemyHealth ?? 1000;
    entity.baseSpecialAttributes.armor = probe.enemyArmor ?? 0;
    if (probe.enemyCuirass) equip(entity, "iron-cuirass");
    if (probe.retaliate) equip(entity, "iron-sword");
    return entity;
  });
  const entities = [caster, ...(partner ? [partner] : []), ...enemies];
  const positions = {
    caster: { x: 2, y: 2 },
    ...(partner ? { partner: { x: 3, y: 3 } } : {}),
    ...Object.fromEntries(enemies.map((entity, i) => [entity.id, { x: 3 + i % 2, y: 2 - Math.floor(i / 2) }])),
  };
  const bm = new BM(entities, seed, {
    rulesVersion: 2,
    battlefield: { width: 7, height: 7, blocked: [], layoutVersion: "might-probe-v1" },
    positions,
  });
  bm.start();
  return { bm, caster, partner, enemies };
}

export const probes: Probe[] = [
  ...[10, 20, 50].flatMap((stat): Probe[] => [
    { id: `staff-${stat}`, stat, rounds: 1 },
    { id: `fireball-${stat}`, stat, rounds: 1, spell: "fireball" },
    { id: `cinder-wisp-${stat}`, stat, rounds: 1, spell: "cinder-wisp" },
    { id: `heal-injured-${stat}`, stat, rounds: 1, spell: "single-heal", casterHealth: 500 },
    { id: `staff-injured-${stat}`, stat, rounds: 1, casterHealth: 500 },
    { id: `sword-${stat}`, stat, rounds: 1, weapon: "iron-sword" },
    { id: `sword-cuirass-${stat}`, stat, rounds: 1, weapon: "iron-sword", enemyCuirass: true },
    { id: `arcane-one-${stat}`, stat, rounds: 2, spell: "arcane-channeling" },
    { id: `arcane-four-${stat}`, stat, rounds: 2, spell: "arcane-channeling", enemies: 4 },
    { id: `staff-two-rounds-${stat}`, stat, rounds: 2 },
    { id: `staff-four-two-rounds-${stat}`, stat, rounds: 2, enemies: 4 },
  ]),
  { id: "fireball-cadence", stat: 20, rounds: 7, spell: "fireball", repeat: true },
  { id: "staff-seven-rounds", stat: 20, rounds: 7 },
  { id: "heal-full", stat: 20, rounds: 1, spell: "single-heal" },
  { id: "bulwark-cadence", stat: 20, rounds: 4, spell: "bulwark-bash", repeat: true, weapon: "iron-sword", retaliate: true },
  { id: "sword-retaliation", stat: 20, rounds: 4, weapon: "iron-sword", retaliate: true },
  { id: "fleet-self", stat: 20, rounds: 2, spell: "fleetfoot-gambit", fleetTarget: "caster" },
  { id: "fleet-partner", stat: 10, rounds: 2, spell: "fleetfoot-gambit", fleetTarget: "partner", partnerStat: 50 },
  { id: "fleet-partner-baseline", stat: 10, rounds: 2, partnerStat: 50 },
  { id: "verdict-healthy", stat: 20, rounds: 1, spell: "final-verdict", weapon: "iron-sword" },
  { id: "verdict-11pct", stat: 20, rounds: 1, spell: "final-verdict", weapon: "iron-sword", enemyHealth: 110 },
  { id: "verdict-10pct", stat: 20, rounds: 1, spell: "final-verdict", weapon: "iron-sword", enemyHealth: 100 },
  { id: "sword-10pct", stat: 20, rounds: 1, weapon: "iron-sword", enemyHealth: 100 },
  { id: "verdict-10pct-high-armor", stat: 20, rounds: 1, spell: "final-verdict", weapon: "iron-sword", enemyHealth: 100, enemyArmor: 1100 },
  { id: "arcane-before-discharge", stat: 20, rounds: 1, spell: "arcane-channeling" },
  { id: "arcane-resume", stat: 20, rounds: 3, spell: "arcane-channeling" },
  { id: "arcane-low-mana", stat: 20, rounds: 2, spell: "arcane-channeling", casterMana: 40 },
  { id: "stone-bark-no-armor", stat: 20, rounds: 2, spell: "stone-bark", retaliate: true },
  { id: "staff-retaliation", stat: 20, rounds: 2, retaliate: true },
  { id: "stone-bark-cuirass", stat: 20, rounds: 2, spell: "stone-bark", retaliate: true, casterCuirass: true },
  { id: "staff-cuirass-retaliation", stat: 20, rounds: 2, retaliate: true, casterCuirass: true },
];
