# Three.js prototype implementation handoff

> Completed prototype brief, retained for design history. The playable 3D presentation, model pipeline, and later dungeon/equipment/route milestones are implemented. Current work follows [Plan 008](../plans/008-production-handoff.md), with [release evidence](../plans/008-production-evidence.md) recording remaining qualification. Do not interpret the original milestone exclusions below as the current game's feature list.

Implement the first playable 3D battle prototype for **Shards of Affinity** on the existing **`prototype`** branch. The player chooses spells and legal targets, the existing combat rules resolve those choices, enemies respond, and the battle reaches victory or defeat. Deliver a readable battlefield, event presentation, and one proven animated-model pipeline. Use the research already in this repository to make implementation decisions and continue through local verification.

The first milestone is a **playable battle over the existing WebSocket and server-side game logic**. Use the current game flow to enter a battle, choose an available spell and legal targets, and press **Cast**. The server resolves the command and drives enemies and turn progression. Recorded timelines remain useful for repeatable verification and replay. Redesigning the dungeon/reward loop remains outside this milestone.

**Design confirmed, 9 September 2026:** the user approved the consolidated brief and requested publication as an implementation spec. Prioritize technical feasibility, then visual direction/readability, then deeper gameplay-feel evaluation. Active fighting through the existing WebSocket flow and an explicit Cast button are required. Target **desktop only**, using **stylized dark-fantasy miniatures with distinct silhouettes and restrained effects**. The [decision log](threejs-prototype-decisions.md) records the answers.

**Published spec:** [GitHub issue #1 — Build a playable Three.js battle view with explicit Cast controls](https://github.com/ChristianSchneeweiss/game/issues/1), labeled `ready-for-agent`. A [local copy](threejs-battle-prototype-spec.md) contains the published issue body.

**Integration boundary:** reuse the existing battle route, WebSocket connection, legal-target requests, `castSpell` command, and server game logic. Keep authentication and character ownership intact: the user may act only for their own character on its turn. An account owning both party characters can control both under the existing rules. Keep combat authority on the server; do not introduce a browser-local battle driver or alternate rules implementation.

## Read before implementation

Read the three main references in this order. They contain the prior findings, examples, and source links; use them instead of repeating the broad research.

| Document | What to take from it |
| --- | --- |
| [Game overview](game-overview.md) | Read in full. Understand the player loop and current mechanics; pay particular attention to sections 9–11 on implementation gaps, prototype boundaries, and source locations. |
| [Three.js research](threejs-research.md) | Read the recommendation and sections 2–9. Use its version evidence, event adapter design, starter TSX, asset ownership rules, and phased acceptance criteria. Consult the learning links and primary sources when implementing unfamiliar APIs. |
| [Content catalog](game-content-catalog.md) | Read the inventory summary, then consult the specific dungeon, enemy, spell, and effect entries used by your fixtures. Preserve actual game terminology and distinguish configured content from working acquisition/execution paths. |

The other Markdown references currently available are:

| Document | When to use it |
| --- | --- |
| [Root README](../README.md) | Repository orientation and development entry points. Verify commands against current package scripts. |
| [CLAUDE.md](../CLAUDE.md) and any applicable `AGENTS.md` | Follow repository instructions. Use the detailed game overview and current source to qualify older high-level descriptions of behavior. |
| [Domain documentation guide](agents/domain.md) | Before domain exploration; follow its pointers to the glossary and relevant ADRs when those files exist. |
| [Issue tracker conventions](agents/issue-tracker.md) | When working with the published implementation issue. |
| [Triage labels](agents/triage-labels.md) | If a later assignment includes ticket triage. |
| [Shared game README](../apps/game/README.md) | Package-level orientation; current package scripts and source take precedence over its generic starter commands. |

## Workspace and existing work

The branch `prototype` was created from the current `main` checkout. The game references and research are local working-tree files; they may still be untracked. Existing changes also include `README.md`, `CLAUDE.md`, and local tooling directories. Inspect status before editing and preserve this work.

Use the checkout containing this handoff. If starting in a separate worktree or checkout, ensure the uncommitted research documents and intended working-tree changes have been carried over before implementation. A checkout of the branch commit alone may omit them.

Use CodeGraph for structural source questions, as required by the repository instructions. The index has already been initialized in the original checkout. Follow its staleness notices when reading recently changed files. The source map in the game overview provides the main integration locations.

## Product and technical direction

Build a compact battle diorama of stylized dark-fantasy miniatures with an elevated fixed camera. Start with an orthographic view and stable formation slots: up to two party characters facing up to four enemies. Make silhouettes, active turn, legal targets, selected target, health/mana, and action consequences easy to read. Keep abilities, exact numbers, status descriptions, and playback controls in ordinary React/HTML UI. Design for desktop mouse and keyboard use, with framing and controls that adapt to desktop window resizing; mobile layouts and touch qualification are outside this milestone.

Place the party on the left and enemies on the right. Keep names, HP, and status markers beside every actor, turn order above the scene, and abilities below it. Use a side inspector for mana, cooldowns, and full effect descriptions. Inspection and legal-target selection are distinct: opening an actor's details must not turn an illegal or dead actor into a chosen target.

Use approximately one-second ordinary actions and slightly longer major spells, with modest lunges and projectiles. These are initial presentation timings to judge in the browser, independent of combat rules. Keep the camera fixed, include playback speed controls and reduced motion, and defer audio.

Use **Three.js through stable React Three Fiber**, with selected Drei helpers when they earn their dependency cost. Keep the current React/Vite/Bun setup. The researched core candidate is Three `0.186.0`, R3F `9.7.0`, and `@types/three` `0.185.4`; optional Drei is `10.7.8`. The research report records the type-version gap and Drei dependency declaration errors. Its core TSX example passed an isolated Vite 7.3.1 build and TypeScript 5.9.3 strict check, but browser rendering and application integration are still unverified. Validate the chosen versions in this project and pin the lockfile.

Start with WebGL and standard materials. Use explicit PCF shadows if enabled, as in the report's `shadows="percentage"` example. The report explains r186's deprecated shadow-mode compatibility behavior. Keep WebGPU and custom shader work for a requirement that needs them.

Preserve the game's existing turn-based rules and entity-based targeting. Use the shared combat engine for actual spell resolution, resources, effects, cooldowns, turn order, enemy behavior, and victory/defeat. Do not replace that resolution with per-target canned outcomes. Formation coordinates, lunges, projectiles, and effect areas are presentation choices. Movement, range, collision, cover, elemental weaknesses, and action combat are outside this milestone. Keep Three.js types and resources in the client; retain `apps/game` as the reusable rules package.

## Implementation sequence

### 1. Establish a running preview and a playable encounter

Start at `apps/client/src/routes/battle/$id.tsx`, `-battle-render.tsx`, and `-hooks/use-battle.ts`. Add a discoverable development-only 3D presentation option within the existing battle route, keeping the current battle view available. Reuse the same battle connection and authenticated session; switching presentation must not start another battle or submit a command. Document the exact existing development commands, how to enter/select the 3D view, and its URL. Do not create an unauthenticated standalone game as a substitute for integration.

Use an existing small encounter and valid player loadouts for the first battle, then qualify a two-character/four-enemy encounter. Obtain participants, turn state, legal targets, and resolved events through the existing server flow. Capture the original entity/build snapshot, spell-owner map, effect metadata, commands, and resolved timeline for repeatable verification; a seed alone is insufficient for the existing reconstruction behavior. Save fixtures without account secrets or tokens. If a repeatable setup needs tooling, use the existing local/development environment and isolate the smallest setup change. Clearly distinguish a playable battle from a saved replay.

Use the existing server command handler and turn driver. Validate turn ownership, spell availability, target membership, and target count at the command boundary; the browser's selection state cannot grant authority. Rejected or duplicate submissions must not consume resources or advance a turn. The existing server wrapper advances even after a rejected cast; qualify and isolate the smallest necessary correction to make this interaction reliable. Keep fixes to the selected command path distinct from broad gameplay repairs.

**Complete when:** the 3D view opens on an actual development battle, the user can choose an available spell and legal targets and press Cast, the server applies the actual result to those targets, enemies act, and the encounter can reach victory or defeat. The installed package combination builds and type-checks under the project's selected toolchain.

### 2. Build a readable battlefield and targeting interaction

Add the camera, room/floor, restrained lighting, actor placement, and responsive layout. Show names, HP/mana, active turn, and legal/selected targets. Offer both mesh selection and keyboard-operable DOM target controls. Resolve every pick to the combat entity ID, using generous hit areas and deliberate event propagation.

Request legal targets through the existing `getTargets` flow and select only from the response for the current spell and turn. Single-target spells let the player choose any one legal entity. Self-targeted spells automatically select the caster; whole-team spells automatically select and highlight the complete legal set. All actions wait for an explicit **Cast** button; selection alone never submits. Random-target abilities are outside the first interaction qualification, without changing their existing game rules or inventing player-selected targets for them.

The current `useBattle` hook automatically calls `castSpell` once enough targets are chosen. Disable that automatic submission for the prototype and wire Cast to the existing command, preserving the ordinary battle view when adapting shared code. Show the selected spell and target names before submission. Enable Cast only when connected, caught up to current server state, on the user's own character's turn, with a valid spell and complete legal selection, and with no cast pending. Let the player change or cancel the selection before submitting.

Show the user's choice consistently in the scene and DOM controls. A submitted spell must resolve against that chosen entity or legal target set, and the resulting animation, numbers, and effects must agree with the server's result. Clear stale selection when the spell, active actor, legal targets, encounter, or connection changes. Ignore or serialize outdated target responses so a response for an earlier spell cannot enable a wrong cast. On rejection, preserve server state and refresh the applicable turn/targets before allowing another submission. Saved replay seeking also clears transient selection and cannot submit battle commands.

**Complete when:** mouse and keyboard controls can select the intended actor; all six actors remain readable at the tested desktop viewport sizes; desktop window resizing preserves framing and controls.

### 3. Add the presentation adapter and playback

Build a small pure adapter around the existing timeline schema. Separate reconstructed display frames from animation timing. Cover attack/cast, healing, effect trigger/removal, resource/cooldown updates, and death with fixtures. Use the initial spell-owner map and effect metadata to resolve identities; use generic visual fallbacks when the event payload lacks choreography details.

Provide animation speed controls and a way to skip pending presentation to the latest resolved server state. Skipping visuals must never choose a spell, play a player turn, or decide a winner. Keep play/pause, restart, and event seeking in a clearly identified recorded replay or verification view. A new playable battle uses the existing game's encounter flow; no replay control may rewind or recreate an active server battle. Update numbers and reactions at a consistent visual impact point. Repeated or replaced event history must be safe: an identical history adds no new attack, an appended suffix plays once, and divergent history resets the presentation coherently.

On disconnect, disable Cast and clear pending selection. Reconnect by restoring the latest authoritative snapshot and history, clearing transient visual effects, and requesting fresh target information when needed; do not replay a long stale backlog or automatically resend an uncertain cast. Keep spectators read-only. On battle completion, preserve the existing result flow and allow only bounded final animation before exposing the result; do not retain the current fixed five-second redirect as an animation contract.

Use `useFrame` for owned object transforms, mixers, and effects. Combat turns, damage, cooldowns, and randomness must remain independent of frame rate and animation completion. Only the existing server game logic invokes combat resolution; rendering, hovering, pausing, replaying, and skipping never rerun spell calculations. Keep resolved combat state separate from the displayed event cursor. Block stale or duplicate player input while pending events are being presented, with a bounded skip path that exposes the next actual decision.

**Complete when:** each covered event is legible; the same starting snapshot and accepted command sequence produce the same expected state regardless of animation speed or visual skipping; replay seeking reaches the expected display state; duplicated updates do not repeat attacks; and an interrupted/missing visual cannot block the next decision indefinitely.

### 4. Prove one animated asset pipeline

Replace placeholders incrementally with at least one reusable animated character asset. Use a free, clearly licensed miniature asset and record its provenance. The user accepts obvious model stand-ins: one model may serve multiple prototype actors while the pipeline is being proven. Distinguish game entities with labels and markers and explicitly identify visual substitutions. Matching the full enemy roster and custom art production are later work. Keep fallback geometry available if loading fails.

Use versioned GLB assets and a small visual manifest for clip names, scale, facing, label height, and impact cues. Require at least one real looping clip and one replayable one-shot clip, such as idle and attack, exercised across four instances. Prefer in-place clips. Procedural hit/death fallbacks count for this first milestone when documented; they do not replace the two required imported animation clips. Create independent skeleton clones and mixer state per actor while sharing immutable geometry, textures, and clips. Separate actor-instance cleanup from shared-cache eviction. Follow the research report's disposal guidance, including unique materials and final-owner image resources where applicable.

**Complete when:** four copies animate independently, selecting or damaging one leaves its siblings unchanged, repeated attacks reset correctly, death remains readable, and encounter teardown/re-entry does not produce unbounded resource growth. If acquiring suitable art is externally blocked, finish and verify the graybox, report the exact asset gap, and leave this milestone explicitly incomplete.

### 5. Verify and deliver the prototype

Run focused tests for explicit Cast behavior, chosen-target resolution, cast rejection without turn/resource consumption, duplicate submission, automated enemy progression, and battle completion. Check outdated target responses, disconnect/reconnect without command resend, and ownership/spectator restrictions. Use fixed starting snapshots and accepted command sequences to check expected state, including representative attack, heal, self/team action, effect trigger/removal, resource/cooldown, and death cases. Test replay reconstruction, repeated/appended/replaced histories, and playback-independent outcomes. Run the relevant build/type checks. Verify an actual player-controlled WebSocket battle in the browser; a successful build or scripted replay alone does not establish the milestone.

Check desktop layouts and window resizing, selection and Cast, event presentation, missing-asset fallback, reduced-motion behavior, replay restart, and repeated entry/exit or view switching. Measure a six-actor encounter, including its busiest effect. Report the tested device/browser, frame-time behavior, load cost, and resource-count trend. Treat the research report's performance numbers as proposed targets until measured. Mobile qualification is outside this milestone; label any untested desktop/browser class clearly.

**Complete when:** the first milestone runs locally, the acceptance checks above have evidence, and the next person can reproduce the preview from the repository instructions.

## Scope boundaries and existing gameplay gaps

Keep the ordinary game flows usable, including authentication, character ownership, encounter entry, and battle results. Reuse the existing battle transport and server rules; no new multiplayer behavior, local combat driver, dungeon/reward redesign, or broad gameplay repair is part of this milestone. If a shared change is required to expose a clean command/presentation boundary or unblock the selected encounter, keep it small and explain it separately.

The game overview documents disconnected between-wave HP/mana carryover, retry accounting, incomplete gold, broken content paths, and reconstruction/RNG concerns. Select known working content or explicitly exclude affected cases from the playable encounter and verification fixtures. If a defect prevents the chosen slice, isolate the smallest necessary baseline fix and record it. Do not invent visual results to conceal a gameplay error. Effect-origin lethal damage and invalid-cast turn advancement need particular care now that the prototype resolves real combat.

This assignment authorizes prototype implementation and verification using the existing local/development game environment. Deployment, production data changes, and publishing messages/issues are outside this handoff. Inspect available setup before requesting credentials or other user input. If authenticated development access is externally blocked, continue independent rendering and fixture verification, report the exact gap, and leave live-battle acceptance explicitly incomplete.

## Final delivery

Provide the running preview URL and exact start command, a short description of the playable interaction, and screenshots of the battlefield at the tested desktop viewport sizes. Identify source changes, test/build results, measured runtime behavior, and remaining gaps. State clearly where combat runs, which characters the user controls, and which encounters/abilities were verified. Distinguish playing the battle from replaying its recorded events.

Add concise setup and usage instructions beside the prototype or in the README. Finish with a concrete next-milestone recommendation based on observed weaknesses: visual comparisons, a specific combat-interaction improvement, or expansion of the verified model/content pipeline. Live transport integration is part of this milestone.
