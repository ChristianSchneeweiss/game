import type { InBetweenCharacterData } from "@loot-game/game/dungeons/types";
import type { TimelineEventFull } from "@loot-game/game/timeline-events";
import type { Entity, Spell } from "@loot-game/game/types";
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
  cooldowns: Map<string, number>;
  roll?: number;
  flags: {
    casting: boolean;
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
        stats.flags.casting = false;
        stats.roll = undefined;
        // dont reset dead flag

        switch (event.event.eventType) {
          case "SPELL_CAST": {
            const spellId = event.event.data.spellId;
            const { damageApplied, healingApplied, roll } = event.event.data;

            if (damageApplied && damageApplied.has(entity.id)) {
              const damage = damageApplied.get(entity.id) || 0;
              stats.health -= damage;
              stats.deltaHealth -= damage;
            }

            if (healingApplied && healingApplied.has(entity.id)) {
              const healing = healingApplied.get(entity.id) || 0;
              stats.health += healing;
              stats.deltaHealth += healing;
            }

            if (entity.spells.some((s) => s.config.id === spellId)) {
              const { spell } = spellMap.get(spellId)!;
              stats.mana = Math.max(0, stats.mana - spell.config.manaCost);

              stats.flags.casting = true;
              stats.roll = roll;

              // if the spell has a cooldown of 0 we leave it. otherwise we add 1
              // to make sure its working the same as the server
              const cooldown =
                spell.config.cooldown === 0 ? 0 : spell.config.cooldown + 1;
              if (cooldown) {
                stats.cooldowns.set(spellId, cooldown);
              }
            }
            break;
          }
          case "REDUCE_COOLDOWN": {
            const { spellId, amount } = event.event.data;
            const cooldown = stats.cooldowns.get(spellId);
            if (cooldown) {
              stats.cooldowns.set(spellId, cooldown - amount);
            }
            break;
          }
          case "DEATH": {
            if (entity.id !== event.event.data.id) break;
            stats.flags.dead = true;
            break;
          }
          case "HEALTH_REGEN": {
            if (entity.id !== event.event.data.entityId) break;
            const { amount } = event.event.data;
            stats.health = Math.min(stats.health + amount, entity.maxHealth);
            stats.deltaHealth += amount;
            break;
          }
          case "MANA_REGEN": {
            if (entity.id !== event.event.data.entityId) break;
            const { amount } = event.event.data;
            stats.mana = Math.min(stats.mana + amount, entity.maxMana);
            // stats.deltaMana += amount;
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
        cooldowns: new Map(),
        flags: {
          casting: false,
          dead: false,
        },
      } as Stats,
    );

    timeline.set(entity.id, statsTimeline);
  });

  return timeline;
}
