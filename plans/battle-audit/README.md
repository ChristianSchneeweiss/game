# Battle audit — 10 September 2026

Audited the current `prototype` checkout at `6f5c94f`, from `apps/game` through server command validation, persistence and completion, wire messages, and the client's event reducer and mounted React session hook. Application source was not modified. Existing unrelated working-tree changes were preserved.

## Verification

- Existing baseline: `bun run test:battle` — **82 pass, 0 fail**; `bun run typecheck` — **passes** for client and server.
- Registered spell sweep: **39 spells × 64 scenarios = 2,496 scenarios**, plus all **22 registered enemy kits** with depleted resources, unavailable earlier spells and dead allies.
- Spell/passive sweep: **429 combinations**, including every registered spell with each individual passive and without a passive.
- Authored encounter sweep: **300 synthetic fights across all 25 waves**, using the real enemy definitions and server command driver. **2,123 accepted commands and 2,423 client snapshots checked**; **177 fights completed consistently**, **123 stopped at the first detected problem**: 54 client-state mismatches, 40 exceptions and 29 battles without a playable turn. This is an adversarial scenario set, not a production failure-rate estimate.
- Mounted-client checks execute the real `useBattle` hook through a local WebSocket double. Mana drift persists across reconnect. Persistence checks execute real Durable Object methods and tRPC procedures against local storage/database/Cloudflare doubles; no remote database or account was changed.

Audit tests deliberately assert correct behavior and therefore fail on the audited source. Run these separately because their local environment doubles are isolated per process:

```sh
bun test plans/battle-audit/flow-checks.test.ts
bun test plans/battle-audit/client-checks.test.tsx
bun test plans/battle-audit/spell-checks.test.ts
bun test plans/battle-audit/effect-checks.test.ts
bun test plans/battle-audit/persistence-checks.test.ts
bun plans/battle-audit/encounter-sweep.ts
```

Logs and the seeded encounter traces are in this directory. These checks exercise actual combat and client code; the production database, Cloudflare scheduler, authenticated browser session, and visual rendering were not exercised in this audit.

## Findings

P1 means crashes, stuck battles, or corrupted combat/progression state. P2 means incorrect gameplay or client display. Effort estimates include regression tests: S = hours, M = about a day, S–M = between those. All rows below are verified from current source and local reproductions. The concurrent-start reproduction uses a simulated database, not PostgreSQL locking.

| ID | Priority | Finding / observed consequence | Main evidence | Fix direction | Effort / fix risk |
| --- | --- | --- | --- | --- | --- |
| B01 | P1 | Bloodfang plus magical damage, or Soulleech plus physical damage, throws **after damage is applied**. Also occurs in Emberbound Revenant's authored kit. | `apps/game/src/calculator.ts:196`, `:211`, `:268` | Merge only actual healing results; preserve existing damage-type semantics. | S / low |
| B02 | P1 | **Aegis Wall always throws**: 35 mana spent, cooldown set, no shield. | `apps/game/src/effect/max-hp-shield.effect.ts:9` | Initialize shield amount after effect context is assigned. | S / low |
| B03 | P1 | **Reflection recurses until stack overflow** when Thorn Carapace meets another reflection effect; Thundermaw is a current-content trigger. | `apps/game/src/effect/reflection.effect.ts:13`, `apps/game/src/passive-skills/thorn-carapace.passive.ts:12` | Track reflected damage origin and bound reactive hooks. | S–M / medium |
| B04 | P1 | **Titan's Resurgence never heals**, is absent from the client timeline, and throws when its unregistered HOT expires. Hollowed Oakwarden uses it. | `apps/game/src/passive-skills/titans-resurgence.passive.ts:19` | Apply through the effect handler with valid passive provenance and lifecycle registration. | S–M / medium |
| B05 | P1 | **Battle Roar's normal unsuccessful proc is treated as a rejected command** after consuming mana/cooldown. An enemy whiff can strand the driver on a bot turn. Client still shows unspent resources. | `apps/game/src/spells/base/status.spell.ts:27`, `apps/server/src/battle/commands.ts:89` | Record a completed cast even when its optional effect misses; advance normally. | S / low |
| B06 | P1 | **Arcane Channeling removes its caster from the queue before `postTurn`**, which then consumes the next ally's turn; channeling from the last slot leaves an empty queue and an unfinished battle. | `apps/game/src/effect/charge.effect.ts:15`, `apps/game/src/bm.ts:343` | Advance the actor whose action actually finished and normalize empty combat rounds. | M / medium |
| B07 | P1 | **An enemy killed during charge release is included in the newly built queue and regenerated back to life**. Repro leaves it at 2 HP despite a recorded death. | `apps/game/src/bm.ts:367`, `apps/game/src/bm.ts:326`, `apps/game/src/base-entity.ts:80` | Revalidate queue entries after hooks; never run upkeep on dead entities. | S–M / medium |
| B08 | P1 | **Lifesteal heals a caster killed by reflection without clearing death state**: alive HP, dead-map membership, DEATH event, and turn queue disagree. | `apps/game/src/calculator.ts:202`, `apps/game/src/base-entity.ts:146`, `apps/game/src/bm.ts:197` | Make lethal-damage and ordinary-healing semantics consistent; require an explicit revival transition. | S / medium |
| B09 | P1 | **Failed commands and failed journal writes mutate unsaved combat state**. The next accepted command can replay with different RNG, damage and cooldowns after hibernation. | `apps/server/src/durable-objects/battle-ws.ts:172`, `:177`, `:194`, `:86` | Commit recoverable command/state atomically; roll back all state and RNG on failure. | M / medium |
| B10 | P1 | **Transient finalization failures are never retried on recovery**. A lethal cast can have no result, or a saved result with no reward/progression workflow. | `apps/server/src/durable-objects/battle-ws.ts:185`, `:192`, `:118`, `:257` | Persist completion stages and retry them idempotently. | M / medium |
| B11 | P1 | **Losing a wave then winning its retry skips a wave** because progression uses the number of battle attempts. | `apps/server/src/game-usecases/dungeon-manager.ts:164`, `:176` | Advance using the completed battle's recorded wave. | S–M / medium |
| B12 | P1 | **Completion is not deduplicated by battle ID**. Replayed defeats award duplicate loot; an old victory replay can advance and clear a newer active battle. | `apps/server/src/game-usecases/dungeon-manager.ts:172`, `:211`, `:224` | Transactional per-battle completion marker and reward uniqueness. | M / medium |
| B13 | P1 | **Two simultaneous dungeon-start requests can create two active battles**. The active check precedes the transaction and the update has no conditional claim. | `apps/server/src/routers/dungeon-router.ts:133`, `:150`, `:154` | Lock or conditionally claim the dungeon in the same transaction. | M / medium |
| B14 | P1 | **Owning Storm Pulse breaks the spell inventory query** because description generation requires a battle RNG that is not assigned outside combat. | `apps/server/src/routers/index.ts:95`, `apps/game/src/spells/storm-pulse.ts:29` | Make description formulas pure and usable outside a battle. | S / low |
| B15 | P2 | **Saved HP/mana do not carry into the next battle**: the dungeon reports 37 HP/9 mana, while SyncFactory rebuilds 100 HP/50 mana from the roster. | `apps/server/src/game-usecases/dungeon-manager.ts:130`, `apps/server/src/game-usecases/sync-factory.ts:17`, `:49` | Persist and restore actual starting resources with battle creation. | M / medium |
| B16 | P2 | **The client charges Arcane Channeling mana again on release**: server 110 mana, client 70, including after reconnect. Cards can consequently block otherwise legal spells. | `apps/game/src/spells/arcane-channeling.ts:54`, `apps/client/src/routes/battle/-presentation/timeline.ts:150`, `apps/client/src/routes/battle/-battle-render.tsx:381` | Distinguish paying for a cast from its delayed resolution in the event contract. | M / medium |
| B17 | P2 | **Reflection/healing event order gives incorrect client HP**: Soulflare leaves the server caster at 500 HP but the client at 492, because reflection is published after healing though it resolves before it. | `apps/game/src/passive-skills/thorn-carapace.passive.ts:20`, `apps/game/src/bm.ts:146`, `apps/client/src/routes/battle/-presentation/timeline.ts:178` | Preserve actual damage/healing order in resolved events; verify capped healing. | M / medium |
| B18 | P2 | **Storm Pulse hits allies and its caster**, although its description promises random enemies. | `apps/game/src/spells/storm-pulse.ts:44` | Sample living opponents. | S / low |
| B19 | P2 | **One dead selected target cancels Arcane Channeling's entire release**, leaving surviving enemies untouched. | `apps/game/src/spells/arcane-channeling.ts:43` | Resolve against the surviving legal subset of selected targets. | S / low |
| B20 | P2 | **Volt Lash and Bladestorm keep hitting already-dead targets**; Volt Lash can waste remaining bounces while other enemies survive. | `apps/game/src/spells/volt-lash.ts:45`, `:51`, `apps/game/src/spells/bladestorm-rythm.ts:48` | Recheck life state before every hit and refresh eligible random targets. | S / medium |
| B21 | P2 | **Mystic Flow and Vital Wellspring do not change actual regeneration** because upkeep bypasses the modified attributes. | `apps/game/src/base-entity.ts:83`, `:91` | Route upkeep through the intended regeneration attributes. | S / medium |
| B22 | P2 | **Faster initiative can halve a two-turn DOT**: Cinderbrand produces one 5-damage tick instead of two. | `apps/game/src/base-entity.ts:134`, `apps/game/src/effect/dot.effect.ts:26` | Consume DOT duration alongside its tick, preserving the final tick. | S–M / medium |
| B23 | P2 | **The first actor misses opening upkeep** while later turns receive it. | `apps/server/src/durable-objects/battle-ws.ts:104`, `apps/server/src/battle/commands.ts:96`, `apps/game/src/bm.ts:117` | Run exactly one initial upkeep before the first decision/AI action. | S / medium |
| B24 | P2 | **Earthshatter never grants its advertised +20 Armor/Magic Resistance** after stunning multiple enemies. | `apps/game/src/spells/earthshatter.ts:24`, `:41` | Implement the promised conditional defense reward or settle a deliberate description/rule change. | S / medium |
| B25 | P2 | **Tidepiercer Thrust never performs its advertised defense-ignore proc**. | `apps/game/src/spells/tidepiercer-thrust.ts:19`, `:34` | Implement the promised penetration proc or settle a deliberate rule change. | S / medium |
| B26 | P2 | **Random target selection is biased by list position**. Rounding favors interior slots for direct choices; the deletion-based unique sampler creates a different positional bias. | `apps/game/src/utils/random-in-array.ts:11`, `:24` | Use uniform indexing and sampling without replacement. | S / low |

## Qualified findings and open rule decisions

- **Dormant critical-damage defect:** `BaseEntity.getBaseValueAttribute` omits `critDamage`; configured 1 returns 0 and a forced critical hit does not gain its base multiplier. Current authored entities have no positive crit-chance source, so this is not a naturally observed live critical-hit failure. Evidence: `apps/game/src/base-entity.ts:67`, `:221`, `:236`; `apps/game/src/calculator.ts:48`. S / low risk.
- **Final Verdict executes at 0.1%, not 10%:** the code compares `(health / maxHealth) * 100` against `0.1`. The arithmetic is verified; the intended execute threshold is not established by an explicit current spec. Evidence: `apps/game/src/spells/final-verdict.ts:5`, `:22`.
- **Dungeon-start authorization:** an authenticated unrelated account can invoke `fightDungeon` for another dungeon. This is reproduced through the real router, but whether starts must be creator/participant-only needs a product rule; public observation/cooperative parties exist. Evidence: `apps/server/src/routers/dungeon-router.ts:132`.

## Suggested order

First repair cast commit/recovery and the turn/death invariants, with the existing reproductions retained. Then remove current-content crashes and make completion/progression idempotent. Correct event chronology alongside the client reducer so reconnect cannot preserve incorrect resources. Finish with the remaining spell/stat/targeting rules. Re-run all authored waves after those fixes; failures earlier in a fight can mask later defects.

## Considered and not reported as bugs

- The server command boundary already rejects stale revisions, wrong owners, duplicate/unknown targets and incomplete target sets before ordinary resolution. These existing protections were not reported as missing.
- Battle descriptions already isolate live RNG via `describeBattleSpell`; Storm Pulse's outside-battle description failure is a separate path.
- Frozen starting builds already protect hibernation from subsequent roster changes; the missing initial HP/mana handoff and uncommitted-command replay issues are separate.
- The 3D prototype deliberately excludes random-target player spells and is development-only; that is an accepted scope decision.
- Unregistered legacy resurrection/mind-control/summoning classes were not promoted into current-content bugs.
