import { afterAll, afterEach, beforeAll, beforeEach, expect, mock, test } from "bun:test";
import { Window } from "happy-dom";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import SuperJSON from "superjson";
import { Character } from "../../apps/game/src/base-entity";
import { BM } from "../../apps/game/src/bm";
import { BaseEnemy } from "../../apps/game/src/enemies/base/base.enemy";
import { createSpellFromType } from "../../apps/game/src/spells/base/spell-from-type";
import type { SpellType } from "../../apps/game/src/spells/base/spell-types";
import { availableSpells, castBattleSpell, getBattleTargets } from "../../apps/server/src/battle/commands";
import type { BattleMessage, ResponseMessage } from "../../apps/server/src/battle/protocol";
import { snapshot } from "../../tests/battle/encounter";

// Real React session hook and real command resolver, with a local transport.
// No authenticated account, network service, or persistent game data is used.
const browser = new Window({ url: "http://localhost:3001/battle/audit" });
Object.assign(globalThis, {
  window: browser, document: browser.document, navigator: browser.navigator,
  location: browser.location, HTMLElement: browser.HTMLElement,
  IS_REACT_ACT_ENVIRONMENT: true,
});
mock.module("@clerk/clerk-react", () => ({ useUser: () => ({ user: { id: "fixture-owner" } }) }));
let sockets: Socket[] = [];
let sent: BattleMessage[] = [];
class Socket {
  static OPEN = 1; static CONNECTING = 0; static CLOSING = 2; static CLOSED = 3;
  readyState = 0;
  onopen?: () => void;
  onclose?: () => void;
  onmessage?: (event: { data: string }) => void;
  constructor(public url: string) { sockets.push(this); }
  send(message: string) { sent.push(SuperJSON.parse(message)); }
  open() { this.readyState = 1; this.onopen?.(); }
  close() { this.readyState = 3; this.onclose?.(); }
  receive(response: ResponseMessage) { this.onmessage?.({ data: SuperJSON.stringify(response) }); }
}
Object.assign(globalThis, { WebSocket: Socket });
const { useBattle } = await import("../../apps/client/src/routes/battle/-hooks/use-battle");
let session: ReturnType<typeof useBattle>;
let root: Root;
let socket: Socket;
let bm: BM;
let container: HTMLElement;
const originalLog = console.log;
beforeAll(() => { console.log = () => {}; });
afterAll(() => { console.log = originalLog; });

function Probe() {
  session = useBattle("audit");
  return <div>
    <output aria-label="Mana">{session.playback.stats.get("hero-0")?.mana}</output>
    <button disabled={!session.canCast} onClick={session.castSpell}>Cast</button>
    {session.error && <p role="alert">{session.error}</p>}
  </div>;
}
function fixture(type: SpellType, seed: string) {
  const heroes = [0, 1].map(index => {
    const entity = new Character(`hero-${index}`, "fixture-owner", `Hero ${index}`, "TEAM_A", 500, 150,
      { intelligence: 20, vitality: 20, strength: 10, agility: 30 - index }, 0, 5, 0);
    const spells: SpellType[] = index === 0 ? [type, "basic-attack"] : ["basic-attack"];
    entity.spells = spells.map(type => createSpellFromType(`${entity.id}-${type}`, type));
    return entity;
  });
  const enemy = new BaseEnemy({ id: "enemy", name: "Enemy", type: "goblin", team: "TEAM_B", maxHealth: 500, maxMana: 100,
    baseAttributes: { intelligence: 10, vitality: 10, strength: 2, agility: 10 },
    spells: ["basic-attack"], xp: 0, loot: { gold: 0, items: [] } });
  const result = new BM([...heroes, enemy], seed);
  result.start();
  return result;
}
function sendState() {
  socket.receive({ type: "state", data: {
    events: bm.events, effectTracking: bm.effectTracking, round: bm.getCurrentRound(),
    revision: bm.events.length, availableSpells: availableSpells(bm),
  } });
}
async function mount(type: SpellType, seed: string) {
  bm = fixture(type, seed);
  await act(async () => root.render(<Probe />));
  socket = sockets[0];
  await act(async () => {
    socket.open();
    socket.receive({ type: "entities", data: { entities: snapshot(bm.startEntityData) as never } });
    sendState();
  });
}
async function submit(type: SpellType) {
  await act(async () => session.getTargets(`hero-0-${type}`));
  const request = sent.filter(m => m.type === "getTargets").at(-1)!;
  if (request.type !== "getTargets") throw new Error("No target request");
  await act(async () => socket.receive({ type: "targets", data: getBattleTargets(bm, request.data) }));
  if (!session.automaticTargets) await act(async () => session.setChosenTargets(["enemy"]));
  expect(session.canCast).toBe(true);
  await act(async () => session.castSpell());
  const command = sent.filter(m => m.type === "castSpell").at(-1)!;
  if (command.type !== "castSpell") throw new Error("No cast request");
  let rejection: string | undefined;
  try { castBattleSpell(bm, command.data, "fixture-owner"); }
  catch (error) { rejection = (error as Error).message; }
  await act(async () => {
    if (rejection) socket.receive({ type: "rejected", data: { requestId: command.data.requestId, message: rejection } });
    else socket.receive({ type: "castAccepted", data: { requestId: command.data.requestId } });
    sendState();
  });
  await act(async () => session.playback.skip());
  return rejection;
}
beforeEach(() => {
  sockets = []; sent = [];
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  document.body.innerHTML = "";
});

test("real client hook displays server mana after delayed charge and reconnect", async () => {
  await mount("arcane-channeling", "charge-client");
  expect(await submit("arcane-channeling")).toBeUndefined();
  const liveMana = bm.getEntityById("hero-0")!.mana;
  const observedBeforeReconnect = session.playback.stats.get("hero-0")!.mana;
  await act(async () => { socket.close(); socket.open(); sendState(); });
  expect(session.playback.stats.get("hero-0")!.mana).toBe(liveMana);
  expect(observedBeforeReconnect).toBe(liveMana);
  expect(container.querySelector("output")!.textContent).toBe(String(liveMana));
});

test("a rejected Battle Roar cannot leave the client showing mana the server already spent", async () => {
  // This fixed seed rolls the unsuccessful branch of Battle Roar.
  await mount("battle-roar", "crypt-of-forgotten-echoes-wave1-trial3");
  const rejection = await submit("battle-roar");
  expect(rejection).toBe("The spell was rejected.");
  expect(session.error).toBe(rejection);
  expect(session.pending).toBe(false);
  expect(session.playback.stats.get("hero-0")!.mana).toBe(bm.getEntityById("hero-0")!.mana);
});

test("control: ordinary chosen-target cast remains consistent through the real client hook", async () => {
  await mount("cinder-wisp", "client-control");
  expect(await submit("cinder-wisp")).toBeUndefined();
  expect(session.pending).toBe(false);
  for (const entity of bm.entities) {
    expect(session.playback.stats.get(entity.id)!.health).toBe(entity.health);
    expect(session.playback.stats.get(entity.id)!.mana).toBe(entity.mana);
  }
});
