import { Character } from "@loot-game/game/base-entity";
import { MANUAL_CONTROL, type AiControl } from "@loot-game/game/ai-control";
import { createSpellFromType } from "@loot-game/game/spells/base/spell-from-type";
import { equipmentFactory } from "@loot-game/game/items/equipment/equipment-factory";
import { EquipmentTypeSchema } from "@loot-game/game/items/equipment-types";
import { passiveSkillFactory } from "@loot-game/game/passive-skills/base/passive-skill.factory";
import { trialOfTheNature } from "@loot-game/game/dungeons/trial-of-the-nature";
import { createEnemyFromType } from "../../../server/src/game-usecases/enemy-factory";
import type { SpellType } from "@loot-game/game/spells/base/spell-types";
import { ownerId } from "./auth";
import { getItemDefinition } from "@loot-game/game/items/catalog";
import { itemQuantity } from "@loot-game/game/items/quantity";
import {
  restorationAmount,
  type ConsumableLoadout,
} from "@loot-game/game/items/consumables";
import { installItemFixtures } from "../../../../tests/battle/support/item-fixtures";

export const scenario =
  new URLSearchParams(location.search).get("state") ?? "populated";
export const empty = scenario === "empty";
const itemFixtures = scenario === "items" ? installItemFixtures() : undefined;
const itemStacks = new Map<string, number>(
  itemFixtures
    ? [
        [itemFixtures.material.type, 7],
        [itemFixtures.consumable.type, 2],
      ]
    : scenario === "consumables"
      ? [
          ["healing-potion", 3],
          ["mana-potion", 2],
          ["bone-shard", 4],
          ["living-resin", 2],
          ["storm-scale", 1],
        ]
      : [],
);
const consumableLoadouts = new Map<string, ConsumableLoadout>();
export const commands: { path: string; input: unknown }[] = [];
export function makeCharacter(id: string, name: string, userId = ownerId) {
  const hero = new Character(
    id,
    userId,
    name,
    "TEAM_A",
    420,
    140,
    { strength: 25, intelligence: 30, vitality: 20, agility: 40 },
    70,
    5,
    3,
  );
  hero.spells = (
    ["basic-attack", "fireball", "single-heal"] as SpellType[]
  ).map((type) => createSpellFromType(`${id}-${type}`, type));
  hero.equipped.WEAPON = equipmentFactory(
    "oakwarden-staff",
    `${id}-staff`,
    hero,
  );
  hero.passiveSkills = [
    passiveSkillFactory("armor-up", `${id}-armor-up`, hero),
  ];
  return hero;
}
export const heroes = [
  makeCharacter(
    "hero",
    scenario === "long"
      ? "Seraphina of the Forgotten Northern Watchtower"
      : "Mira",
  ),
  makeCharacter("hero-2", "Alden"),
];
export const config = trialOfTheNature();
if (scenario === "consumables") {
  heroes[0]!.health = 70;
  heroes[0]!.mana = 15;
}
export const equipment = (
  scenario === "equipment"
    ? EquipmentTypeSchema.options
    : scenario === "collection"
      ? [
          "iron-sword",
          "iron-cuirass",
          "oakwarden-staff",
          "iron-sword",
          "int-armor",
          "iron-cuirass",
          "oakwarden-staff",
          "iron-sword",
        ]
      : ["iron-sword", "iron-cuirass", "oakwarden-staff"]
).map((type, index) => ({
  id: `item-${index}`,
  type,
  equippedBy: null as string | null,
  userId: ownerId,
  item: equipmentFactory(
    type as Parameters<typeof equipmentFactory>[0],
    `item-${index}`,
    heroes[0],
  ),
}));
if (scenario === "collection") {
  for (const [index, hero] of [
    [0, heroes[0]],
    [1, heroes[0]],
    [2, heroes[1]],
  ] as const) {
    const entry = equipment[index]!;
    entry.equippedBy = hero.id;
    entry.item.holderId = hero.id;
    hero.equipped[entry.item.equipmentSlot] = entry.item;
  }
}
const collectionCopies: Partial<Record<SpellType, number>> = {
  "crude-strike": 3,
  "splinter-shot": 3,
  "cinder-wisp": 2,
  "natures-embrace": 2,
};
export const spells = (
  (scenario === "collection"
    ? [
        "crude-strike",
        "single-heal",
        "arcane-channeling",
        "bladestorm-rhythm",
        "final-verdict",
        "bulwark-bash",
        "deflecting-stance",
        "earthshatter",
        "cinder-wisp",
        "fleetfoot-gambit",
        "natures-embrace",
        "splinter-shot",
        "fireball",
        "vital-strike",
      ]
    : ["fireball", "storm-pulse", "rootgrasp", "single-heal"]) as SpellType[]
).flatMap((type) =>
  Array.from(
    {
      length: scenario === "collection" ? (collectionCopies[type] ?? 1) : 1,
    },
    (_, copy) => ({
      id: scenario === "collection" ? `owned-${type}-${copy}` : `owned-${type}`,
      type,
      userId: ownerId,
      equippedBy: null as string | null,
      description: createSpellFromType(`owned-${type}`, type).description(
        heroes[0],
      ),
    }),
  ),
);
export const passives = Array.from(
  { length: scenario === "collection" ? 7 : 1 },
  (_, copy) => ({
    id: copy === 0 ? "passive-armor-up" : `passive-armor-up-${copy}`,
    type: "armor-up",
    userId: ownerId,
    equippedBy: null as string | null,
  }),
);
export const loot = empty
  ? []
  : [
      {
        id: "loot-1",
        battleId: "result",
        userId: ownerId,
        createdAt: new Date("2026-09-15T10:00:00Z"),
        gold: 0,
        claimed: false,
        items: [
          { type: "SPELL", data: { spellType: "fireball" } },
          { type: "ITEM", data: { itemType: "iron-sword" } },
          { type: "ITEM", data: { itemType: "int-armor" } },
          ...(itemFixtures
            ? [
                {
                  type: "ITEM",
                  data: { itemType: itemFixtures.material.type, quantity: 4 },
                },
                {
                  type: "ITEM",
                  data: { itemType: itemFixtures.consumable.type, quantity: 3 },
                },
              ]
            : []),
          { type: "PASSIVE", data: { passiveType: "armor-up" } },
        ],
      },
    ];
export const friends = {
  code: "SANCTUM-7K42",
  friends: empty ? [] : [{ id: "fixture-friend", username: "Rowan" }],
  incoming: empty
    ? []
    : [
        {
          id: "request-1",
          sender: { id: "requester", username: "Elowen" },
          recipient: { id: ownerId, username: "Mira" },
          status: "pending",
        },
      ],
  outgoing: [],
  blocked: [] as { id: string; username: string }[],
};
export const invitations = empty
  ? []
  : [
      {
        id: "invitation-1",
        lobbyId: "company",
        dungeonKey: config.key,
        sender: { id: "fixture-friend", username: "Rowan" },
        recipient: { id: ownerId, username: "Mira" },
        status: "pending",
        expiresAt: new Date("2099-01-01"),
        createdAt: new Date("2026-09-15"),
      },
    ];
export const preparation = {
  id: "company",
  key: config.key,
  name: config.name,
  hostUserId: "fixture-owner",
  guestUserId: "fixture-guest",
  revision: 1,
  branching: true,
  closedAt: scenario === "closed" ? new Date() : null,
  dungeonId: null,
  canStart: false,
  participants: [
    {
      userId: "fixture-owner",
      username: "Mira",
      isHost: true,
      characterId: "hero",
      characterName: "Mira",
      ready: false,
      connected: true,
      buildRevision: 1,
    },
    {
      userId: "fixture-guest",
      username: "Rowan",
      isHost: false,
      characterId: "partner",
      characterName: "Rowan's guardian",
      ready: false,
      connected: scenario !== "reconnecting",
      buildRevision: 1,
    },
  ],
};
export const run = {
  id: "run",
  key: config.key,
  name: config.name,
  userId: ownerId,
  round: 1,
  cleared: scenario === "completed",
  activeBattle: false,
  activeBattleId: null,
  abandonedAt: scenario === "abandoned" ? new Date() : null,
  createdAt: new Date("2026-09-15"),
  playerTeam: heroes,
  loot,
  shared: null,
  route: null,
  actualEnemies: config.availableEnemies.map((types, wave) =>
    types.map((type, index) =>
      createEnemyFromType(type, `enemy-${wave}-${index}`),
    ),
  ),
  battles: [{ battleId: "result", completedAt: new Date(), round: 0 }],
};

const aiDefaults = new Map<string, AiControl>();
export function queryFixture(path: string, input: unknown): unknown {
  switch (path) {
    case "character.getAiControl":
      return (
        aiDefaults.get((input as { characterId: string }).characterId) ??
        { ...MANUAL_CONTROL }
      );
    case "character.getConsumableLoadout":
      return (
        consumableLoadouts.get(
          (input as { characterId: string }).characterId,
        ) ?? [null, null]
      );
    case "getConsumableTargets":
      return scenario === "consumables"
        ? heroes.map((hero) => ({
            dungeonId: run.id,
            dungeonName: run.name,
            round: run.round,
            characterId: hero.id,
            name: hero.name,
            health: hero.health,
            mana: hero.mana,
            maxHealth: hero.maxHealth,
            maxMana: hero.maxMana,
          }))
        : [];
    case "character.getCharacters":
      return empty ? [] : heroes;
    case "character.getCharacter":
      return heroes.find((hero) => hero.id === (input as { id: string }).id);
    case "activeBattles":
      return empty ? [] : [{ battleId: "live" }];
    case "getMyLoot":
      return loot.filter((entry) => !entry.claimed);
    case "getMySpells": {
      const grouped = new Map<
        SpellType,
        { spell: (typeof spells)[number]; ids: string[] }
      >();
      for (const spell of empty ? [] : spells) {
        const group = grouped.get(spell.type);
        if (group) group.ids.push(spell.id);
        else grouped.set(spell.type, { spell, ids: [spell.id] });
      }
      return {
        all: empty ? [] : spells,
        grouped,
      };
    }
    case "getMyPassiveSkills": {
      const grouped = new Map<
        string,
        { passiveSkill: (typeof passives)[number]; ids: string[] }
      >();
      for (const passiveSkill of empty ? [] : passives) {
        const group = grouped.get(passiveSkill.type);
        if (group) group.ids.push(passiveSkill.id);
        else
          grouped.set(passiveSkill.type, {
            passiveSkill,
            ids: [passiveSkill.id],
          });
      }
      return {
        all: empty ? [] : passives,
        grouped,
      };
    }
    case "getMyEquipment":
      return empty ? [] : equipment;
    case "getMyInventory":
      return empty
        ? []
        : [
            ...equipment.map((entry) => ({
              kind: "equipment",
              id: entry.id,
              type: entry.type,
              quantity: 1,
              equippedBy: entry.equippedBy,
              equippedCharacterName:
                heroes.find((hero) => hero.id === entry.equippedBy)?.name ??
                null,
              item: getItemDefinition(entry.type),
            })),
            ...[...itemStacks].map(([type, quantity]) => {
              const item = getItemDefinition(type);
              return {
                kind: item.kind,
                id: `stack:${type}`,
                type,
                quantity,
                item,
              };
            }),
          ];
    case "social.getFriends":
      return friends;
    case "social.getInvitations":
      return invitations;
    case "social.lookupCode":
      return { id: "fixture-new-friend", username: "Elowen" };
    case "preparation.list":
      return empty ? [] : [preparation];
    case "preparation.get":
      return preparation;
    case "dungeon.getConfig":
      return config;
    case "dungeon.allDungeons":
      return empty ? [] : [{ ...run, shared: false, guest: false }];
    case "dungeon.getRun":
      return run;
    case "dungeon.getBattleContext":
      return {
        run,
        attempt: { completedAt: new Date(), round: 0 },
        xpAwards: heroes.map((hero) => ({ characterId: hero.id, xp: 25 })),
      };
    default:
      throw new Error(`No preview fixture for ${path}`);
  }
}

export function mutateFixture(path: string, input: unknown): unknown {
  commands.push({ path, input });
  const args = input as Record<string, unknown>;
  const hero =
    heroes.find((hero) => hero.id === args?.characterId) ?? heroes[0];
  switch (path) {
    case "character.setAiControl":
      aiDefaults.set(hero.id, args.settings as AiControl);
      return args.settings;
    case "character.setConsumableLoadout":
      consumableLoadouts.set(hero.id, args.loadout as ConsumableLoadout);
      return;
    case "useConsumable": {
      const item = getItemDefinition(String(args.itemType));
      if (item.kind !== "consumable" || !(itemStacks.get(item.type) ?? 0))
        throw new Error("No potion available");
      const restored = restorationAmount(item.restoration, hero);
      if (!restored) throw new Error("Resources are already full");
      hero[item.restoration.resource] += restored;
      const remaining = itemStacks.get(item.type)! - 1;
      if (remaining) itemStacks.set(item.type, remaining);
      else itemStacks.delete(item.type);
      return { restored };
    }
    case "character.createCharacter":
      heroes.push(makeCharacter(`hero-${heroes.length + 1}`, "New adventurer"));
      return heroes.at(-1);
    case "character.renameCharacter":
      hero.name = String(args.name);
      return;
    case "character.applyStatIncrease":
      for (const stat of args.stats as (keyof Character["baseAttributes"])[]) {
        hero.baseAttributes[stat]++;
        hero.statPointsAvailable--;
      }
      return;
    case "character.equipSpell": {
      const spell = spells.find((spell) => spell.id === args.spellId)!;
      spell.equippedBy = hero.id;
      hero.spells.push(createSpellFromType(spell.id, spell.type));
      return;
    }
    case "character.unequipSpell":
      for (const spell of spells)
        if (spell.id === args.spellId) spell.equippedBy = null;
      for (const character of heroes)
        character.spells = character.spells.filter(
          (spell) => spell.config.id !== args.spellId,
        );
      return;
    case "character.equipEquipment": {
      const item = equipment.find((item) => item.id === args.equipmentId)!;
      const previousId = hero.equipped[item.item.equipmentSlot]?.id;
      const previous = equipment.find((entry) => entry.id === previousId);
      if (previous) previous.equippedBy = null;
      item.equippedBy = hero.id;
      hero.equipped[item.item.equipmentSlot] = equipmentFactory(
        item.item.itemType,
        item.id,
        hero,
      );
      return;
    }
    case "character.unequipEquipment":
      for (const item of equipment)
        if (item.id === args.equipmentId) item.equippedBy = null;
      for (const character of heroes)
        for (const slot of Object.keys(
          character.equipped,
        ) as (keyof Character["equipped"])[])
          if (character.equipped[slot]?.id === args.equipmentId)
            delete character.equipped[slot];
      return;
    case "character.equipPassiveSkill":
      hero.passiveSkills.push(
        passiveSkillFactory("armor-up", String(args.passiveSkillId), hero),
      );
      passives[0].equippedBy = hero.id;
      return;
    case "character.unequipPassiveSkill":
      for (const passive of passives)
        if (passive.id === args.passiveSkillId) passive.equippedBy = null;
      hero.passiveSkills = hero.passiveSkills.filter(
        (skill) => skill.id !== args.passiveSkillId,
      );
      return;
    case "claimLoot": {
      const entry = loot.find((entry) => entry.id === input);
      if (entry && !entry.claimed) {
        for (const reward of entry.items) {
          if (reward.type !== "ITEM" || !("itemType" in reward.data)) continue;
          const item = getItemDefinition(reward.data.itemType!);
          const quantity = itemQuantity(reward.data);
          if (item.kind === "equipment") {
            for (let index = 0; index < quantity; index++) {
              const id = `claimed-${equipment.length}`;
              equipment.push({
                id,
                type: item.type,
                equippedBy: null,
                userId: ownerId,
                item: equipmentFactory(item.type, id, heroes[0]!),
              });
            }
          } else
            itemStacks.set(
              item.type,
              (itemStacks.get(item.type) ?? 0) + quantity,
            );
        }
        entry.claimed = true;
      }
      return;
    }
    case "social.respondRequest": {
      const index = friends.incoming.findIndex(
        (request) => request.id === args.requestId,
      );
      const request = friends.incoming.splice(index, 1)[0];
      if (args.accept && request) friends.friends.push(request.sender);
      return;
    }
    case "social.removeFriend":
    case "social.block":
      friends.friends = friends.friends.filter(
        (friend) => friend.id !== args.userId,
      );
      return;
    case "social.sendRequest":
      return;
    case "social.respondInvitation":
      invitations[0].status = args.accept ? "accepted" : "declined";
      return { status: invitations[0].status, lobbyId: "company" };
    case "preparation.ready": {
      const participant = preparation.participants.find(
        (p) => p.userId === ownerId,
      )!;
      participant.ready = Boolean(args.ready);
      preparation.revision++;
      return;
    }
    case "preparation.selectCharacter":
      preparation.participants.find((p) => p.userId === ownerId)!.characterId =
        String(args.characterId);
      return;
    case "preparation.create":
      return { id: "company" };
    case "preparation.start":
      return { battleId: "live" };
    case "dungeon.enterDungeon":
      return run;
    case "dungeon.fightDungeon":
      return "live";
    case "dungeon.removeDungeon":
      return;
    default:
      throw new Error(`No preview mutation for ${path}`);
  }
}
