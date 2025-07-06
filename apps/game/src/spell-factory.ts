import { nanoid } from "nanoid";
import { StatModifierEffect } from "./effect";
import { BaseEntity } from "./base-entity";
import {
  AoeDamageSpell,
  ApplyStatusSpell,
  AutoAttackSpell,
  DamageSpell,
  DotSpell,
  HealingSpell,
  HotSpell,
  MindControlSpell,
  ResurrectionSpell,
  ShieldSpell,
  SummonSpell,
  TimeWarpSpell,
} from "./spells";
import type { Spell, StatModifier } from "./types";

class SpellFactory {
  static createAutoAttack(): Spell {
    return new AutoAttackSpell({
      id: nanoid(),
      type: "autoattack",
      name: "Auto-Attack",
      description: "Automatically attacks the nearest enemy.",
    });
  }

  static createFireball(): Spell {
    return new DamageSpell(
      {
        id: "fireball",
        name: "Fireball",
        description: "Launches a ball of fire at a single enemy.",
        manaCost: 25,
        cooldown: 2,
        targetType: "SINGLE_ENEMY",
      },
      30,
      "FIRE"
    );
  }

  static createFireNova(): Spell {
    return new AoeDamageSpell(
      {
        id: "firenova",
        name: "Fire Nova",
        description: "Unleashes a nova of fire that damages all enemies.",
        manaCost: 50,
        cooldown: 4,
      },
      30,
      "FIRE"
    );
  }

  static createHeal(): Spell {
    return new HealingSpell(
      {
        id: "heal",
        name: "Heal",
        description: "Restores health to a single ally.",
        manaCost: 30,
        cooldown: 2,
        targetType: "SINGLE_ALLY",
      },
      35
    );
  }

  static createRegenerationSpell(): Spell {
    return new HotSpell(
      {
        id: "regeneration",
        name: "Regeneration",
        description: "Gradually restores health over 3 rounds.",
        manaCost: 35,
        cooldown: 3,
        targetType: "SINGLE_ALLY",
      },
      15,
      3
    );
  }

  static createStrengthBuff(): Spell {
    return new ApplyStatusSpell(
      {
        id: "strengthbuff",
        name: "Strength Buff",
        description: "Increases an ally's strength for 3 rounds.",
        manaCost: 35,
        cooldown: 3,
        targetType: "SINGLE_ALLY",
      },
      (source, target, self) => {
        const effectId = `strength_buff_${nanoid()}`;

        const modifier: StatModifier = {
          id: `${effectId}_str`,
          attribute: "strength",
          value: 5,
          operation: "ADD",
        };

        return new StatModifierEffect(
          self,
          "BUFF",
          3,
          source,
          [modifier],
          target
        );
      }
    );
  }

  static createIntellectAmp(): Spell {
    return new ApplyStatusSpell(
      {
        id: "intellectamp",
        name: "Intellect Amplifier",
        description: "Multiplies an ally's intelligence by 1.5 for 3 rounds.",
        manaCost: 45,
        cooldown: 4,
        targetType: "SINGLE_ALLY",
      },
      (source, target, self) => {
        const effectId = `intellect_amp_${nanoid()}`;

        const modifier: StatModifier = {
          id: `${effectId}_int`,
          attribute: "intelligence",
          value: 1.5,
          operation: "MULTIPLY",
        };

        return new StatModifierEffect(
          self,
          "BUFF",
          3,
          source,
          [modifier],
          target
        );
      }
    );
  }

  static createBattleStance(): Spell {
    return new ApplyStatusSpell(
      {
        id: "battlestance",
        name: "Battle Stance",
        description: "Increases strength by 3 and vitality by 2 for 4 rounds.",
        manaCost: 50,
        cooldown: 5,
        targetType: "SELF",
      },
      (source, target, self) => {
        const baseEffectId = `battle_stance_${nanoid()}`;

        const strengthMod: StatModifier = {
          id: `${baseEffectId}_str`,
          attribute: "strength",
          value: 3,
          operation: "ADD",
        };

        const vitalityMod: StatModifier = {
          id: `${baseEffectId}_vit`,
          attribute: "vitality",
          value: 2,
          operation: "ADD",
        };

        return new StatModifierEffect(
          self,
          "BUFF",
          4,
          source,
          [strengthMod, vitalityMod],
          target
        );
      }
    );
  }

  static createPoison(): Spell {
    return new DotSpell(
      {
        id: "poison",
        name: "Poison",
        description: "Poisons an enemy, dealing damage over time for 3 rounds.",
        manaCost: 30,
        cooldown: 3,
        targetType: "SINGLE_ENEMY",
      },
      10,
      "POISON",
      3
    );
  }

  static createShield(): Spell {
    return new ShieldSpell(
      {
        id: "shield",
        name: "Shield",
        description:
          "Creates a shield around an ally, blocking damage for 3 rounds.",
        manaCost: 30,
        cooldown: 3,
        targetType: "SINGLE_ALLY",
      },
      25,
      3
    );
  }
}

class AdvancedSpellFactory {
  static createSummonMinion(): Spell {
    return new SummonSpell(
      {
        id: "summonminion",
        name: "Summon Minion",
        description: "Summons a loyal minion to fight for you.",
        manaCost: 60,
        cooldown: 4,
      },
      () => {
        const id = `minion_${nanoid()}`;
        const minion = new BaseEntity(id, "Summoned Minion", "TEAM_A");

        minion.baseAttributes.strength = 8;
        minion.baseAttributes.intelligence = 5;
        minion.baseAttributes.vitality = 12;
        minion.maxHealth = 60;
        minion.health = 60;
        minion.maxMana = 40;
        minion.mana = 40;

        minion.spells = [SpellFactory.createFireball()];

        return minion;
      }
    );
  }

  static createResurrection(): Spell {
    return new ResurrectionSpell(
      {
        id: "resurrection",
        name: "Resurrection",
        description: "Brings a fallen ally back to life with 50% health.",
        manaCost: 80,
        cooldown: 5,
      },
      50
    );
  }

  static createTimeWarp(): Spell {
    return new TimeWarpSpell(
      {
        id: "timewarp",
        name: "Time Warp",
        description: "Grants an extra action this turn.",
        manaCost: 40,
        cooldown: 6,
      },
      1
    );
  }

  static createMindControl(): Spell {
    return new MindControlSpell(
      {
        id: "mindcontrol",
        name: "Mind Control",
        description: "Take control of an enemy for 2 rounds.",
        manaCost: 70,
        cooldown: 8,
      },
      2
    );
  }
}

const availableSpells: Spell[] = [
  SpellFactory.createFireball(),
  SpellFactory.createFireNova(),
  SpellFactory.createHeal(),
  SpellFactory.createRegenerationSpell(),
  SpellFactory.createStrengthBuff(),
  SpellFactory.createIntellectAmp(),
  SpellFactory.createBattleStance(),
  SpellFactory.createPoison(),
  SpellFactory.createShield(),
  SpellFactory.createAutoAttack(),
  AdvancedSpellFactory.createSummonMinion(),
  AdvancedSpellFactory.createResurrection(),
  AdvancedSpellFactory.createTimeWarp(),
  AdvancedSpellFactory.createMindControl(),
] as const;

const spellMap = new Map<string, Spell>(
  availableSpells.map((spell) => [spell.config.id, spell])
);

export class SpellBook {
  static getSpell(id: string): Spell {
    const spell = spellMap.get(id);
    if (!spell) {
      throw new Error(`Spell not found: ${id}`);
    }
    return spell;
  }
}
