import type { BaseEntity } from "../../apps/game/src/base-entity";
import type { CastSelection } from "../../apps/game/src/tactical/types";
import { fixture, type Probe } from "./fixtures";

function resources(entities: BaseEntity[]) {
  return Object.fromEntries(entities.map((entity) => [entity.id, {
    health: entity.health, mana: entity.mana,
  }]));
}

type ProbeSetup = (context: ReturnType<typeof fixture>) => void;

export function runProbe(probe: Probe, seed: string, setup?: ProbeSetup) {
  const context = fixture(probe, seed);
  setup?.(context);
  const { bm, caster, partner, enemies } = context;
  const initial = resources(bm.entities as BaseEntity[]);
  const initialEventCount = bm.events.length;
  const decisions: { round: number; actor: string; action: string; cooldownAfter: number }[] = [];
  const blockedTurns: { round: number; actor: string }[] = [];
  let spellUsed = false;
  // BM.preTurn drains blocked turns internally until it prepares a live actor.
  // Drain those turns with the same public postTurn call first so a blocked
  // final actor cannot make preTurn grant an upkeep beyond the chosen horizon.
  while (!bm.isGameOver() && bm.getCurrentRoundNumber() < probe.rounds) {
    const head = bm.getCurrentRound().orderQueue[0]!;
    const queued = bm.getEntityById(head);
    if (queued?.activeEffects.some((effect) => effect.preventsAction)) {
      blockedTurns.push({ round: bm.getCurrentRoundNumber(), actor: head });
      bm.postTurn(head);
      continue;
    }
    bm.preTurn();
    if (bm.isGameOver() || bm.getCurrentRoundNumber() >= probe.rounds) break;
    const id = bm.grid!.activation!.entityId;
    const entity = bm.getEntityById(id)!;
    const target = enemies.find((enemy) => !enemy.isDead());
    const special = id === caster.id && probe.spell
      ? entity.spells.find((spell) => spell.config.type === probe.spell)
      : undefined;
    const useSpecial = special && (!spellUsed || probe.repeat) && special.canCast(entity);
    const shouldCast = entity.team === "TEAM_A" || probe.retaliate;
    const spell = useSpecial ? special : entity.spells[0]!;
    let action = "pass";
    if (shouldCast && target) {
      let recipient = entity.team === "TEAM_A" ? target : caster;
      if (useSpecial && probe.spell === "single-heal") recipient = caster;
      if (useSpecial && probe.spell === "fleetfoot-gambit") recipient = probe.fleetTarget === "partner" ? partner! : caster;
      const selection: CastSelection = spell.config.targeting!.aim === "global"
        ? { aim: "global" }
        : spell.config.targeting!.aim === "caster"
          ? { aim: "caster" }
          : { aim: "tile", tile: bm.grid!.positions[recipient.id]! };
      if (!bm.safeCastSpatial(id, spell.config.id, selection)) {
        throw new Error(`Illegal scripted cast: ${probe.id} round ${bm.getCurrentRoundNumber()} ${id} ${spell.config.type}`);
      }
      action = spell.config.type;
      if (useSpecial) spellUsed = true;
    } else if (!bm.passTurn(id)) {
      throw new Error(`Illegal pass: ${probe.id} ${id}`);
    }
    const round = bm.getCurrentRoundNumber();
    bm.postTurn(id);
    decisions.push({ round, actor: id, action, cooldownAfter: special?.currentCooldown ?? 0 });
    if (decisions.length > 100) throw new Error("Probe exceeded its bounded decision budget");
  }
  // Resource snapshots include all hooks that postTurn already executed,
  // including onPreRound at the boundary. Their impacts must share that cutoff.
  const events = bm.events.slice(initialEventCount);
  const casts = events.flatMap(({ round, event }) => event.eventType === "SPELL_CAST" ? [{
    round, actor: event.data.payment?.casterId ?? event.data.spatial?.casterId ?? "caster",
    spell: bm.getSpellById(event.data.spellId)!.config.type,
    origin: event.data.origin,
    roll: event.data.roll,
    manaSpent: event.data.payment?.manaSpent ?? 0,
    cooldownAtPayment: event.data.payment?.cooldown ?? null,
    impacts: event.data.impacts ?? [],
  }] : []);
  const triggers = events.flatMap(({ round, event }) => event.eventType === "EFFECT_TRIGGER" ? [{
    round, effectId: event.data.effectId, impacts: event.data.impacts ?? [],
  }] : []);
  const impacts = events.flatMap(({ event }) =>
    event.eventType === "SPELL_CAST" || event.eventType === "EFFECT_TRIGGER"
      ? event.data.impacts ?? [] : [],
  );
  const final = resources(bm.entities as BaseEntity[]);
  const damageByActor = Object.fromEntries(bm.entities.map((entity) => [entity.id,
    impacts.filter((impact) => impact.cause.sourceId === entity.id)
      .reduce((sum, impact) => sum + Math.max(0, -impact.healthChange), 0),
  ]));
  const healingByActor = Object.fromEntries(bm.entities.map((entity) => [entity.id,
    impacts.filter((impact) => impact.cause.sourceId === entity.id)
      .reduce((sum, impact) => sum + Math.max(0, impact.healthChange), 0),
  ]));
  const manaSpentByActor = Object.fromEntries(bm.entities.map((entity) => [entity.id,
    casts.filter((cast) => cast.actor === entity.id).reduce((sum, cast) => sum + cast.manaSpent, 0),
  ]));
  const resourceChanges = Object.fromEntries(bm.entities.map((entity) => {
    const damageTaken = impacts.filter((impact) => impact.targetId === entity.id)
      .reduce((sum, impact) => sum + Math.max(0, -impact.healthChange), 0);
    const healingTaken = impacts.filter((impact) => impact.targetId === entity.id)
      .reduce((sum, impact) => sum + Math.max(0, impact.healthChange), 0);
    return [entity.id, {
      initial: initial[entity.id]!, final: final[entity.id]!, damageTaken, healingTaken,
      usefulHealthRegen: final[entity.id]!.health - initial[entity.id]!.health + damageTaken - healingTaken,
      usefulManaRegen: final[entity.id]!.mana - initial[entity.id]!.mana + manaSpentByActor[entity.id]!,
      manaSpent: manaSpentByActor[entity.id]!,
    }];
  }));
  return {
    id: probe.id, seed, completedRounds: bm.getCurrentRoundNumber(), gameOver: bm.isGameOver(),
    winningTeam: bm.getWinningTeam(), deadEnemyCount: enemies.filter((enemy) => enemy.isDead()).length,
    enemyActivations: events.filter(({ round, event }) => round < probe.rounds
      && event.eventType === "ACTIVATION_START" && enemies.some((enemy) => enemy.id === event.data.entityId)).length,
    attributes: Object.fromEntries(bm.entities.map((entity) => [entity.id, {
      strength: entity.getAttribute("strength"), intelligence: entity.getAttribute("intelligence"),
      vitality: entity.getAttribute("vitality"), armor: entity.getAttribute("armor"),
      magicResistance: entity.getAttribute("magicResistance"), healthRegen: entity.getAttribute("healthRegen"),
      manaRegen: entity.getAttribute("manaRegen"),
    }])),
    damageByActor, healingByActor, resourceChanges,
    activationsByActor: Object.fromEntries(bm.entities.map((entity) => [entity.id,
      events.filter(({ round, event }) => round < probe.rounds
        && event.eventType === "ACTIVATION_START" && event.data.entityId === entity.id).length,
    ])),
    decisions, blockedTurns, casts, triggers,
  };
}

export function quietProbe(probe: Probe, seed: string, setup?: ProbeSetup) {
  const originalLog = console.log;
  console.log = () => {};
  try { return runProbe(probe, seed, setup); } finally { console.log = originalLog; }
}
