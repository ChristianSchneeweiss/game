import { BaseEntity } from "../../apps/game/src/base-entity";
import { BM } from "../../apps/game/src/bm";
import { itemFactory } from "../../apps/game/src/items/equipment/item-factory";
import {
  MIGHT_REFERENCE,
  type MightReferenceBuild,
} from "../../apps/game/src/might/reference-profile";
import { passiveSkillFactory } from "../../apps/game/src/passive-skills/base/passive-skill.factory";
import type { PassiveType } from "../../apps/game/src/passive-skills/base/passive-types";
import { createSpellFromType } from "../../apps/game/src/spells/base/spell-from-type";
import { planEnemyTurn } from "../../apps/game/src/tactical/ai";

export function referenceHero(
  build: MightReferenceBuild,
  id = "hero",
  passive?: PassiveType,
) {
  const profile = MIGHT_REFERENCE.profiles[build];
  const hero = new BaseEntity(
    id,
    `Reference ${build}`,
    "TEAM_A",
    profile.attributes.vitality * 10,
    profile.attributes.intelligence * 5,
    { ...profile.attributes, movement: 3 },
  );
  hero.isBot = false;
  hero.baseSpecialAttributes.armor = MIGHT_REFERENCE.armor;
  hero.baseSpecialAttributes.magicResistance = MIGHT_REFERENCE.magicResistance;
  hero.baseSpecialAttributes.critChance = MIGHT_REFERENCE.critChance;
  for (const type of [...profile.equipment, ...MIGHT_REFERENCE.accessories]) {
    const item = itemFactory(type, `${id}:${type}`, hero);
    hero.equipped[item.equipmentSlot] = item;
  }
  hero.spells = ["basic-attack" as const, ...profile.spells].map((type) =>
    createSpellFromType(`${id}:${type}`, type),
  );
  if (passive)
    hero.passiveSkills = [
      passiveSkillFactory(passive, `${id}:${passive}`, hero),
    ];
  return hero;
}

/** Same public turn lifecycle as the tactical battle driver, bounded before extra upkeep. */
export function playReferenceBattle(bm: BM, rounds: number) {
  let decisions = 0;
  while (!bm.isGameOver() && bm.getCurrentRoundNumber() < rounds) {
    if (++decisions > rounds * bm.entities.length * 4)
      throw new Error("Reference decision limit exceeded");
    const head = bm.getCurrentRound().orderQueue[0]!;
    if (
      bm
        .getEntityById(head)
        ?.activeEffects.some((effect) => effect.preventsAction)
    ) {
      bm.postTurn(head);
      continue;
    }
    bm.preTurn();
    if (bm.isGameOver() || bm.getCurrentRoundNumber() >= rounds) break;
    const actor = bm.grid!.activation!.entityId;
    const plan = planEnemyTurn(bm);
    if (plan.destination && !bm.moveEntity(actor, plan.destination))
      throw new Error("Illegal reference move");
    if (plan.spellId && plan.selection) {
      if (!bm.safeCastSpatial(actor, plan.spellId, plan.selection))
        throw new Error("Illegal reference cast");
    } else if (!bm.passTurn(actor)) throw new Error("Illegal reference pass");
    bm.postTurn(actor);
  }
}

export function referenceImpacts(bm: BM) {
  return bm.events.flatMap(({ event }) =>
    event.eventType === "SPELL_CAST" || event.eventType === "EFFECT_TRIGGER"
      ? (event.data.impacts ?? [])
      : [],
  );
}

export function mean(values: number[]) {
  return (
    Math.round(
      (values.reduce((sum, value) => sum + value, 0) / values.length) * 100,
    ) / 100
  );
}

export function quiet<T>(run: () => T): T {
  const original = console.log;
  console.log = () => {};
  try {
    return run();
  } finally {
    console.log = original;
  }
}
