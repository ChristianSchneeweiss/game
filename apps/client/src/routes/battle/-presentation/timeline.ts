import type { InBetweenCharacterData } from "@loot-game/game/dungeons/types";
import type { Entity } from "@loot-game/game/entity-types";
import type { EffectTracking } from "@loot-game/game/bm";
import type { TimelineEventFull } from "@loot-game/game/timeline-events";
import SuperJSON from "superjson";
import type { SpellType } from "@loot-game/game/spells/base/spell-types";
import type { GridState, Tile } from "@loot-game/game/tactical/types";

export type Stats = {
  team?: Entity["team"];
  health: number;
  mana: number;
  deltaHealth: number;
  deltaMana: number;
  cooldowns: Map<string, number>;
  activeEffects: string[];
  roll?: number;
  flags: { casting: boolean; isCrit: boolean; dead: boolean };
};
export type VisualCue = {
  path?: Tile[];
  tiles?: Tile[];
  strikeOrder?: string[];
  kind: TimelineEventFull["event"]["eventType"];
  casterId?: string;
  targetIds: string[];
  label: string;
  style: "melee" | "spell" | "heal" | "ward" | "effect" | "update";
  skillType?: SpellType;
  effectId?: string;
  major?: boolean;
};
// Presentation categories only. Unknown spells use a generic cast; this never
// infers damage, elemental rules or additional targets.
const meleeSpells = new Set([
  "basic-attack",
  "festering-blow",
  "final-verdict",
  "bladestorm-rhythm",
  "staggering-jab",
  "crude-strike",
  "vital-strike",
  "splinter-shot",
  "precise-thrust",
  "crushing-blow",
  "stunning-strike",
  "torrent-spiral",
  "tidepiercer-thrust",
  "rupture",
  "bulwark-bash",
  "earthshatter",
  "storm-pulse",
]);
export type DisplayFrame = {
  stats: Map<string, Stats>;
  grid?: GridState;
  cue?: VisualCue;
  event?: TimelineEventFull;
};

/** Pure event reduction. Never reconstructs combatants or invokes spell/RNG methods. */
export function buildTimeline(
  participants: Entity[],
  events: TimelineEventFull[],
  starts?: InBetweenCharacterData[],
  effects: EffectTracking = new Map(),
): DisplayFrame[] {
  const participantsById = new Map(
    participants.map((entity) => [entity.id, entity]),
  );
  const owners = new Map(
    participants.flatMap((entity) =>
      entity.spells.map(
        (spell) => [spell.config.id, { entity, spell }] as const,
      ),
    ),
  );
  let stats: Map<string, Stats> = new Map(
    participants.map((entity) => {
      const start = starts?.find((s) => s.characterId === entity.id);
      const health = start?.health ?? entity.health;
      return [
        entity.id,
        {
          health,
          team: entity.team,
          mana: start?.mana ?? entity.mana,
          deltaHealth: 0,
          deltaMana: 0,
          cooldowns: new Map(
            entity.spells.map((s) => [s.config.id, s.currentCooldown ?? 0]),
          ),
          activeEffects: (entity.activeEffects ?? []).map((e) => e.id),
          flags: { casting: false, isCrit: false, dead: health <= 0 },
        } satisfies Stats,
      ] as const;
    }),
  );
  const setup = events.find(
    (full) => full.event.eventType === "GRID_START",
  )?.event;
  let grid: GridState | undefined =
    setup?.eventType === "GRID_START"
      ? { ...setup.data, activation: null }
      : undefined;
  const frames: DisplayFrame[] = [{ stats, grid }];
  for (const full of events) {
    stats = new Map(
      [...stats].map(([id, s]) => [
        id,
        {
          ...s,
          deltaHealth: 0,
          deltaMana: 0,
          roll: undefined,
          cooldowns: new Map(s.cooldowns),
          activeEffects: [...s.activeEffects],
          flags: { ...s.flags, casting: false, isCrit: false },
        },
      ]),
    );
    const event = full.event;
    const cue: VisualCue = {
      kind: event.eventType,
      targetIds: [],
      label: "Battle update",
      style: "update",
    };
    if (event.eventType === "GRID_START") {
      grid = { ...event.data, activation: null };
      cue.label = "Battlefield prepared";
    } else if (event.eventType === "ACTIVATION_START") {
      if (grid) grid = { ...grid, activation: { ...event.data } };
      cue.casterId = event.data.entityId;
      cue.label = "Turn begins";
    } else if (event.eventType === "ACTIVATION_END") {
      if (grid) grid = { ...grid, activation: null };
      cue.casterId = event.data.entityId;
      cue.label = event.data.reason === "pass" ? "End turn" : "Turn ends";
    } else if (event.eventType === "TEAM_CHANGE") {
      const actor = stats.get(event.data.entityId);
      if (actor) actor.team = event.data.team;
      cue.label = "Allegiance changes";
      cue.targetIds = [event.data.entityId];
    } else if (event.eventType === "MOVE") {
      if (grid)
        grid = {
          ...grid,
          positions: {
            ...grid.positions,
            [event.data.entityId]: event.data.to,
          },
          activation: grid.activation
            ? {
                ...grid.activation,
                spent: grid.activation.allowance - event.data.movementRemaining,
              }
            : null,
        };
      cue.casterId = event.data.entityId;
      cue.path = [event.data.from, ...event.data.path];
      cue.label = `Move ${event.data.movementSpent} steps`;
    } else if (
      event.eventType === "SPELL_CAST" ||
      event.eventType === "EFFECT_TRIGGER"
    ) {
      if (event.eventType === "SPELL_CAST") {
        const data = event.data;
        cue.tiles = data.spatial?.tiles;
        cue.strikeOrder = data.strikeOrder;
        if (data.spatial)
          cue.targetIds.push(...data.spatial.actualRecipientIds);
        const owner = owners.get(data.spellId);
        cue.casterId =
          data.spatial?.casterId ??
          owner?.entity.id ??
          participantsById.get(data.spellId)?.id;
        cue.label = owner?.spell.config.name ?? "Effect applied";
        cue.skillType = owner?.spell.config.type;
        cue.major =
          owner?.spell.config.tier === "S" ||
          (owner?.spell.config.manaCost ?? 0) >= 35;
        cue.style = data.healingApplied?.size
          ? "heal"
          : !data.damageApplied?.size && data.effectsApplied?.size
            ? "ward"
            : owner && meleeSpells.has(owner.spell.config.type)
              ? "melee"
              : "spell";
        const appliedIds = [...(data.effectsApplied?.values() ?? [])].flat();
        const passiveOnly =
          data.origin === "passive" ||
          (data.version === undefined &&
            data.spellId === cue.casterId &&
            data.roll === 0 &&
            appliedIds.length > 0 &&
            !data.damageApplied?.size &&
            !data.healingApplied?.size &&
            appliedIds.every(
              (id) => effects.get(id)?.effectType === "PASSIVE",
            ));
        if (passiveOnly) {
          cue.label = "Passive effect";
          cue.style = "effect";
          cue.skillType = undefined;
          if (appliedIds.length === 1) cue.effectId = appliedIds[0];
        }
        const caster = owner && stats.get(owner.entity.id);
        if (caster && owner && !passiveOnly) {
          // Version 1 recordings only contain summaries; retain their legacy
          // interpretation. New events describe payment explicitly and never
          // infer it from the spell used by a delayed consequence.
          const payment =
            data.version === 2
              ? data.payment
              : {
                  manaSpent: owner.spell.config.manaCost,
                  cooldown: owner.spell.config.cooldown
                    ? owner.spell.config.cooldown + 1
                    : 0,
                };
          if (payment) {
            caster.deltaMana = -Math.min(caster.mana, payment.manaSpent);
            caster.mana += caster.deltaMana;
            caster.cooldowns.set(owner.spell.config.id, payment.cooldown);
          }
          caster.flags.casting = true;
          caster.flags.isCrit = data.isCrit;
          caster.roll = data.roll;
        }
      } else {
        cue.effectId = event.data.effectId;
        const effect = effects.get(event.data.effectId);
        cue.casterId = effect?.sourceId;
        cue.label = effect
          ? `${effect.effectType} triggers`
          : "Effect triggers";
        cue.style = event.data.healingApplied?.size ? "heal" : "effect";
        if (effect) cue.targetIds.push(effect.targetId);
      }
      const { damageApplied, healingApplied, effectsApplied } = event.data;
      for (const impact of event.data.impacts ?? []) {
        const target = stats.get(impact.targetId);
        if (target) {
          target.health += impact.healthChange;
          target.deltaHealth += impact.healthChange;
          target.flags.dead = target.health <= 0;
          cue.targetIds.push(impact.targetId);
        }
      }
      for (const entity of participants) {
        const s = stats.get(entity.id)!;
        if (event.data.version !== 2 && damageApplied?.has(entity.id)) {
          const damage = damageApplied.get(entity.id)!;
          s.health = Math.max(0, s.health - damage);
          s.deltaHealth -= damage;
          cue.targetIds.push(entity.id);
        }
        if (event.data.version !== 2 && healingApplied?.has(entity.id)) {
          const healing = Math.min(
            healingApplied.get(entity.id)!,
            entity.maxHealth - s.health,
          );
          s.health += healing;
          s.deltaHealth += healing;
          cue.targetIds.push(entity.id);
        }
        const applied = effectsApplied?.get(entity.id);
        if (applied) {
          s.activeEffects = [...new Set([...s.activeEffects, ...applied])];
          cue.targetIds.push(entity.id);
        }
        s.flags.dead = s.health <= 0;
      }
    } else if (event.eventType === "EFFECT_REMOVAL") {
      cue.effectId = event.data.effectId;
      cue.style = "effect";
      const effect = effects.get(event.data.effectId);
      cue.label = effect ? `${effect.effectType} ends` : "Effect ends";
      for (const [id, s] of stats) {
        if (s.activeEffects.includes(event.data.effectId))
          cue.targetIds.push(id);
        s.activeEffects = s.activeEffects.filter(
          (id) => id !== event.data.effectId,
        );
      }
    } else if (event.eventType === "DEATH") {
      const s = stats.get(event.data.id);
      if (s) {
        s.health = 0;
        s.flags.dead = true;
      }
      cue.targetIds = [event.data.id];
      cue.label = "Fallen";
    } else if (event.eventType === "REDUCE_SPELL_COOLDOWN") {
      cue.label = "Cooldowns recover";
      for (const { spellId, amount } of event.data) {
        const owner = owners.get(spellId);
        const s = owner && stats.get(owner.entity.id);
        if (s)
          s.cooldowns.set(
            spellId,
            Math.max(0, (s.cooldowns.get(spellId) ?? 0) - amount),
          );
      }
    } else if (event.eventType === "REGEN") {
      cue.label = "Regeneration";
      cue.targetIds = [event.data.entityId];
      const s = stats.get(event.data.entityId);
      const entity = participantsById.get(event.data.entityId);
      if (s && entity) {
        s.deltaHealth = Math.min(
          event.data.healthRegen,
          entity.maxHealth - s.health,
        );
        s.deltaMana = Math.min(event.data.manaRegen, entity.maxMana - s.mana);
        s.health += s.deltaHealth;
        s.mana += s.deltaMana;
      }
    }
    cue.targetIds = [...new Set(cue.targetIds)];
    if (
      cue.kind === "SPELL_CAST" &&
      cue.style !== "effect" &&
      cue.targetIds.length > 1
    )
      cue.major = true;
    frames.push({ stats, grid, cue, event: full });
  }
  return frames;
}

export function historyChange(
  previous: TimelineEventFull[],
  next: TimelineEventFull[],
) {
  if (next.length < previous.length) return "replace";
  for (let i = 0; i < previous.length; i++) {
    if (SuperJSON.stringify(previous[i]) !== SuperJSON.stringify(next[i]))
      return "replace";
  }
  return previous.length === next.length ? "same" : "append";
}
