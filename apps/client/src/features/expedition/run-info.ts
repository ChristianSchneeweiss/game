import type { trpcClient } from "@/utils/trpc";
import type { DungeonKey } from "@loot-game/game/dungeons/dungeon-keys";
import { trialOfTheNature } from "@loot-game/game/dungeons/trial-of-the-nature";
import { dungeonRunPhase } from "@loot-game/game/dungeons/run-state";
import type { LootEntity } from "@loot-game/game/types";

export type DungeonRunData = Awaited<
  ReturnType<typeof trpcClient.dungeon.getRun.query>
>;
export type BattleResultData = Awaited<
  ReturnType<typeof trpcClient.getBattle.query>
>;
export type BattleContext = NonNullable<
  Awaited<ReturnType<typeof trpcClient.dungeon.getBattleContext.query>>
>;
export const nature = trialOfTheNature();
const stations = [
  "Mossgate",
  "Rootbound passage",
  "The elder hollow",
  "Barkhide grove",
  "Oakwarden's sanctum",
];
export const readable = (value: string) => value.replaceAll("-", " ");
export function waveName(key: string, index: number) {
  return key === nature.key
    ? (stations[index] ?? "Forest restored")
    : `Encounter ${index + 1}`;
}
export function prepSearch(party: string[], key: string = nature.key) {
  return { party, key: key as DungeonKey };
}
export function trailEntries(
  key: string,
  waves: string[][],
  completed: number,
  active: boolean,
) {
  return waves.map((enemies, index) => ({
    id: `${key}:wave:${index + 1}`,
    name: waveName(key, index),
    enemies: enemies.map(readable).join(" · "),
    state:
      index < completed
        ? "complete"
        : index === completed
          ? "current"
          : "ahead",
    marker: index < completed ? "✓" : String(index + 1).padStart(2, "0"),
    label:
      index < completed
        ? "Cleared"
        : index === completed
          ? active
            ? "In battle"
            : "Up next"
          : `Wave ${index + 1}`,
  }));
}
export function groupDrops(items: LootEntity[]) {
  const drops = new Map<
    string,
    { type: string; label: string; count: number; item: LootEntity }
  >();
  for (const item of items) {
    const type =
      item.type === "SPELL"
        ? item.data.spellType
        : item.type === "ITEM"
          ? item.data.itemType
          : item.data.passiveType;
    const previous = drops.get(type);
    if (previous) previous.count++;
    else
      drops.set(type, {
        item,
        type,
        label:
          item.type === "SPELL"
            ? "Spell discovered"
            : item.type === "ITEM"
              ? "Equipment"
              : "Passive skill",
        count: 1,
      });
  }
  return Array.from(drops.values());
}
export function runPhase(run: DungeonRunData) {
  const phase = dungeonRunPhase({
    ...run,
    totalWaves: run.actualEnemies.length,
    resources: run.playerTeam,
  });
  const presentation = {
    complete: "cleared",
    fighting: "battle",
    defeated: "fallen",
    "awaiting-choice": "choice",
    prepared: "ready",
    ready: "ready",
    abandoned: "abandoned",
  } as const;
  return presentation[phase];
}
export function runCopy(run: DungeonRunData) {
  const phase = runPhase(run);
  if (phase === "abandoned")
    return {
      eyebrow: "Expedition abandoned",
      title: "The company returns.",
      description:
        "This run has ended for both players. Earned rewards and recorded battles remain yours to collect and revisit.",
    };
  if (phase === "cleared")
    return {
      eyebrow: "Expedition complete",
      title:
        run.key === nature.key
          ? "The forest remembers."
          : "The expedition is yours.",
      description:
        "Every encounter overcome. Gather your spoils and shape the next build.",
    };
  if (phase === "fallen")
    return {
      eyebrow: "The expedition has fallen",
      title: "A lesson from the wild.",
      description:
        "Your party can go no further. Keep the rewards you found, refine your spells, and return with recovered resources.",
    };
  if (phase === "choice")
    return {
      eyebrow: `Your expedition / Fork ${run.round}`,
      title: "A fork in the trail.",
      description:
        "Your scouts have found several ways onward. Weigh the reward, tend to your party, and choose a path.",
    };
  return {
    eyebrow: `Your expedition / Wave ${run.round + 1} of ${run.actualEnemies.length}`,
    title: waveName(run.key, run.round),
    description: `${run.name}. ${phase === "battle" ? "Your battle is waiting. Resume where you left off." : "Check your remaining resources before the next encounter."}`,
  };
}
export function resultCopy(victory: boolean, context?: BattleContext) {
  const run = context?.run;
  const complete = Boolean(run?.cleared && context?.attempt.completedAt);
  const finalVictory =
    complete && context?.attempt.round === run!.actualEnemies.length - 1;
  const forest = run?.key === nature.key;
  return {
    eyebrow: context
      ? `Wave ${context.attempt.round + 1} / ${waveName(context.run.key, context.attempt.round)}`
      : "Battle complete",
    title: victory
      ? finalVictory
        ? forest
          ? "The forest is yours."
          : "Expedition complete."
        : "A clearing won."
      : "The wild holds its ground.",
    description: victory
      ? "Your party prevailed. Gather what the guardians left behind."
      : "Your party has fallen. The spoils you found are yours to keep. Refine your build and return.",
    nextEyebrow: complete
      ? `${run!.actualEnemies.length} waves behind you`
      : victory
        ? "The journey continues"
        : "Prepare for the return",
    nextTitle: complete
      ? "Shape your next build."
      : victory
        ? forest
          ? "Deeper into the forest."
          : "On to the next encounter."
        : "Come back stronger.",
    nextDescription:
      complete || !victory
        ? "Equip your collected spells and gear, then prepare a fresh expedition. Your party recovers its resources for the new run."
        : run?.route
          ? "Choose your next path on the dungeon map. Health and mana carry onward; a shrine may offer relief."
          : "The party carries its remaining health and mana into the next wave.",
  };
}
