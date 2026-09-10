import type { InBetweenCharacterData } from "@loot-game/game/dungeons/types";
import type { Entity } from "@loot-game/game/entity-types";
import type { EffectTracking } from "@loot-game/game/bm";
import type { TimelineEventFull } from "@loot-game/game/timeline-events";
import SuperJSON from "superjson";
import type { SpellType } from "@loot-game/game/spells/base/spell-types";

export type Stats = {
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
  const frames: DisplayFrame[] = [{ stats }];
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
    if (
      event.eventType === "SPELL_CAST" ||
      event.eventType === "EFFECT_TRIGGER"
    ) {
      if (event.eventType === "SPELL_CAST") {
        const owner = owners.get(event.data.spellId);
        cue.casterId =
          owner?.entity.id ??
          participants.find((e) => e.id === event.data.spellId)?.id;
        cue.label = owner?.spell.config.name ?? "Effect applied";
        cue.skillType = owner?.spell.config.type;
        cue.major =
          owner?.spell.config.tier === "S" ||
          (owner?.spell.config.manaCost ?? 0) >= 35;
        cue.style = event.data.healingApplied?.size
          ? "heal"
          : !event.data.damageApplied?.size && event.data.effectsApplied?.size
            ? "ward"
            : owner && meleeSpells.has(owner.spell.config.type)
              ? "melee"
              : "spell";
        const appliedIds = [
          ...(event.data.effectsApplied?.values() ?? []),
        ].flat();
        const passiveOnly =
          event.data.spellId === cue.casterId &&
          event.data.roll === 0 &&
          appliedIds.length > 0 &&
          !event.data.damageApplied?.size &&
          !event.data.healingApplied?.size &&
          appliedIds.every((id) => effects.get(id)?.effectType === "PASSIVE");
        if (passiveOnly) {
          cue.label = "Passive effect";
          cue.style = "effect";
          cue.skillType = undefined;
          if (appliedIds.length === 1) cue.effectId = appliedIds[0];
        }
        const caster = owner && stats.get(owner.entity.id);
        if (caster && owner && !passiveOnly) {
          caster.deltaMana = -Math.min(
            caster.mana,
            owner.spell.config.manaCost,
          );
          caster.mana += caster.deltaMana;
          caster.cooldowns.set(
            owner.spell.config.id,
            owner.spell.config.cooldown ? owner.spell.config.cooldown + 1 : 0,
          );
          caster.flags.casting = true;
          caster.flags.isCrit = event.data.isCrit;
          caster.roll = event.data.roll;
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
      for (const entity of participants) {
        const s = stats.get(entity.id)!;
        if (damageApplied?.has(entity.id)) {
          const damage = damageApplied.get(entity.id)!;
          s.health = Math.max(0, s.health - damage);
          s.deltaHealth -= damage;
          cue.targetIds.push(entity.id);
        }
        if (healingApplied?.has(entity.id)) {
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
      const entity = participants.find((e) => e.id === event.data.entityId);
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
    frames.push({ stats, cue, event: full });
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
