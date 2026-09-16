import { getItemDefinition } from "@loot-game/game/items/catalog";
import { restorationAmount } from "@loot-game/game/items/consumables";
import { ItemTypeSchema } from "@loot-game/game/items/item-types";
import { TRPCError } from "@trpc/server";
import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import {
  TB_character,
  TB_consumableUse,
  TB_dungeonData,
  TB_dungeonParticipant,
  type Database,
} from "../db/schema";
import { TB_preparation } from "../db/shared-preparation-schema";
import { lockCharacters } from "./character-locks";
import { EntityFactory } from "./entity-factory";
import { dungeonManager } from "./dungeon-manager";
import { lockInventory, spendItems } from "./inventory";

export const UseConsumableSchema = z
  .object({
    requestId: z.string().uuid(),
    dungeonId: z.string().min(1),
    characterId: z.string().min(1),
    itemType: ItemTypeSchema,
    expected: z.object({
      round: z.number().int().nonnegative(),
      health: z.number(),
      mana: z.number(),
    }),
  })
  .strict();

export async function consumableTargets(userId: string, db: Database) {
  const rows = await db
    .select({ run: TB_dungeonData, characterId: TB_character.id })
    .from(TB_dungeonData)
    .innerJoin(
      TB_dungeonParticipant,
      eq(TB_dungeonParticipant.dungeonId, TB_dungeonData.id),
    )
    .innerJoin(
      TB_character,
      eq(TB_character.id, TB_dungeonParticipant.characterId),
    )
    .where(
      and(
        eq(TB_character.userId, userId),
        eq(TB_dungeonData.activeBattle, false),
        eq(TB_dungeonData.cleared, false),
        isNull(TB_dungeonData.abandonedAt),
      ),
    );
  const targets = [];
  for (const { run, characterId } of rows) {
    const saved = run.characterData.find(
      (hero) => hero.characterId === characterId,
    );
    if (!saved || saved.health <= 0) continue;
    const hero = await EntityFactory.createCharacter(characterId, db);
    const config = dungeonManager.getDungeonConfig(run.key);
    if (run.round >= config.availableEnemies.length) continue;
    targets.push({
      dungeonId: run.id,
      dungeonName: config.name,
      round: run.round,
      characterId,
      name: hero.name,
      health: saved.health,
      mana: saved.mana,
      maxHealth: hero.maxHealth,
      maxMana: hero.maxMana,
    });
  }
  return targets;
}

/** One transaction commits restoration, stock spending, readiness reset, and a retry receipt. */
export async function useConsumable(
  input: z.infer<typeof UseConsumableSchema>,
  userId: string,
  db: Database,
) {
  const item = getItemDefinition(input.itemType);
  if (
    item.kind !== "consumable" ||
    !item.useContexts.includes("outside-battle")
  )
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "This item cannot be used outside battle",
    });
  return db.transaction(async (tx) => {
    const [run] = await tx
      .select()
      .from(TB_dungeonData)
      .where(eq(TB_dungeonData.id, input.dungeonId))
      .for("update");
    if (!run)
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Expedition not found",
      });
    const [preparation] = await tx
      .select()
      .from(TB_preparation)
      .where(eq(TB_preparation.dungeonId, run.id))
      .for("update");
    const [heroRow] = await lockCharacters([input.characterId], tx);
    const [participant] = await tx
      .select()
      .from(TB_dungeonParticipant)
      .where(
        and(
          eq(TB_dungeonParticipant.dungeonId, run.id),
          eq(TB_dungeonParticipant.characterId, input.characterId),
        ),
      );
    if (heroRow?.userId !== userId || !participant)
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Choose your own character in this expedition",
      });
    await lockInventory(userId, tx);
    const [previous] = await tx
      .select()
      .from(TB_consumableUse)
      .where(
        and(
          eq(TB_consumableUse.userId, userId),
          eq(TB_consumableUse.requestId, input.requestId),
        ),
      );
    if (previous) {
      if (
        previous.dungeonId !== input.dungeonId ||
        previous.characterId !== input.characterId ||
        previous.itemType !== item.type
      )
        throw new TRPCError({
          code: "CONFLICT",
          message:
            "This request was already used for a different item or target",
        });
      return { restored: previous.restored };
    }
    const saved = run.characterData.find(
      (hero) => hero.characterId === input.characterId,
    );
    if (
      run.activeBattle ||
      run.cleared ||
      run.abandonedAt ||
      !saved ||
      saved.health <= 0 ||
      run.round >=
        dungeonManager.getDungeonConfig(run.key).availableEnemies.length
    )
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Use potions on a living character between encounters",
      });
    if (
      run.round !== input.expected.round ||
      saved.health !== input.expected.health ||
      saved.mana !== input.expected.mana
    )
      throw new TRPCError({
        code: "CONFLICT",
        message: "Your expedition changed. Choose your target again.",
      });
    const hero = await EntityFactory.createCharacter(input.characterId, tx);
    const restored = restorationAmount(item.restoration, {
      ...hero,
      health: saved.health,
      mana: saved.mana,
    });
    if (!restored)
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `This character already has full ${item.restoration.resource}`,
      });
    await spendItems(userId, [{ type: item.type, quantity: 1 }], tx);
    const resource = item.restoration.resource;
    await tx
      .update(TB_dungeonData)
      .set({
        characterData: run.characterData.map((entry) =>
          entry.characterId === input.characterId
            ? { ...entry, [resource]: entry[resource] + restored }
            : entry,
        ),
      })
      .where(eq(TB_dungeonData.id, run.id));
    if (preparation)
      await tx
        .update(TB_preparation)
        .set({
          hostReadyRevision: null,
          guestReadyRevision: null,
          revision: preparation.revision + 1,
        })
        .where(eq(TB_preparation.id, preparation.id));
    await tx
      .insert(TB_consumableUse)
      .values({
        userId,
        requestId: input.requestId,
        dungeonId: run.id,
        characterId: input.characterId,
        itemType: item.type,
        restored,
      });
    return { restored };
  });
}
