import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import seedrandom from "seedrandom";
import {
  routeEquipmentDrop,
  routeRewards,
  routeRecovery,
  routeRewardKey,
  routeRules,
  type RouteAction,
  type RouteDecision,
} from "@loot-game/game/dungeons/route";
import {
  TB_character,
  TB_dungeonData,
  TB_dungeonParticipant,
  TB_loot,
  type Database,
} from "../db/schema";
import { EntityFactory } from "./entity-factory";
import { dungeonManager } from "./dungeon-manager";

export async function chooseDungeonPath(
  dungeonId: string,
  wave: number,
  offerId: string,
  action: RouteAction,
  userId: string,
  db: Database,
) {
  return db.transaction(async (tx) => {
    const [record] = await tx
      .select()
      .from(TB_dungeonData)
      .where(eq(TB_dungeonData.id, dungeonId))
      .for("update");
    if (!record)
      throw new TRPCError({ code: "NOT_FOUND", message: "Dungeon not found" });
    const participants = await tx
      .select({ characterId: TB_character.id, userId: TB_character.userId })
      .from(TB_dungeonParticipant)
      .innerJoin(
        TB_character,
        eq(TB_character.id, TB_dungeonParticipant.characterId),
      )
      .where(eq(TB_dungeonParticipant.dungeonId, dungeonId));
    if (
      record.createdBy !== userId &&
      !participants.some((hero) => hero.userId === userId)
    )
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Only this party may choose its path",
      });
    const route = record.route;
    if (!route)
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "This expedition follows its original route",
      });
    const previous = route.decisions.find((decision) => decision.wave === wave);
    if (previous) {
      if (previous.offerId === offerId && previous.action === action)
        return previous;
      throw new TRPCError({
        code: "CONFLICT",
        message: "Your party has already chosen a different path",
      });
    }
    const total = dungeonManager.getDungeonConfig(record.key).availableEnemies
      .length;
    if (
      record.activeBattle ||
      record.cleared ||
      wave !== record.round ||
      wave < 1 ||
      wave >= total
    )
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Choose a path after clearing the current encounter",
      });
    if (!record.characterData.some((hero) => hero.health > 0))
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Your party has fallen. Prepare a new expedition.",
      });

    const selected = route.forks
      .find((fork) => fork.wave === wave)
      ?.offers.find((offer) => offer.id === offerId);
    if (!selected || !selected.encounter.actions.includes(action))
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Choose an action from one of this fork's offered paths",
      });
    const rewards = routeRewards(wave);
    const decision: RouteDecision = {
      wave,
      offerId,
      action,
      outcome: action.startsWith("restore-") ? "restored" : "passed",
      rewards: [],
      resources: [],
    };
    if (action === "elite") {
      decision.outcome = "elite";
      decision.eliteRewardChance = routeRules.eliteRewardChance;
    }
    if (action === "take-treasure") {
      decision.outcome = "treasure";
      decision.rewards = [rewards.safeReward];
    }
    if (action === "open-vault") {
      decision.outcome = "treasure";
      decision.rewards = [rewards.rareReward];
    }
    if (action === "gamble-treasure") {
      const won =
        seedrandom(`${dungeonId}:treasure:${wave}`)() < routeRules.gambleChance;
      decision.outcome = won ? "treasure" : "trap";
      if (won) decision.rewards = [rewards.rareReward];
    }
    const nextResources = [];
    for (const saved of record.characterData) {
      const next = { ...saved };
      if (
        saved.health > 0 &&
        (action.startsWith("restore-") || decision.outcome === "trap")
      ) {
        const hero = await EntityFactory.createCharacter(saved.characterId, tx);
        if (action === "restore-health")
          next.health += routeRecovery(
            saved.health,
            hero.maxHealth,
            routeRules.healthRecovery,
          );
        if (action === "restore-mana")
          next.mana += routeRecovery(
            saved.mana,
            hero.maxMana,
            routeRules.manaRecovery,
          );
        if (decision.outcome === "trap")
          next.health = Math.max(
            1,
            saved.health -
              Math.ceil(hero.maxHealth * routeRules.trapHealthCost),
          );
      }
      nextResources.push(next);
      if (next.health !== saved.health || next.mana !== saved.mana)
        decision.resources.push({
          characterId: saved.characterId,
          health: next.health - saved.health,
          mana: next.mana - saved.mana,
        });
    }
    if (decision.rewards.length) {
      for (const owner of new Set(participants.map((hero) => hero.userId))) {
        await tx.insert(TB_loot).values({
          battleId: routeRewardKey(dungeonId, wave),
          userId: owner,
          gold: 0,
          items: decision.rewards.map(routeEquipmentDrop),
        });
      }
    }
    await tx
      .update(TB_dungeonData)
      .set({
        route: { ...route, decisions: [...route.decisions, decision] },
        characterData: nextResources,
      })
      .where(
        and(eq(TB_dungeonData.id, dungeonId), eq(TB_dungeonData.round, wave)),
      );
    return decision;
  });
}
