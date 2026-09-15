import { BaseEntity } from "../../apps/game/src/base-entity";
import { BM } from "../../apps/game/src/bm";
import { DamageSpell } from "../../apps/game/src/spells/base/damage.spell";
import { TotalDamageModule } from "../../apps/game/src/modules/damage.module";
import { createSpellFromType } from "../../apps/game/src/spells/base/spell-from-type";
import {
  SpellTypeSchema,
  type SpellType,
} from "../../apps/game/src/spells/base/spell-types";
import type { CastSelection } from "../../apps/game/src/tactical/types";
import { queryCast } from "../../apps/game/src/tactical/queries";
import {
  MIGHT_REFERENCE,
  type MightReferenceBuild,
} from "../../apps/game/src/might/reference-profile";
import { mean, quiet, referenceHero, referenceImpacts } from "./reference";
import type { PassiveType } from "../../apps/game/src/passive-skills/base/passive-types";

export type SequenceCase = {
  type: SpellType;
  build: MightReferenceBuild;
  count: number;
  armored: boolean;
  seed: string;
  variant?: "basic" | "no-effect" | "immediate";
  rounds?: number;
  allyTarget?: boolean;
  passive?: PassiveType;
  healthFraction?: number;
  enemyFraction?: number;
  pressure?: number;
  targetLoss?: boolean;
  casterLoss?: boolean;
};

export function measureSequence(c: SequenceCase) {
  const hero = referenceHero(c.build, "hero", c.passive);
  hero.baseAttributes.movement = 0;
  const partner = referenceHero("physical", "partner");
  partner.baseAttributes.agility = 10;
  partner.baseAttributes.movement = 0;
  partner.spells = [
    createSpellFromType("partner:basic-attack", "basic-attack"),
  ];
  let special = createSpellFromType("hero:special", c.type);
  if (c.variant === "no-effect" && "effectChance" in special)
    special.effectChance = 0;
  if (c.variant === "immediate")
    special = new DamageSpell(
      { ...special.config },
      new TotalDamageModule("MAGICAL", ({ caster }) => {
        const int = caster.getAttribute("intelligence");
        return int * (1.5 + Math.floor(int / 20) * 0.1);
      }),
    );
  hero.spells = [
    createSpellFromType("hero:basic-attack", "basic-attack"),
    special,
  ];
  const enemies = Array.from({ length: c.count }, (_, i) => {
    const enemy = new BaseEntity(
      `target-${i}`,
      "Sequence target",
      "TEAM_B",
      1500,
      0,
      {
        strength: 80,
        intelligence: 80,
        vitality: 100,
        agility: 35 - i,
        movement: 0,
      },
    );
    enemy.baseSpecialAttributes.armor = c.armored ? 30 : 0;
    enemy.baseSpecialAttributes.magicResistance = c.armored ? 20 : 0;
    enemy.spells = [
      new DamageSpell(
        {
          id: `target-${i}:pressure`,
          type: "fireball",
          name: "Pressure",
          manaCost: 0,
          cooldown: 0,
          tier: "E",
          targetType: { enemies: 1, allies: 0 },
          targeting: {
            aim: "tile",
            range: { min: 1, max: 8 },
            recipients: "enemies",
            affectedTiles: [[0, 0]],
          },
        },
        new TotalDamageModule(
          i % 2 ? "MAGICAL" : "PHYSICAL",
          () => c.pressure ?? 65,
        ),
      ),
    ];
    return enemy;
  });
  const bm = new BM([hero, partner, ...enemies], c.seed, {
    rulesVersion: 2,
    battlefield: {
      width: 7,
      height: 7,
      blocked: [],
      layoutVersion: "might-sequence-v3",
    },
    positions: {
      hero: { x: 2, y: 3 },
      partner: { x: 3, y: 4 },
      ...Object.fromEntries(
        enemies.map((x, i) => [
          x.id,
          ["precise-thrust", "tidepiercer-thrust"].includes(c.type)
            ? { x: 3 + i, y: 3 }
            : { x: 3, y: 3 - i },
        ]),
      ),
    },
  });
  hero.health = Math.round(hero.maxHealth * (c.healthFraction ?? 0.55));
  partner.health = Math.round(partner.maxHealth * (c.healthFraction ?? 0.55));
  for (const enemy of enemies)
    enemy.health = Math.round(enemy.maxHealth * (c.enemyFraction ?? 1));
  const initialHealth = hero.health + partner.health;
  bm.start();
  let used = false;
  let decisions = 0;
  const trace: { round: number; actor: string; action: string }[] = [];
  const blocked: { round: number; actor: string }[] = [];
  const horizon = c.rounds ?? 3;
  while (!bm.isGameOver() && bm.getCurrentRoundNumber() < horizon) {
    if (++decisions > 150) throw new Error("Sequence decision limit");
    const head = bm.getCurrentRound().orderQueue[0]!;
    if (bm.getEntityById(head)?.activeEffects.some((x) => x.preventsAction)) {
      blocked.push({ round: bm.getCurrentRoundNumber(), actor: head });
      bm.postTurn(head);
      continue;
    }
    bm.preTurn();
    if (bm.isGameOver() || bm.getCurrentRoundNumber() >= horizon) break;
    const id = bm.grid!.activation!.entityId;
    const actor = bm.getEntityById(id)!;
    const target = enemies.find((x) => !x.isDead());
    let spell = actor.spells[0]!;
    if (
      id === "hero" &&
      !used &&
      c.variant !== "basic" &&
      special.canCast(hero)
    ) {
      spell = special;
      used = true;
    }
    let recipient =
      actor.team === "TEAM_A" ? target : c.allyTarget ? partner : hero;
    if (
      id === "hero" &&
      spell === special &&
      spell.config.targeting?.recipients === "allies"
    )
      recipient = c.allyTarget ? partner : hero;
    if (id === "partner") recipient = target;
    const aim = spell.config.targeting!.aim;
    const selection: CastSelection =
      aim === "global"
        ? { aim: "global" }
        : aim === "caster"
          ? { aim: "caster" }
          : aim === "direction"
            ? { aim: "direction", direction: "east" }
            : { aim: "tile", tile: bm.grid!.positions[recipient!.id]! };
    let action = "pass";
    if (
      recipient &&
      !recipient.isDead() &&
      queryCast(bm.grid!, bm.entities, id, spell.config.targeting!, selection)
        .legal &&
      spell.canCast(actor)
    ) {
      if (!bm.safeCastSpatial(id, spell.config.id, selection))
        throw new Error(`Illegal sequence ${c.type} ${id}`);
      action = spell.config.type;
    } else if (!bm.passTurn(id)) throw new Error("Illegal pass");
    trace.push({ round: bm.getCurrentRoundNumber(), actor: id, action });
    // Named risk sensitivities remove a locked target/caster after the cast, before release.
    if (
      id === "hero" &&
      action === "arcane-channeling" &&
      (c.targetLoss || c.casterLoss)
    ) {
      const lost = c.casterLoss ? hero : enemies[0]!;
      const result = bm.handler.damage(spell, 10000, "MAGICAL", partner, lost);
      bm.processEvent({
        eventType: "SPELL_CAST",
        data: {
          ...result,
          spellId: partner.spells[0]!.config.id,
          roll: 0,
          origin: "delayed",
        },
      });
    }
    bm.postTurn(id);
  }
  const impacts = referenceImpacts(bm);
  const heroImpacts = impacts.filter((x) => x.cause.sourceId === "hero");
  return {
    damage: heroImpacts
      .filter((x) => x.targetId.startsWith("target-"))
      .reduce((s, x) => s + Math.max(0, -x.healthChange), 0),
    healing: heroImpacts.reduce((s, x) => s + Math.max(0, x.healthChange), 0),
    health: hero.health + partner.health,
    initialHealth,
    damageTaken: impacts
      .filter((x) => x.targetId === "hero" || x.targetId === "partner")
      .reduce((s, x) => s + Math.max(0, -x.healthChange), 0),
    heroHealth: hero.health,
    heroMana: hero.mana,
    heroDead: hero.isDead(),
    enemyActions: trace.filter(
      (x) => x.actor.startsWith("target-") && x.action !== "pass",
    ).length,
    heroActions: trace.filter((x) => x.actor === "hero" && x.action !== "pass")
      .length,
    partnerActions: trace.filter(
      (x) => x.actor === "partner" && x.action !== "pass",
    ).length,
    blocked,
    trace,
    used,
    rounds: bm.getCurrentRoundNumber(),
    unfinished: !bm.isGameOver(),
    effects: [...bm.effectTracking.values()].map(
      ({
        id,
        sourceId,
        targetId,
        effectType,
        duration,
        round,
        description,
      }) => ({ sourceId, targetId, effectType, duration, round, description }),
    ),
    events: bm.events
      .filter((x) => x.event.eventType === "SPELL_CAST")
      .map(({ round, event }) => ({ round, ...event.data })),
  };
}

const tankSpells = new Set([
  "bulwark-bash",
  "earthshatter",
  "aegis-wall",
  "iron-will",
  "deflecting-stance",
  "festering-blow",
  "stone-bark",
]);
const physicalSpells = new Set([
  "basic-attack",
  "crude-strike",
  "vital-strike",
  "splinter-shot",
  "crushing-blow",
  "stunning-strike",
  "staggering-jab",
  "battle-roar",
  "torrent-spiral",
  "tidepiercer-thrust",
  "rupture",
  "final-verdict",
]);
export const spellBuild = (type: SpellType): MightReferenceBuild =>
  tankSpells.has(type)
    ? "tank"
    : ["precise-thrust", "bladestorm-rhythm"].includes(type)
      ? "agility"
      : physicalSpells.has(type)
        ? "physical"
        : "caster";

function recordedOutcome(
  result: ReturnType<typeof measureSequence>,
  keepTrace: boolean,
) {
  const { events, effects, trace, ...endpoints } = result;
  return keepTrace ? { ...endpoints, events, effects, trace } : endpoints;
}

if (import.meta.main) {
  const seeds = Array.from({ length: 16 }, (_, i) => `might-sequence-v3-${i}`);
  const rows = quiet(() =>
    SpellTypeSchema.options.map(({ value: type }) => {
      const build = spellBuild(type);
      const variants: SequenceCase["variant"][] = ["basic"];
      if (type === "arcane-channeling") variants.push("immediate");
      else if ("effectChance" in createSpellFromType(type, type))
        variants.push("no-effect");
      const runs = [1, 3].flatMap((count) =>
        [false, true].flatMap((armored) =>
          seeds.flatMap((seed) =>
            variants.map((variant) => {
              const input: SequenceCase = {
                type,
                build,
                count,
                armored,
                seed,
                allyTarget: [
                  "deflecting-stance",
                  "fleetfoot-gambit",
                  "iron-will",
                ].includes(type),
              };
              return {
                input,
                variant,
                baseline: recordedOutcome(
                  measureSequence({ ...input, variant }),
                  seed === seeds[0],
                ),
                treatment: recordedOutcome(
                  measureSequence(input),
                  seed === seeds[0],
                ),
              };
            }),
          ),
        ),
      );
      const summary = variants.map((variant) => {
        const pairs = runs.filter((x) => x.variant === variant);
        return {
          variant,
          pairs: pairs.length,
          ...Object.fromEntries(
            [
              "damage",
              "healing",
              "health",
              "damageTaken",
              "enemyActions",
              "heroActions",
              "partnerActions",
            ].map((key) => [
              key + "Gain",
              mean(
                pairs.map(
                  (x) =>
                    Number(x.treatment[key as keyof typeof x.treatment]) -
                    Number(x.baseline[key as keyof typeof x.baseline]),
                ),
              ),
            ]),
          ),
        };
      });
      return { type, build, summary, runs };
    }),
  );
  const risks = quiet(() =>
    ["targetLoss", "casterLoss"].flatMap((risk) =>
      [false, true].map((armored) => {
        const input: SequenceCase = {
          type: "arcane-channeling",
          build: "caster",
          count: 3,
          armored,
          seed: "might-charge-risk-v3",
          [risk]: true,
        };
        return {
          input,
          baseline: measureSequence({ ...input, variant: "immediate" }),
          treatment: measureSequence(input),
        };
      }),
    ),
  );
  await Bun.write(
    "docs/might/assessments/spell-sequences-v3.json",
    JSON.stringify({
      version: 3,
      bun: Bun.version,
      reference: MIGHT_REFERENCE,
      seeds,
      conditions:
        "Scripted 3-round sequences, one special cast then Basic Attack. Wounded two-hero party, 1/3 mixed 65-raw threats, 0/30 armor and 0/20 MR, fixed tactical positions. Baseline replaces the special with Basic Attack; no-effect pairs hold damage fixed and disable its proc; immediate Arcane holds payoff/mana/cooldown fixed and removes charging. Each case retains endpoints and blocked turns; its first seed also retains full effects, events and action traces. All charge-risk pairs retain full traces. Formation is deliberately favorable and is not a target-coverage probability.",
      rows,
      risks,
    }),
  );
  for (const { runs, ...row } of rows) console.log(JSON.stringify(row));
}
