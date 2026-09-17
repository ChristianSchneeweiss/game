import { Character } from "../apps/game/src/base-entity";
import { BM } from "../apps/game/src/bm";
import { createSpellFromType } from "../apps/game/src/spells/base/spell-from-type";
import { createEnemyFromType } from "../apps/server/src/game-usecases/enemy-factory";
import { battleAiSnapshot } from "../apps/server/src/battle/ai-snapshot";
import { selectAiAction } from "../apps/server/src/battle/ai-selector";
import { validateActivationPlan } from "../apps/server/src/battle/activation-plan";

// Opt-in paid measurement against synthetic game state; never part of the test suite.
if (!process.env.OPENROUTER_API_KEY)
  throw new Error("Set OPENROUTER_API_KEY in the server environment.");
const metrics: unknown[] = [];
const log = console.info;
const output = console.log;
console.log = () => {};
console.info = (event, value) => {
  if (event === "battle.ai_usage") metrics.push(value);
};
const results = [];
for (const size of [1, 2, 3]) {
  const previousMetrics = metrics.length;
  const hero = new Character(
    "hero",
    "synthetic-owner",
    "Hero",
    "TEAM_A",
    200,
    150,
    { strength: 20, intelligence: 30, agility: 100, vitality: 20 },
    0,
    5,
    0,
  );
  hero.aiControl = { enabled: true, prompt: "", allowConsumables: true };
  hero.spells = (
    [
      "basic-attack",
      "cinder-wisp",
      "single-heal",
      "torrent-spiral",
      "volt-lash",
    ] as const
  ).map((type) => createSpellFromType(`hero-${type}`, type));
  hero.health = 100;
  hero.consumables = [
    {
      version: 1,
      slot: 0,
      type: "healing-potion",
      name: "Healing Potion",
      quantity: 1,
      restoration: { resource: "health", amount: 40 },
    },
  ];
  const enemies = Array.from({ length: size }, (_, index) =>
    createEnemyFromType("goblin", `enemy-${index}`),
  );
  const positions = Object.fromEntries([
    [hero.id, { x: 1, y: 1 }],
    ...enemies.map((enemy, index) => [enemy.id, { x: 4, y: index + 1 }]),
  ]);
  const battle = new BM([hero, ...enemies], `measurement-${size}`, {
    rulesVersion: 2,
    battlefield: {
      width: 7,
      height: 7,
      blocked: [],
      layoutVersion: "measurement",
    },
    positions,
  });
  battle.start();
  battle.preTurn();
  if (size === 3) battle.moveEntity(hero.id, { x: 2, y: 1 });
  const snapshot = battleAiSnapshot(battle);
  const started = Date.now();
  const signal = AbortSignal.timeout(5000);
  try {
    const plan = await selectAiAction(snapshot, "", signal, {
      OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
      BATTLE_AI_MODEL: process.env.BATTLE_AI_MODEL,
    });
    validateActivationPlan(battle, hero.id, plan);
    results.push({
      enemies: size,
      snapshotBytes: new TextEncoder().encode(JSON.stringify(snapshot)).length,
      elapsedMs: Date.now() - started,
      valid: true,
      plan,
      usage: metrics.at(-1),
    });
  } catch (error) {
    results.push({
      enemies: size,
      snapshotBytes: new TextEncoder().encode(JSON.stringify(snapshot)).length,
      elapsedMs: Date.now() - started,
      valid: false,
      error: signal.aborted ? "timeout" : String(error),
      usage: metrics.length > previousMetrics ? metrics.at(-1) : undefined,
    });
  }
}
console.info = log;
console.log = output;
console.log(
  JSON.stringify(
    {
      endpoint: "https://openrouter.ai/api/v1/chat/completions",
      model: process.env.BATTLE_AI_MODEL || "z-ai/glm-5.3-flash",
      reasoning: "low",
      maxTokens: 1024,
      deadlineMs: 5000,
      results,
    },
    null,
    2,
  ),
);
