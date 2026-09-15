import { afterEach, beforeEach, expect, test } from "bun:test";
import { Window } from "happy-dom";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import SuperJSON from "superjson";
import { Character } from "../../apps/game/src/base-entity";
import { BM } from "../../apps/game/src/bm";
import { Goblin } from "../../apps/game/src/enemies/goblin";
import { readCombatAttributes } from "../../apps/game/src/combat-attributes";
import { createSpellFromType } from "../../apps/game/src/spells/base/spell-from-type";
import type { Entity } from "../../apps/game/src/entity-types";
import type { BattleMessage } from "../../apps/server/src/battle/protocol";
import { describeBattleSpell } from "../../apps/server/src/battle/commands";
import { TinyEmitter } from "../../apps/client/src/utils/tiny-emitter";
import type { BattleConnectionEvent } from "../../apps/client/src/routes/battle/-hooks/use-battle-connection";
import { useAttributes } from "../../apps/client/src/routes/battle/-hooks/use-attributes";
import { BattleCombatStats } from "../../apps/client/src/routes/battle/-presentation/battle-combat-stats";

let root: Root, container: HTMLDivElement, battle: BM;
let hero: Character, goblin: Goblin;
let events: TinyEmitter<BattleConnectionEvent>, sent: BattleMessage[];

function Probe({
  entity,
  revision = 0,
}: {
  entity: Entity;
  revision?: number;
}) {
  // The live session also creates new read callbacks after each response.
  const attributes = useAttributes(
    (message) => sent.push(SuperJSON.parse(message)),
    events,
  );
  return (
    <BattleCombatStats
      entity={entity}
      session={{
        ...attributes,
        getSpellDescription: () => {},
        spellDescription: new Map(
          entity.spells.map((spell) => [
            spell.config.id,
            describeBattleSpell(battle, entity, spell),
          ]),
        ),
        readyState: 1,
        battleState: {
          revision,
          events: [],
          effectTracking: battle.effectTracking,
          round: battle.getCurrentRound(),
          availableSpells: [],
        },
      }}
    />
  );
}

beforeEach(() => {
  const browser = new Window();
  Object.assign(globalThis, {
    window: browser,
    document: browser.document,
    navigator: browser.navigator,
    IS_REACT_ACT_ENVIRONMENT: true,
  });
  container = document.createElement("div");
  root = createRoot(container);
  events = new TinyEmitter();
  sent = [];
  hero = new Character(
    "hero",
    "owner",
    "Hero",
    "TEAM_A",
    100,
    50,
    { strength: 5, intelligence: 5, vitality: 5, agility: 100 },
    0,
    1,
    0,
  );
  hero.spells = [createSpellFromType("attack", "basic-attack")];
  goblin = new Goblin("goblin");
  battle = new BM([hero, goblin], "inspector-stats", {
    rulesVersion: 2,
    battlefield: { width: 7, height: 7, layoutVersion: "test", blocked: [] },
    positions: { hero: { x: 2, y: 3 }, goblin: { x: 2, y: 2 } },
  });
  battle.start();
  battle.preTurn();
});
afterEach(async () => {
  await act(async () => root.unmount());
});

async function respond(entity: Entity) {
  await act(async () =>
    events.emit({
      type: "characterAttributes",
      data: { entityId: entity.id, ...readCombatAttributes(entity) },
    }),
  );
}
function stat(label: string) {
  return [...container.querySelectorAll("dl > div")]
    .find((row) => row.querySelector("dt")?.textContent === label)
    ?.querySelector("dd")?.textContent;
}

test("Inspect displays effective defenses and equipment stats from the server, not base values", async () => {
  await act(async () => root.render(<Probe entity={goblin} />));
  expect(container.textContent).toContain("Loading combat stats");
  expect(sent).toEqual([
    { type: "getCharacterAttributes", data: { characterId: goblin.id } },
  ]);
  await respond(goblin);
  expect(goblin.baseSpecialAttributes.armor).toBe(10);
  expect(stat("Armor")).toBe("12");
  expect(stat("Intelligence")).toBe("11");
  expect(container.textContent).toContain("Natural attack");
  expect(container.textContent).toContain("reduce damage to zero");
  expect(sent.length).toBe(1);
});

test("Open inspection refreshes on battle revisions without a response/request loop", async () => {
  await act(async () => root.render(<Probe entity={goblin} />));
  await respond(goblin);
  goblin.attributeModifiers.push({
    id: "ward",
    attribute: "armor",
    operation: "ADD",
    value: 5,
  });
  await act(async () => root.render(<Probe entity={goblin} revision={1} />));
  expect(sent.length).toBe(2);
  await respond(goblin);
  expect(stat("Armor")).toBe("18");
  await act(async () => root.render(<Probe entity={goblin} revision={1} />));
  expect(sent.length).toBe(2);
});

test("Changing actors does not show the previous actor's stats and formats fractional stats as percentages", async () => {
  await act(async () => root.render(<Probe entity={goblin} />));
  await respond(goblin);
  hero.baseSpecialAttributes.critChance = 0.125;
  await act(async () => root.render(<Probe entity={hero} />));
  expect(container.textContent).toContain("Loading combat stats");
  expect(stat("Armor")).toBeUndefined();
  await respond(hero);
  expect(container.textContent).toContain("Unarmed");
  expect(stat("Critical chance")).toBe("12.5%");
  expect(sent.length).toBe(2);
});
