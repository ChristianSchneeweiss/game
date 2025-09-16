import { BaseEntity } from "../../base-entity";
import { createSpellFromType } from "../../spells/base/spell-from-type";
import type { SpellType } from "../../spells/base/spell-types";
import type {
  Entity,
  EntityAttributes,
  Loot,
  SpecialAttributes,
  Spell,
  Team,
} from "../../types";
import { randomInArray } from "../../utils/random-in-array";
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
  xp: number;
  loot: Loot;
  spells: SpellType[];
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
    xp,
    loot,
    spells,
  }: EnemyParams) {
    super(id, name, team, maxHealth, maxMana, baseAttributes);
    this.type = type;
    this.xp = xp;
    this.loot = loot;
    if (baseSpecialAttributes) {
      this.baseSpecialAttributes = {
        ...this.baseSpecialAttributes,
        ...baseSpecialAttributes,
      };
    }
    this.spells = spells.map((spell) =>
      createSpellFromType(`${this.id}-${spell}`, spell)
    );
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

    let targets: Entity[] = [];
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
    for (let i = 0; i < maxEnemies; i++) {
      const randomEnemy = randomInArray(
        validTargets,
        this.battleManager.getPRNG()
      );
      if (!randomEnemy) throw new Error(`No random enemy found`);
      targets.push(randomEnemy);
    }
    for (let i = 0; i < maxAllies; i++) {
      const randomAlly = randomInArray(
        validTargets,
        this.battleManager.getPRNG()
      );
      if (!randomAlly) throw new Error(`No random ally found`);
      targets.push(randomAlly);
    }
    return targets;
  }
}
