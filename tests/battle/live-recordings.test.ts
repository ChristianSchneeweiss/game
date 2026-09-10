import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import SuperJSON, { type SuperJSONResult } from "superjson";
import { BM, type EffectTracking } from "../../apps/game/src/bm";
import type { Entity } from "../../apps/game/src/entity-types";
import type { TimelineEventFull } from "../../apps/game/src/timeline-events";
import { castBattleSpell } from "../../apps/server/src/battle/commands";
import type { BattleMessage } from "../../apps/server/src/battle/protocol";
import {
  restoreStartingBuilds,
  type StartingBuilds,
} from "../../apps/server/src/battle/starting-builds";
import { registerRecipes } from "../../apps/server/src/lib/superjson-recipes";
import { buildTimeline } from "../../apps/client/src/routes/battle/-presentation/timeline";
import { buildConditionDetails } from "../../apps/client/src/routes/battle/-presentation/battle-effects";
import { buildActionHistory } from "../../apps/client/src/routes/battle/-presentation/action-history";

registerRecipes();
for (const name of [
  "live-goblin",
  "live-six-entity",
  "live-milestone-2",
  "live-milestone-3",
]) {
  test(`${name}: authenticated browser recording agrees with persisted results and frozen-build restoration`, () => {
    const recording = JSON.parse(
      readFileSync(
        new URL(`./recordings/${name}.json`, import.meta.url),
        "utf8",
      ),
    ) as {
      battleId: string;
      startingBuilds: SuperJSONResult;
      commands: Extract<BattleMessage, { type: "castSpell" }>[];
      result: {
        participants: SuperJSONResult;
        timeline_data: SuperJSONResult;
        effect_tracking: SuperJSONResult;
        team_a: SuperJSONResult;
        team_b: SuperJSONResult;
        winner: string;
      };
    };
    const { result } = recording;
    const participants = SuperJSON.deserialize<Entity[]>(result.participants);
    const events = SuperJSON.deserialize<TimelineEventFull[]>(
      result.timeline_data,
    );
    const effects = SuperJSON.deserialize<EffectTracking>(
      result.effect_tracking,
    );
    const frames = buildTimeline(participants, events, undefined, effects);
    const conditions = buildConditionDetails(participants, events, effects);
    for (const participant of participants) {
      for (const passive of participant.passiveSkills ?? []) {
        if ("passiveType" in passive) {
          expect(conditions.get(passive.id)?.iconType).toBe(
            passive.passiveType,
          );
        }
      }
    }
    const final = frames.at(-1)!.stats;
    const restored = new BM(
      restoreStartingBuilds(
        SuperJSON.deserialize<StartingBuilds>(recording.startingBuilds),
      ),
      recording.battleId,
    );
    restored.start();
    for (const command of recording.commands)
      castBattleSpell(restored, command.data, "fixture-owner");
    expect(restored.getWinningTeam()).toBe(result.winner);
    const results = [
      ...SuperJSON.deserialize<
        { id: string; health: number; mana?: number; dead: boolean }[]
      >(result.team_a),
      ...SuperJSON.deserialize<
        { id: string; health: number; mana?: number; dead: boolean }[]
      >(result.team_b),
    ];
    for (const entity of results) {
      expect(final.get(entity.id)!.health).toBe(entity.health);
      expect(final.get(entity.id)!.flags.dead).toBe(entity.dead);
      expect(restored.getEntityById(entity.id)!.health).toBe(entity.health);
      if (entity.mana !== undefined) {
        expect(final.get(entity.id)!.mana).toBe(entity.mana);
        expect(restored.getEntityById(entity.id)!.mana).toBe(entity.mana);
      }
    }
    if (name !== "live-goblin") {
      expect(frames[1].cue).toMatchObject({
        label: "Passive effect",
        style: "effect",
      });
      expect(
        buildActionHistory(frames, participants, conditions)[0],
      ).toMatchObject({
        label: "Armor Up",
        iconType: "armor-up",
      });
      const first = recording.commands[0].data;
      const cast = events.find(
        (event) =>
          event.event.eventType === "SPELL_CAST" &&
          event.event.data.spellId === first.spellId &&
          event.event.data.damageApplied,
      )!.event;
      if (cast.eventType !== "SPELL_CAST") throw new Error("Expected cast");
      expect([...cast.data.damageApplied!.keys()]).toEqual(first.targetIds);
      expect(participants).toHaveLength(6);
    }
  });
}
