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
import { TB_dungeonData, TB_loot, type Database } from "../db/schema";
import { EntityFactory } from "./entity-factory";
import { dungeonManager } from "./dungeon-manager";
import { getDungeonParty, requireDungeonParty } from "./dungeon-access";
import { readDungeonRoute } from "@loot-game/game/dungeons/route-state";
import { dungeonRunPhase } from "@loot-game/game/dungeons/run-state";
import { lockCharacters } from "./character-locks";
import { TB_preparation } from "../db/shared-preparation-schema";

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
    const participants = await getDungeonParty(dungeonId, tx);
    requireDungeonParty(
      record.createdBy,
      participants,
      userId,
      "Only this party may choose its path",
    );
    if (record.abandonedAt)
      throw new TRPCError({
        code: "CONFLICT",
        message: "This run was abandoned",
      });
    const [preparation] = await tx
      .select()
      .from(TB_preparation)
      .where(eq(TB_preparation.dungeonId, dungeonId))
      .for("update");
    if (preparation && preparation.hostUserId !== userId)
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Only the host chooses the path",
      });
    const route = readDungeonRoute(record.route);
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
    const phase = dungeonRunPhase({
      ...record,
      totalWaves: total,
      resources: record.characterData,
      route,
    });
    if (
      phase === "fighting" ||
      phase === "complete" ||
      wave !== record.round ||
      wave < 1 ||
      wave >= total
    )
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Choose a path after clearing the current encounter",
      });
    if (phase === "defeated")
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
    await lockCharacters(
      participants.map((hero) => hero.characterId),
      tx,
    );
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
    if (preparation)
      await tx
        .update(TB_preparation)
        .set({
          hostReadyRevision: null,
          guestReadyRevision: null,
          revision: preparation.revision + 1,
        })
        .where(eq(TB_preparation.id, preparation.id));
    return decision;
  });
}
