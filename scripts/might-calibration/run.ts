import { mkdir } from "node:fs/promises";
import { quietProbe } from "./engine";
import { probes } from "./fixtures";

const seeds = Array.from({ length: 64 }, (_, i) => `might-v1-${i.toString().padStart(3, "0")}`);
const mean = (values: number[]) => Math.round(values.reduce((sum, value) => sum + value, 0) / values.length * 1000) / 1000;
const reports = probes.map((probe) => {
  const runs = seeds.map((seed) => quietProbe(probe, seed));
  return {
    probe,
    summary: {
      partyDamage: mean(runs.map((run) => run.damageByActor.caster! + (run.damageByActor.partner ?? 0))),
      casterDamage: mean(runs.map((run) => run.damageByActor.caster!)),
      casterHealing: mean(runs.map((run) => run.healingByActor.caster!)),
      casterManaSpent: mean(runs.map((run) => run.resourceChanges.caster!.manaSpent)),
      casterManaRegenerated: mean(runs.map((run) => run.resourceChanges.caster!.usefulManaRegen)),
      casterManaRemaining: mean(runs.map((run) => run.resourceChanges.caster!.final.mana)),
      casterDamageTaken: mean(runs.map((run) => run.resourceChanges.caster!.damageTaken)),
      casterActivations: mean(runs.map((run) => run.activationsByActor.caster!)),
      partnerActivations: mean(runs.map((run) => run.activationsByActor.partner ?? 0)),
      enemyActivations: mean(runs.map((run) => run.enemyActivations)),
      deadEnemies: mean(runs.map((run) => run.deadEnemyCount)),
      clears: runs.filter((run) => run.winningTeam === "TEAM_A").length,
      defeats: runs.filter((run) => run.winningTeam === "TEAM_B").length,
    },
    // All seeds retain useful outcomes and resources; a full representative
    // trace makes timing reviewable without thousands of duplicate decisions.
    runs: runs.map((run, seedIndex) => [
      seedIndex, run.damageByActor.caster!, run.damageByActor.partner ?? 0,
      run.healingByActor.caster!, run.resourceChanges.caster!.manaSpent,
      run.resourceChanges.caster!.usefulManaRegen, run.resourceChanges.caster!.final.mana,
      run.resourceChanges.caster!.damageTaken, run.resourceChanges.caster!.usefulHealthRegen,
      run.resourceChanges.caster!.final.health, run.activationsByActor.caster!,
      run.activationsByActor.partner ?? 0, run.activationsByActor["enemy-0"]!,
      run.completedRounds, Number(run.gameOver), run.enemyActivations, run.deadEnemyCount,
      Number(run.winningTeam === "TEAM_A"), Number(run.winningTeam === "TEAM_B"),
    ]),
    trace: runs[0],
  };
});
const report = {
  schemaVersion: 2,
  runtime: Bun.version,
  rulesVersion: 2,
  seedCount: seeds.length,
  seeds,
  runColumns: ["seedIndex", "casterDamage", "partnerDamage", "casterHealing", "casterManaSpent", "casterManaRegenerated", "casterManaRemaining", "casterDamageTaken", "casterHealthRegenerated", "casterHealthRemaining", "casterActivations", "partnerActivations", "enemy0Activations", "completedRounds", "gameOver", "enemyActivations", "deadEnemyCount", "clear", "defeat"],
  metadata: {
    purpose: "Synthetic controlled engine probes, not Might scores or encounter balance estimates.",
    attributes: "Base Strength, Intelligence and Vitality share stat input (10/20/50); real equipment bonuses apply on BM join. Agility is fixed for order: caster 100, partner 90, enemies 10 minus index.",
    resources: "1000 max HP, 100 max mana. Hero regeneration remains live; enemies use real bot regeneration. No crit, penetration, resistance, passives or reaction effects unless explicitly configured.",
    decisions: "Cast requested spell once, or whenever ready when repeat=true; otherwise Basic Attack. Allies always attack enemy-0 while alive; enemies pass unless retaliate=true. No movement. All direct attacks begin in range.",
    horizon: "rounds is an exclusive zero-based boundary for activations. Before preTurn, drain a blocked actor with BM.postTurn exactly as BM.preTurn does, stopping at the boundary to avoid an extra upkeep. All already-executed boundary hooks are included in both the event ledger and final resource state. Game-over may stop earlier. completedRounds counts finished full rounds; it can be zero for a round-zero killing blow.",
    randomness: "Identical seed lists per scenario; different actions consume RNG differently, so paired seeds do not ensure identical subsequent rolls. Arithmetic means are descriptive samples, not confidence intervals.",
    actualOutput: "Damage and healing come from v2 SPELL_CAST and EFFECT_TRIGGER health-change impacts after the initial resource snapshot, capped by remaining or missing HP. Useful regeneration is reconciled from actual net resources and all recorded impacts. Round-start hooks executed by postTurn at the boundary are included; no boundary activation is requested. enemyActivations sums all enemies; enemy0Activations explicitly describes only the first enemy. clears/defeats count winning-team outcomes; deadEnemies is mean actual enemy deaths.",
  },
  reports,
};
const directory = new URL("../../docs/might/calibration/", import.meta.url);
await mkdir(directory, { recursive: true });
await Bun.write(new URL("engine-results.json", directory), JSON.stringify(report) + "\n");
console.table(reports.map(({ probe, summary }) => ({ id: probe.id, ...summary })));
console.log(`Wrote ${reports.length} probes × ${seeds.length} seeds to docs/might/calibration/engine-results.json`);
