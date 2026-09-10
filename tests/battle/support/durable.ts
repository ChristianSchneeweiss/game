import { mock } from "bun:test";
import SuperJSON from "superjson";
import { Character } from "../../../apps/game/src/base-entity";
import { Goblin } from "../../../apps/game/src/enemies/goblin";
import { createSpellFromType } from "../../../apps/game/src/spells/base/spell-from-type";
import { passiveSkillFactory } from "../../../apps/game/src/passive-skills/base/passive-skill.factory";
import { captureStartingBuilds } from "../../../apps/server/src/battle/starting-builds";
import { registerRecipes } from "../../../apps/server/src/lib/superjson-recipes";
import type { ResponseMessage } from "../../../apps/server/src/battle/protocol";
import type { Database } from "../../../apps/server/src/db/schema";

// Replace only unavailable external runtime/SDK/driver boundaries. The real
// Durable Object, command resolver, persistence code and SQL all execute.
let activeDatabase: Database;
mock.module("cloudflare:workers", () => ({
  DurableObject: class { constructor(public ctx: unknown, public env: unknown) {} },
  WorkflowEntrypoint: class {}, WorkflowStep: class {},
}));
mock.module("@clerk/backend", () => ({
  createClerkClient: () => ({ users: { getUser: async (id: string) => ({ id }) } }),
}));
mock.module("drizzle-orm/postgres-js", () => ({ drizzle: () => activeDatabase }));
mock.module("drizzle-orm/neon-http", () => ({ drizzle: () => activeDatabase }));
const { BattleWebsocket } = await import("../../../apps/server/src/durable-objects/battle-ws");
registerRecipes();

export async function durableBattle(db: Database, { lethal = false, faultingCast = false } = {}) {
  activeDatabase = db;
  const player = new Character(
    "audit-hero", "audit-owner", "Test hero", "TEAM_A", 100, 50,
    { intelligence: 20, vitality: 10, strength: 18, agility: 100 }, 0, 1, 0,
  );
  player.spells = [createSpellFromType("audit-hit", "basic-attack")];
  const enemy = new Goblin("audit-goblin");
  if (lethal) {
    enemy.health = 1;
    player.spells = [createSpellFromType("audit-hit", "cinder-wisp")];
  }
  if (faultingCast) {
    player.spells = [createSpellFromType("audit-hit", "cinder-wisp"), createSpellFromType("audit-safe", "basic-attack")];
    player.passiveSkills = [passiveSkillFactory("bloodfang", "audit-passive", player)];
    player.health = 70;
    enemy.health = enemy.maxHealth = 1000;
  }
  const storage = new Map<string, unknown>([
    ["startingBuilds", structuredClone(captureStartingBuilds([player, enemy]))],
    ["battleId", "audit-battle"], ["clerkSecretKey", "test-placeholder"],
  ]);
  const received: ResponseMessage[] = [];
  const ws = { send: (data: string) => received.push(SuperJSON.parse<ResponseMessage>(data)) } as unknown as WebSocket;
  let storageFailure = false;
  let workflowFailure = false;
  let workflowAttempts = 0;
  const workflows = new Set<string>();
  const env = {
    DATABASE_URL: "in-memory-only",
    BATTLE_DONE_WORKFLOW: { create: async ({ id }: { id: string }) => {
      workflowAttempts++;
      if (workflowFailure) throw new Error("injected workflow create failure");
      workflows.add(id);
      return { id };
    } },
  } as unknown as Env;
  async function construct() {
    let initialize = Promise.resolve();
    let connected = false;
    const ctx = {
      storage: {
        get: async (key: string) => structuredClone(storage.get(key)),
        put: async (key: string | Record<string, unknown>, value?: unknown) => {
          if (storageFailure) throw new Error("injected durable storage failure");
          // No partial put: Cloudflare's multi-key put is atomic.
          const values = structuredClone(typeof key === "string" ? { [key]: value } : key);
          for (const [k, v] of Object.entries(values)) storage.set(k, v);
        },
      },
      getWebSockets: () => connected ? [ws] : [],
      blockConcurrencyWhile: (fn: () => Promise<void>) => { initialize = fn(); return initialize; },
    } as unknown as DurableObjectState;
    const socket = new BattleWebsocket(ctx, env);
    await initialize;
    connected = true;
    socket.sessions.set(ws, { id: "audit-owner" });
    return socket;
  }
  const socket = await construct();
  let request = 0;
  return {
    socket, ws, received, rehydrate: construct,
    cast: (spellId = "audit-hit") => SuperJSON.stringify({
      type: "castSpell", data: {
        entityId: "audit-hero", spellId, targetIds: ["audit-goblin"],
        requestId: `request-${++request}`, revision: socket.bm.events.length,
      },
    }),
    journal: () => structuredClone(storage.get("messages")),
    workflowAttempts: () => workflowAttempts,
    workflows: () => [...workflows],
    failStorage: () => { storageFailure = true; },
    allowStorage: () => { storageFailure = false; },
    failWorkflow: () => { workflowFailure = true; },
    allowWorkflow: () => { workflowFailure = false; },
  };
}
