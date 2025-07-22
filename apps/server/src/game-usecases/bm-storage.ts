import { BaseEntity } from "@loot-game/game/base-entity";
import type { BM } from "@loot-game/game/battle";
import { timelineEventSchema } from "@loot-game/game/timeline-events";
import type { Entity } from "@loot-game/game/types";
import { produce } from "immer";
import { parse, stringify } from "superjson";
import { z } from "zod";
import { COL_characterDungeonDataSchema } from "../db/character-dungeon-data";

const storageSchema = z.object({
  startEntityData: COL_characterDungeonDataSchema,
  timelineEvents: z.array(timelineEventSchema),
  participants: z.array(z.any()), // TODO
});
type StorageSchema = z.infer<typeof storageSchema>;

export const bmStorage = {
  save: async (bm: BM, kv: KVNamespace) => {
    const entities = produce(bm.entities, (draft) => {
      draft.forEach((ent) => {
        ent.battleManager = undefined;
        ent.spells.forEach((spells) => (spells.battleManager = undefined));
      });
    });
    await kv.put(
      `battle:${bm.battleId}`,
      stringify({
        startEntityData: bm.startEntityData
          .filter((ent) => ent.team === "TEAM_A")
          .map((ent) => ({
            characterId: ent.id,
            health: ent.health,
            mana: ent.mana,
          })),
        timelineEvents: bm.events,
        participants: entities as BaseEntity[],
      } satisfies StorageSchema)
    );
  },
  get: async (id: string, kv: KVNamespace) => {
    const timeline = await kv.get(`battle:${id}`);
    if (!timeline) throw new Error("battle does not exist");
    const serialized = parse(timeline);

    const x = storageSchema.safeParse(serialized);
    if (!x.success) throw new Error(x.error.message);
    return { ...x.data, participants: x.data.participants as Entity[] };
  },
};

// export const bmStorage = {
//   save: async (bm: BM, db: PostgresJsDatabase) => {
//     return await db.transaction(async (tx) => {
//       const battleId = id();
//       const timeline = bm.events.map((event, idx) => ({
//         ...bmStorage.eventToStorage(event, battleId),
//         inBattleIndex: idx,
//       }));

//       await tx.insert(TB_timeline).values(timeline);
//       return battleId;
//     });
//   },
//   eventToStorage: (
//     event: TimelineEventFull,
//     battleId: string
//   ): typeof TB_timeline.$inferInsert => {
//     return {
//       battleId,
//       data: serialize(event.event.data),
//       eventType: event.event.eventType,
//       round: event.round,
//       inBattleIndex: -1,
//     };
//   },

//   get: async (id: string, db: PostgresJsDatabase) => {
//     const timeline = await db
//       .select()
//       .from(TB_timeline)
//       .where(eq(TB_timeline.battleId, id))
//       .orderBy(asc(TB_timeline.inBattleIndex));

//     const temp = timeline.map(
//       (event) =>
//         ({
//           round: event.round,
//           // @ts-expect-error we use superjson and lose type safety here. thats why we schema parse it later
//           event: {
//             eventType: event.eventType,
//             data: deserialize(event.data as any),
//           },
//         }) satisfies TimelineEventFull
//     );

//     const x = z.array(timelineEventSchema).safeParse(temp);
//     if (!x.success) throw new Error(x.error.message);
//     return x.data;
//   },
// };
