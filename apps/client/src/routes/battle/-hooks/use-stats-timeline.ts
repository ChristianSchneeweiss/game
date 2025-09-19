import type { InBetweenCharacterData } from "@loot-game/game/dungeons/types";
import type { Entity } from "@loot-game/game/entity-types";
import type { TimelineEventFull } from "@loot-game/game/timeline-events";
import type { Spell } from "@loot-game/game/types";
import { useMemo } from "react";

export const useStatsTimeline = (
  events: TimelineEventFull[],
  participants: Entity[],
  startEntityData?: InBetweenCharacterData[],
) => {
  const defaultStartEntityData = useMemo(() => {
    return participants.map((p) => ({
      characterId: p.id,
      health: p.health,
      mana: p.mana,
    }));
  }, [participants]);

  const spellMap = useMemo(() => createSpellMap(participants), [participants]);

  const defaultStats = useMemo(() => {
    return calculateStatsTimeline(
      startEntityData ?? defaultStartEntityData,
      participants,
      events,
      0,
      spellMap,
    );
  }, [participants, events, spellMap]);

  const statsTimeline = useMemo(() => {
    // i think we need the +1 because we want to show all events AND then be able to cast things. not 100% sure though
    const timeline = Array.from({ length: events.length + 1 }, (_, i) => i).map(
      (i) => {
        const event = events[i];
        const stats = calculateStatsTimeline(
          startEntityData ?? defaultStartEntityData,
          participants,
          events,
          i,
          spellMap,
        );
        return {
          event,
          stats,
        };
      },
    );
    return timeline;
  }, [participants, events, spellMap]);
  return {
    statsTimeline,
    spellMap,
    defaultStats,
  };
};

type SpellMap = Map<string, { spell: Spell; caster: Entity }>;

function createSpellMap(entities: Entity[]): SpellMap {
  const spellMap = new Map<string, { spell: Spell; caster: Entity }>();
  for (const entity of entities) {
    for (const spell of entity.spells) {
      spellMap.set(spell.config.id, { spell, caster: entity });
    }
  }
  return spellMap;
}

export type Stats = {
  health: number;
  mana: number;
  deltaHealth: number;
  deltaMana: number;
  cooldowns: Map<string, number>;
  activeEffects: Array<string>;
  roll?: number;
  flags: {
    casting: boolean;
    isCrit: boolean;
    dead: boolean;
  };
};

function calculateStatsTimeline(
  startEntityData: InBetweenCharacterData[],
  participants: Entity[],
  timelineEvents: TimelineEventFull[],
  visible: number,
  spellMap: SpellMap,
) {
  const timeline = new Map<string, Stats>();
  participants.forEach((entity) => {
    const statsTimeline = timelineEvents.slice(0, visible).reduce(
      (stats, event) => {
        // reset stuff as we otherwise carry over the previous events stuff
        stats.deltaHealth = 0;
        stats.deltaMana = 0;
        stats.roll = undefined;

        stats.flags.casting = false;
        stats.flags.isCrit = false;
        // dont reset dead flag

        switch (event.event.eventType) {
          case "SPELL_CAST": {
            const spellId = event.event.data.spellId;
            const {
              damageApplied,
              healingApplied,
              roll,
              effectsApplied,
              isCrit,
            } = event.event.data;

            // i am the caster
            if (entity.spells.some((s) => s.config.id === spellId)) {
              const { spell } = spellMap.get(spellId)!;
              stats.mana = Math.max(0, stats.mana - spell.config.manaCost);
              stats.deltaMana -= spell.config.manaCost;

              stats.flags.casting = true;
              stats.flags.isCrit = isCrit;
              stats.roll = roll;

              // if the spell has a cooldown of 0 we leave it. otherwise we add 1
              // to make sure its working the same as the server
              const cooldown =
                spell.config.cooldown === 0 ? 0 : spell.config.cooldown + 1;
              if (cooldown) {
                stats.cooldowns.set(spellId, cooldown);
              }
            }

            if (damageApplied && damageApplied.has(entity.id)) {
              const damage = damageApplied.get(entity.id) || 0;
              stats.health -= damage;
              stats.deltaHealth -= damage;
            }

            if (healingApplied && healingApplied.has(entity.id)) {
              const healing = healingApplied.get(entity.id) || 0;
              stats.health += Math.min(
                healing,
                entity.maxHealth - stats.health,
              );
              stats.deltaHealth += Math.min(
                healing,
                entity.maxHealth - stats.health,
              );
            }

            if (effectsApplied && effectsApplied.has(entity.id)) {
              const effect = effectsApplied.get(entity.id);
              if (effect) {
                stats.activeEffects.push(...effect);
              }
            }

            break;
          }

          case "EFFECT_TRIGGER": {
            const { damageApplied, healingApplied, effectsApplied } =
              event.event.data;

            if (damageApplied && damageApplied.has(entity.id)) {
              const damage = damageApplied.get(entity.id) || 0;
              stats.health -= damage;
              stats.deltaHealth -= damage;
            }

            if (healingApplied && healingApplied.has(entity.id)) {
              const healing = healingApplied.get(entity.id) || 0;
              stats.health += Math.min(
                healing,
                entity.maxHealth - stats.health,
              );
              stats.deltaHealth += Math.min(
                healing,
                entity.maxHealth - stats.health,
              );
            }

            if (effectsApplied && effectsApplied.has(entity.id)) {
              const effect = effectsApplied.get(entity.id);
              if (effect) {
                stats.activeEffects.push(...effect);
              }
            }

            break;
          }

          case "EFFECT_REMOVAL": {
            const { effectId } = event.event.data;
            stats.activeEffects = stats.activeEffects.filter(
              (effect) => effect !== effectId,
            );
            break;
          }
          case "REDUCE_SPELL_COOLDOWN": {
            const spells = event.event.data;
            for (const { spellId, amount } of spells) {
              const cooldown = stats.cooldowns.get(spellId);
              if (cooldown) {
                stats.cooldowns.set(spellId, cooldown - amount);
              }
            }
            break;
          }
          case "DEATH": {
            if (entity.id !== event.event.data.id) break;
            stats.flags.dead = true;
            break;
          }
          case "REGEN": {
            if (entity.id !== event.event.data.entityId) break;
            const { healthRegen, manaRegen } = event.event.data;
            stats.health = Math.min(
              stats.health + healthRegen,
              entity.maxHealth,
            );
            stats.deltaHealth += healthRegen;

            stats.mana = Math.min(stats.mana + manaRegen, entity.maxMana);
            stats.deltaMana += manaRegen;
            break;
          }
        }

        return stats;
      },
      {
        health:
          startEntityData.find((e) => e.characterId === entity.id)?.health ??
          entity.maxHealth,
        mana:
          startEntityData.find((e) => e.characterId === entity.id)?.mana ??
          entity.maxMana,
        deltaHealth: 0,
        deltaMana: 0,
        cooldowns: new Map(),
        activeEffects: [],
        flags: {
          casting: false,
          isCrit: false,
          dead: false,
        },
      } as Stats,
    );

    timeline.set(entity.id, statsTimeline);
  });

  return timeline;
}
