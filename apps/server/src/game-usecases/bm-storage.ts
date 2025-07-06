import { BaseEntity } from "@loot-game/game/base-entity";
import type { BM } from "@loot-game/game/battle";
import { timelineEventSchema, type Entity } from "@loot-game/game/types";
import { Redis } from "@upstash/redis/cloudflare";
import { produce } from "immer";
import { deserialize, stringify, type SuperJSONResult } from "superjson";
import { z } from "zod";
import { id } from "../db/schema";

const client = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const storageSchema = z.object({
  timelineEvents: z.array(timelineEventSchema),
  participants: z.array(z.any()), // TODO
});
type StorageSchema = z.infer<typeof storageSchema>;

export const bmStorage = {
  save: async (bm: BM) => {
    const battleId = id(16);
    const entities = produce(bm.entities, (draft) => {
      draft.forEach((ent) => {
        ent.battleManager = undefined;
        ent.spells.forEach((spells) => (spells.battleManager = undefined));
      });
    });
    await client.set(
      `battle:${battleId}`,
      stringify({
        timelineEvents: bm.events,
        participants: entities as BaseEntity[],
      } satisfies StorageSchema)
    );
    return battleId;
  },
  get: async (id: string) => {
    const timeline = await client.get(`battle:${id}`);
    if (!timeline) throw new Error("battle does not exist");
    const serialized = deserialize(timeline as SuperJSONResult);

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
