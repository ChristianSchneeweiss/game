import { BaseEntity } from "../../apps/game/src/base-entity";
import { BM } from "../../apps/game/src/bm";
import { equipmentFactory } from "../../apps/game/src/items/equipment/equipment-factory";
import {
  EquipmentTypeSchema,
  type EquipmentType,
} from "../../apps/game/src/items/equipment-types";
import { TotalDamageModule } from "../../apps/game/src/modules/damage.module";
import { DamageSpell } from "../../apps/game/src/spells/base/damage.spell";
import { createSpellFromType } from "../../apps/game/src/spells/base/spell-from-type";
import {
  MIGHT_REFERENCE,
  type MightReferenceBuild,
} from "../../apps/game/src/might/reference-profile";
import type { PassiveType } from "../../apps/game/src/passive-skills/base/passive-types";
import {
  mean,
  playReferenceBattle,
  quiet,
  referenceHero,
  referenceImpacts,
} from "./reference";

export type PressureCase = {
  build: MightReferenceBuild;
  rounds: number;
  depleted: boolean;
  armored: boolean;
  approach: boolean;
  seed: string;
  item?: EquipmentType;
  passive?: PassiveType;
  basicOnly?: boolean;
  enemyFraction?: number;
  heroFraction?: number;
  rawPressure?: number;
  removeMovementBonus?: boolean;
  approachDistance?: number;
};

export function measurePressure(c: PressureCase) {
  const hero = referenceHero(c.build, "hero", c.passive);
  if (c.item) {
    const item = equipmentFactory(c.item, `hero:${c.item}`, hero);
    if (item.equipmentSlot === "WEAPON")
      hero.equipped.ARMOR = equipmentFactory(
        "iron-cuirass",
        "hero:comparison-cuirass",
        hero,
      );
    if (c.removeMovementBonus)
      item.modifiers = item.modifiers.filter((x) => x.attribute !== "movement");
    hero.equipped[item.equipmentSlot] = item;
  }
  if (c.basicOnly)
    hero.spells = [createSpellFromType("hero:basic-attack", "basic-attack")];
  const enemies = (["PHYSICAL", "MAGICAL"] as const).map((kind, i) => {
    const entity = new BaseEntity(
      `target-${i}`,
      "Pressure",
      "TEAM_B",
      1500,
      0,
      {
        strength: 80,
        intelligence: 80,
        vitality: 100,
        agility: 100 - i,
        movement: 0,
      },
    );
    entity.baseSpecialAttributes.armor = c.armored ? 30 : 0;
    entity.baseSpecialAttributes.magicResistance = c.armored ? 20 : 0;
    entity.spells = [
      new DamageSpell(
        {
          id: `pressure-${i}`,
          type: "fireball",
          name: "Pressure",
          manaCost: 0,
          cooldown: 0,
          tier: "E",
          targetType: { enemies: 1, allies: 0 },
          targeting: {
            aim: "tile",
            recipients: "enemies",
            range: { min: 1, max: 8 },
            affectedTiles: [[0, 0]],
          },
        },
        new TotalDamageModule(kind, () => c.rawPressure ?? 65),
      ),
    ];
    return entity;
  });
  const bm = new BM([hero, ...enemies], c.seed, {
    rulesVersion: 2,
    battlefield: {
      width: 9,
      height: 7,
      blocked: [],
      layoutVersion: "might-slot-pressure-v3",
    },
    positions: {
      hero: { x: c.approach ? 5 - (c.approachDistance ?? 5) : 3, y: 3 },
      "target-0": { x: 5, y: 3 },
      "target-1": { x: 5, y: 2 },
    },
  });
  hero.health = Math.round(
    hero.maxHealth * (c.heroFraction ?? (c.depleted ? 0.55 : 1)),
  );
  hero.mana = Math.round(hero.maxMana * (c.depleted ? 0.1 : 1));
  for (const enemy of enemies)
    enemy.health = Math.round(enemy.maxHealth * (c.enemyFraction ?? 1));
  const effective = Object.fromEntries(
    [
      "strength",
      "intelligence",
      "vitality",
      "agility",
      "armor",
      "magicResistance",
      "critChance",
      "critDamage",
      "movement",
      "healthRegen",
      "manaRegen",
    ].map((key) => [
      key,
      hero.getAttribute(key as Parameters<typeof hero.getAttribute>[0]),
    ]),
  );
  bm.start();
  playReferenceBattle(bm, c.rounds);
  const impacts = referenceImpacts(bm);
  const casts = bm.events.flatMap(({ round, event }) =>
    event.eventType === "SPELL_CAST" && event.data.payment?.casterId === "hero"
      ? [
          {
            round,
            spell: bm.getSpellById(event.data.spellId)?.config.type,
            mana: event.data.payment.manaSpent,
          },
        ]
      : [],
  );
  return {
    health: hero.health,
    mana: hero.mana,
    dead: Number(hero.isDead()),
    rounds: bm.getCurrentRoundNumber(),
    unfinished: Number(!bm.isGameOver()),
    winner: bm.getWinningTeam(),
    effective,
    maxHealth: hero.maxHealth,
    maxMana: hero.maxMana,
    damage: impacts
      .filter((x) => x.targetId.startsWith("target-"))
      .reduce((s, x) => s + Math.max(0, -x.healthChange), 0),
    damageTaken: impacts
      .filter((x) => x.targetId === "hero")
      .reduce((s, x) => s + Math.max(0, -x.healthChange), 0),
    healing: impacts
      .filter((x) => x.targetId === "hero")
      .reduce((s, x) => s + Math.max(0, x.healthChange), 0),
    manaSpent: casts.reduce((s, x) => s + x.mana, 0),
    casts: casts.length,
    firstCastRound: casts[0]?.round ?? null,
    moves: bm.events.filter(
      (x) => x.event.eventType === "MOVE" && x.event.data.entityId === "hero",
    ).length,
  };
}

const anchors = {
  WEAPON: "iron-sword",
  ARMOR: "iron-cuirass",
  RING: "copper-band",
  AMULET: "apprentice-pendant",
  BOOTS: "trailworn-boots",
  GLOVES: "brawlers-wraps",
  HELMET: "iron-cap",
  CLOAK: "travelers-cloak",
  BELT: "rope-girdle",
} as const;
export function summarizePairs(
  runs: {
    baseline: ReturnType<typeof measurePressure>;
    treatment: ReturnType<typeof measurePressure>;
  }[],
) {
  return {
    pairs: runs.length,
    ...Object.fromEntries(
      ["health", "damage", "healing", "manaSpent", "casts"].map((key) => [
        key + "Gain",
        mean(
          runs.map(
            (x) =>
              Number(x.treatment[key as keyof typeof x.treatment]) -
              Number(x.baseline[key as keyof typeof x.baseline]),
          ),
        ),
      ]),
    ),
    baselineDeaths: runs.filter((x) => x.baseline.dead).length,
    treatmentDeaths: runs.filter((x) => x.treatment.dead).length,
  };
}

if (import.meta.main) {
  const seeds = Array.from({ length: 8 }, (_, i) => `might-slot-v3-${i}`);
  const rows = quiet(() =>
    EquipmentTypeSchema.options.map((type) => {
      const item = equipmentFactory(type, type, referenceHero("physical"));
      const attributes = new Set(item.modifiers.map((x) => x.attribute));
      const builds: MightReferenceBuild[] = [];
      if (
        attributes.has("intelligence") ||
        attributes.has("magicPenetration") ||
        attributes.has("blessed") ||
        attributes.has("manaRegen")
      )
        builds.push("caster");
      if (
        attributes.has("strength") ||
        attributes.has("armorPenetration") ||
        attributes.has("lifesteal")
      )
        builds.push("physical");
      if (
        attributes.has("agility") ||
        attributes.has("movement") ||
        attributes.has("critChance")
      )
        builds.push("agility");
      if (
        attributes.has("armor") ||
        attributes.has("magicResistance") ||
        attributes.has("vitality") ||
        attributes.has("healthRegen")
      )
        builds.push("tank");
      if (!builds.length) builds.push("tank", "physical");
      const runs = builds.flatMap((build) =>
        [6, 12].flatMap((rounds) =>
          [false, true].flatMap((depleted) =>
            [false, true].flatMap((armored) =>
              [false, true].flatMap((approach) =>
                seeds.map((seed) => {
                  const input = {
                    build,
                    rounds,
                    depleted,
                    armored,
                    approach,
                    seed,
                  };
                  const anchor: EquipmentType =
                    item.equipmentSlot === "WEAPON" && build === "caster"
                      ? "oakwarden-staff"
                      : anchors[item.equipmentSlot];
                  return {
                    input,
                    anchor,
                    baseline: measurePressure({ ...input, item: anchor }),
                    treatment: measurePressure({ ...input, item: type }),
                  };
                }),
              ),
            ),
          ),
        ),
      );
      return {
        type,
        slot: item.equipmentSlot,
        builds,
        summary: summarizePairs(runs),
        runs,
      };
    }),
  );
  await Bun.write(
    "docs/might/assessments/equipment-probes-v3.json",
    JSON.stringify({
      version: 3,
      bun: Bun.version,
      reference: MIGHT_REFERENCE,
      seeds,
      anchors,
      conditions:
        "Paired slot swaps, all other slots and base stats fixed within each pair; real tactical AI, close and five-tile approach layouts, two stationary 65-raw mixed threats at range 8, 6/12 rounds, fresh/depleted, 0/30 armor and 0/20 MR. Caster weapon pairs use Oakwarden as the established 150-Might peer; physical weapon pairs use the 100-Might Iron Sword anchor. Endpoints are not additive score components. Same initial seeds do not align later random draws.",
      rows,
    }),
  );
  for (const { runs, ...row } of rows) console.log(JSON.stringify(row));
}
