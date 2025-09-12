import { BaseEntity } from "../../base-entity";
import type { EntityAttributes, Loot, Team } from "../../types";
import type { EnemyType } from "./enemy-types";

type EnemyParams = {
  id: string;
  type: EnemyType;
  name: string;
  team: Team;
  maxHealth: number;
  maxMana: number;
  baseAttributes: EntityAttributes;
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
    xp,
    loot,
  }: EnemyParams) {
    super(id, name, team, maxHealth, maxMana, baseAttributes);
    this.type = type;
    this.xp = xp;
    this.loot = loot;
  }
}
