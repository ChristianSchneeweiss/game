import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import {
  TB_character,
  TB_dungeonParticipant,
  type Database,
} from "../db/schema";

export function getDungeonParty(dungeonId: string, db: Database) {
  return db
    .select({ characterId: TB_character.id, userId: TB_character.userId })
    .from(TB_dungeonParticipant)
    .innerJoin(
      TB_character,
      eq(TB_character.id, TB_dungeonParticipant.characterId),
    )
    .where(eq(TB_dungeonParticipant.dungeonId, dungeonId));
}

/** Creator and participant owners share run access; this grants no character or loot rights. */
export function requireDungeonParty(
  createdBy: string,
  party: readonly { userId: string }[],
  userId: string,
  message = "This run belongs to another party",
) {
  if (createdBy !== userId && !party.some((hero) => hero.userId === userId))
    throw new TRPCError({ code: "FORBIDDEN", message });
}
