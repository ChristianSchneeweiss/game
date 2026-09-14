import type { Entity } from "../entity-types";
import type { BattleManager } from "../battle-types";
import type { DamageType, Spell } from "../types";
import { minMaxRoll } from "../utils/min-max-roll";
import type { SpellModule, SpellModuleReturn } from "./types";
import { canResolveImpact } from "../spells/base/targets";

type DamageInputs = { caster: Entity; target: Entity; roll: number };
type DamageProc = {
  chance: number;
  bonusDamage?: (inputs: DamageInputs) => number;
  ignoreDefense?: number;
};

export abstract class DamageModule implements SpellModule {
  constructor(private readonly proc?: DamageProc) {}
  public abstract type: DamageType;
  public abstract getRawDamage(
    caster: Entity,
    target: Entity,
    roll: number,
  ): number;

  /** Pure possible range: descriptions never sample combat randomness. */
  public getDamageRange(caster: Entity, target = caster) {
    const bonus = (roll: number) =>
      this.proc?.bonusDamage?.({ caster, target, roll }) ?? 0;
    return {
      min:
        this.getRawDamage(caster, target, 0) +
        (this.proc?.chance === 1 ? bonus(0) : 0),
      max:
        this.getRawDamage(caster, target, 20) +
        ((this.proc?.chance ?? 0) > 0 ? bonus(20) : 0),
    };
  }

  /** AI heuristic only: current defenses and proc chances, without invoking reactive hooks or RNG. */
  public estimateDamage(caster: Entity, target: Entity): number {
    const resistance = target.getAttribute(
      this.type === "MAGICAL" ? "magicResistance" : "armor",
    );
    const penetration = caster.getAttribute(
      this.type === "MAGICAL" ? "magicPenetration" : "armorPenetration",
    );
    const critChance = Math.max(
      0,
      Math.min(1, caster.getAttribute("critChance")),
    );
    const evaluate = (roll: number, proc?: DamageProc) => {
      const damage =
        this.getRawDamage(caster, target, roll) +
        (proc?.bonusDamage?.({ caster, target, roll }) ?? 0);
      const defense =
        resistance * (1 - Math.max(0, Math.min(1, proc?.ignoreDefense ?? 0))) -
        penetration;
      const normal = Math.max(0, damage - defense);
      const critical = Math.max(
        0,
        damage * (1 + caster.getAttribute("critDamage")) - defense,
      );
      return normal * (1 - critChance) + critical * critChance;
    };
    const minRoll = Math.max(0, Math.min(20, caster.getAttribute("blessed")));
    const withoutProc = (evaluate(minRoll) + evaluate(20)) / 2;
    if (!this.proc) return withoutProc;
    const withProc =
      (evaluate(minRoll, this.proc) + evaluate(20, this.proc)) / 2;
    return withoutProc * (1 - this.proc.chance) + withProc * this.proc.chance;
  }

  public applyRawDamage(
    caster: Entity,
    targets: Entity[],
    roll: number,
    battleManager: BattleManager,
    spell: Spell,
  ): SpellModuleReturn {
    const returns = targets.map((target) => {
      if (!canResolveImpact(caster, target)) return { isCrit: false };
      const proc =
        this.proc && battleManager.getRNG() < this.proc.chance
          ? this.proc
          : undefined;
      const damage = Math.round(
        this.getRawDamage(caster, target, roll) +
          (proc?.bonusDamage?.({ caster, target, roll }) ?? 0),
      );
      return battleManager.handler.damage(
        spell,
        damage,
        this.type,
        caster,
        target,
        { ignoreDefense: proc?.ignoreDefense },
      );
    });
    return battleManager.handler.mergeHandlerReturns(returns);
  }
}

export class MinMaxDamageModule extends DamageModule {
  constructor(
    public type: DamageType,
    public damageCalc?: {
      min: number;
      max: number;
      attributeScaling?: (params: {
        caster: Entity;
        target: Entity;
        roll: number;
      }) => number;
    },
    proc?: DamageProc,
  ) {
    super(proc);
  }

  getRawDamage(caster: Entity, target: Entity, roll: number): number {
    if (!this.damageCalc) {
      throw new Error("Damage calculation module is not configured");
    }
    const baseDamage = minMaxRoll(
      this.damageCalc.min,
      this.damageCalc.max,
      roll,
    );
    const scalingDamage =
      this.damageCalc.attributeScaling?.({ caster, target, roll }) ?? 0;
    return baseDamage + scalingDamage;
  }
}

export class TotalDamageModule extends DamageModule {
  constructor(
    public type: DamageType,
    public totalDamageCalc: (params: {
      caster: Entity;
      target: Entity;
      roll: number;
    }) => number,
  ) {
    super();
  }

  getRawDamage(caster: Entity, target: Entity, roll: number): number {
    return this.totalDamageCalc({ caster, target, roll });
  }
}
