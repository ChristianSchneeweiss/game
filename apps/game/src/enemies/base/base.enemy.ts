import { BaseEntity } from "../../base-entity";
import type {
  Affinities,
  Entity,
  EntityAttributes,
  Equipped,
  SpecialAttributes,
  Team,
} from "../../entity-types";
import type { Equipment } from "../../items/equipment/equipment";
import { itemFactory } from "../../items/equipment/item-factory";
import type { ItemType } from "../../items/item-types";
import { passiveSkillFactory } from "../../passive-skills/base/passive-skill.factory";
import type { PassiveType } from "../../passive-skills/base/passive-types";
import { createSpellFromType } from "../../spells/base/spell-from-type";
import type { SpellType } from "../../spells/base/spell-types";
import type { Loot, LootEntity, Spell } from "../../types";
import { defaultSpellDropRate } from "../../utils/loot";
import { uniqueRandomFromArray } from "../../utils/random-in-array";
import type { EnemyType } from "./enemy-types";

type EnemyParams = {
  id: string;
  type: EnemyType;
  name: string;
  team: Team;
  maxHealth: number;
  maxMana: number;
  baseAttributes: EntityAttributes;
  baseSpecialAttributes?: Partial<SpecialAttributes>;
  baseAffinities?: Partial<Affinities>;
  xp: number;
  loot: { gold: number; items?: LootEntity[] };
  spells: SpellType[];
  passiveSkills?: PassiveType[];
  equipment?: ItemType[];
};

export class BaseEnemy extends BaseEntity {
  public type: EnemyType;
  public xp: number;
  public loot: Loot;

  constructor({
    id,
    type,
    name,
    team,
    maxHealth,
    maxMana,
    baseAttributes,
    baseSpecialAttributes,
    baseAffinities,
    equipment,
    xp,
    loot,
    spells,
    passiveSkills,
  }: EnemyParams) {
    super(id, name, team, maxHealth, maxMana, baseAttributes);
    this.type = type;
    this.xp = xp;
    this.loot = {
      gold: loot.gold,
      items:
        loot.items ??
        defaultSpellDropRate(spells.filter((s) => s !== "basic-attack")),
    };
    const equipments: Equipment[] =
      equipment?.map((equipment) => itemFactory(equipment, this, id)) ?? [];
    this.equipped = equipments.reduce((acc, equipment) => {
      acc[equipment.equipmentSlot] = equipment;
      return acc;
    }, {} as Equipped);

    if (baseAffinities) {
      this.baseAffinities = {
        ...this.baseAffinities,
        ...baseAffinities,
      };
    }
    if (baseSpecialAttributes) {
      this.baseSpecialAttributes = {
        ...this.baseSpecialAttributes,
        ...baseSpecialAttributes,
      };
    }

    this.spells = spells.map((spell) =>
      createSpellFromType(`${this.id}-${spell}`, spell)
    );
    this.passiveSkills =
      passiveSkills?.map((passive) =>
        passiveSkillFactory(passive, `${this.id}-${passive}`, this)
      ) ?? [];
  }

  getAction(): { spell: Spell; targets: Entity[] } {
    if (!this.battleManager) throw new Error("Battle manager not set");
    const spell = this.spells.find((s) => s.canCast(this));
    if (!spell) {
      throw new Error(`No spell found for ${this.name}`);
    }

    const validTargets = spell.getValidTargets(this);
    if (validTargets === null) {
      throw new Error(
        `No valid targets found for ${this.name} to cast spell ${spell.config.id}`
      );
    }
    const targets = this.getTargets(spell, validTargets);

    return { spell, targets };
  }

  /**
   * Get the targets for the spell. Can be overridden to change the target selection logic.
   * @param spell - The spell to get the targets for
   * @param validTargets - The valid targets for the spell
   * @returns The targets for the spell
   */
  protected getTargets(spell: Spell, validTargets: Entity[]): Entity[] {
    if (!this.battleManager) throw new Error("Battle manager not set");

    const targetType = spell.getTargetType();

    // this fixes the edge case where we have infinity as target type for aoe spells
    const maxEnemies = Math.min(
      targetType.enemies,
      this.battleManager.getAliveEntities().filter((e) => e.team !== this.team)
        .length
    );
    const maxAllies = Math.min(
      targetType.allies,
      this.battleManager.getTeam(this.team).length
    );
    const validEnemies = validTargets.filter((e) => e.team !== this.team);
    const validAllies = validTargets.filter((e) => e.team === this.team);
    return [
      ...uniqueRandomFromArray(
        validEnemies,
        maxEnemies,
        this.battleManager.getPRNG()
      ),
      ...uniqueRandomFromArray(
        validAllies,
        maxAllies,
        this.battleManager.getPRNG()
      ),
    ];
  }
}
