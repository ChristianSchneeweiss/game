import { BaseEntity } from "@loot-game/game/base-entity";
import type { BM } from "@loot-game/game/bm";
import { BaseEnemy } from "@loot-game/game/enemies/base/base.enemy";
import type { Entity } from "@loot-game/game/entity-types";
import { timelineEventSchema } from "@loot-game/game/timeline-events";
import type { EffectType } from "@loot-game/game/types";
import { eq } from "drizzle-orm";
import cloneDeep from "lodash/cloneDeep";
import { deserialize, serialize, type SuperJSONResult } from "superjson";
import { z } from "zod";
import { COL_characterDungeonDataSchema } from "../db/character-dungeon-data";
import { TB_battleResult, type Database } from "../db/schema";
import { battleResultSchema } from "../battle/result";
import { returnBattleSupplies } from "./battle-supplies";

const storageSchema = z.object({
  startEntityData: COL_characterDungeonDataSchema,
  timelineData: z.array(timelineEventSchema),
  participants: z.array(z.any()), // TODO
  // TODO
  effectTracking: z.map(
    z.string(),
    z.object({
      sourceId: z.string(),
      targetId: z.string(),
      round: z.number(),
      duration: z.number(),
      description: z.string(),
      effectType: z.string(),
    }),
  ),
  ...battleResultSchema.shape,
});
type StorageSchema = z.infer<typeof storageSchema>;

export class BattleResultNotFoundError extends Error {}

export const bmStorage = {
  save: async (bm: BM, db: Database) => {
    const entities = cloneDeep(bm.startEntityData);
    entities.forEach((ent) => {
      ent.battleManager = undefined!;
      ent.spells.forEach((spells) => (spells.battleManager = undefined!));
      ent.activeEffects.forEach(
        (effect) => (effect.battleManager = undefined!),
      );
      ent.passiveSkills.forEach(
        (passive) => (passive.battleManager = undefined!),
      );
      Object.values(ent.equipped).forEach((equipment) => {
        equipment.battleManager = undefined!;
      });
    });
    const storageData = {
      startEntityData: bm.startEntityData
        .filter((ent) => ent.team === "TEAM_A")
        .map((ent) => ({
          characterId: ent.id,
          health: ent.health,
          mana: ent.mana,
        })),
      timelineData: bm.events,
      participants: entities as BaseEntity[],
      effectTracking: storageSchema.shape.effectTracking.parse(
        bm.effectTracking,
      ),
      winner: bm.getWinningTeam()!,
      teamA: bm.getTeam("TEAM_A").map((ent) => ({
        id: ent.id,
        health: ent.health,
        mana: ent.mana,
        dead: ent.isDead(),
      })),
      teamB: bm.getTeam("TEAM_B").map((ent) => ({
        id: ent.id,
        health: ent.health,
        dead: ent.isDead(),
        type: ent instanceof BaseEnemy ? ent.type : "goblin", // todo not goblin default
      })),
    } satisfies StorageSchema;

    await db.transaction(async (tx) => {
      await returnBattleSupplies(bm.battleId, bm.entities, tx);
      await tx
        .insert(TB_battleResult)
        .values({
          battleId: bm.battleId,
          timelineData: serialize(storageData.timelineData),
          startEntityData: serialize(storageData.startEntityData),
          participants: serialize(storageData.participants),
          effectTracking: serialize(storageData.effectTracking),
          winner: storageData.winner,
          teamA: serialize(storageData.teamA),
          teamB: serialize(storageData.teamB),
        })
        .onConflictDoNothing();
    });
  },
  get: async (id: string, db: Database) => {
    const [storageData] = await db
      .select()
      .from(TB_battleResult)
      .where(eq(TB_battleResult.battleId, id));
    if (!storageData)
      throw new BattleResultNotFoundError("Battle result not found");
    const y = {
      timelineData: deserialize(storageData.timelineData as SuperJSONResult),
      startEntityData: deserialize(
        storageData.startEntityData as SuperJSONResult,
      ),
      participants: deserialize(storageData.participants as SuperJSONResult),
      effectTracking: deserialize(
        storageData.effectTracking as SuperJSONResult,
      ),
      winner: storageData.winner,
      teamA: deserialize(storageData.teamA as SuperJSONResult),
      teamB: deserialize(storageData.teamB as SuperJSONResult),
    };

    const x = storageSchema.safeParse(y);
    if (!x.success) throw new Error(x.error.message);
    return {
      ...x.data,
      participants: x.data.participants as Entity[],
      effectTracking: new Map(
        x.data.effectTracking.entries().map(([id, effect]) => [
          id,
          {
            ...effect,
            id: id,
            effectType: effect.effectType as EffectType,
          },
        ]),
      ),
    };
  },
};
