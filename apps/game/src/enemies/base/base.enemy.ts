import { BaseEntity } from "../../base-entity";
import type {
  Entity,
  EntityAttributes,
  Loot,
  SpecialAttributes,
  Spell,
  Team,
} from "../../types";
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
  }

  getAction(): { spell: Spell; targets: Entity[] } {
    if (!this.battleManager) throw new Error("Battle manager not set");
    const spell = this.spells.find((s) => s.canCast(this));
    if (!spell) {
      throw new Error(`No spell found for ${this.name}`);
    }

    const validTargets = spell.getValidTargets(this);
    if (!validTargets) {
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
    for (let i = 0; i < targetType.enemies; i++) {
      const rng = this.battleManager.getRNG();
      const rn = Math.round(rng * (validTargets.length - 1));
      const randomEnemy = validTargets[rn];
      if (!randomEnemy) throw new Error(`No random enemy found ${rn} ${rng}`);
      targets.push(randomEnemy);
    }
    for (let i = 0; i < targetType.allies; i++) {
      const rng = this.battleManager.getRNG();
      const rn = Math.round(rng * (validTargets.length - 1));
      const randomAlly = validTargets[rn];
      if (!randomAlly) throw new Error(`No random ally found ${rn} ${rng}`);
      targets.push(randomAlly);
    }
    return targets;
  }
}
