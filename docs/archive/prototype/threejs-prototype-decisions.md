# Three.js prototype design decisions

> Archived reference. Observations, proposed work and source paths describe the original dated snapshot. Use the [release checklist](../../release-checklist.md) for current requirements.

Working interview record, started 9 September 2026. Read alongside the
[implementation handoff](threejs-prototype-handoff.md). Rounds 1–4 are recorded
and the design questions are resolved. On 9 September 2026 the user confirmed
the consolidated brief with `yes` and requested `to-spec` publication.

Published as [GitHub issue #1](https://github.com/ChristianSchneeweiss/game/issues/1)
with `ready-for-agent`; the [local spec](threejs-battle-prototype-spec.md) matches
the published body. The spec uses the confirmed battle-screen/WebSocket contract
as the primary test boundary, with supporting pure reconstruction and browser
verification for presentation and assets.

## Current brief

Build a playable 3D battle using the existing WebSocket and server game logic,
a fixed elevated camera, up to two party characters and four enemies, entity-based targeting,
HTML controls, resolved-event presentation, and one imported animated-model
pipeline. An explicit Cast button submits the user's chosen spell and targets;
enemies respond and the battle reaches victory or defeat. Recorded fixtures
support verification and replay. They do not replace active combat. Progression
and spatial combat remain outside the milestone. The current checkout is on
`prototype`. Preserve the existing authenticated session, character ownership,
encounter flow, and server authority.

The experiment asks whether the existing battle can be played through a working
3D presentation with correct target resolution, readable event feedback, and
independent animated models. Technical feasibility leads visual comparisons and
deeper gameplay-feel evaluation; that priority does not defer basic playability.
Use one scene, retaining focused correctness checks and browser verification.
The generic prototype skill's three-variant UI or standalone logic-HTML shapes
and no-tests shortcut do not replace this explicitly requested technical slice.

## Decision tree

The first round settled three independent choices:

1. **Primary question and first review:** technical feasibility first, visual
   direction/readability second, deeper gameplay-feel evaluation third. Active
   fighting is required within the first milestone, clarified in round 3.
2. **Device priority:** desktop only. Mobile layouts, touch qualification, and
   phone performance are outside this prototype.
3. **Visual direction:** stylized dark-fantasy miniatures, distinct silhouettes,
   and restrained effects.

The resulting decisions are:

- **Experiment shape:** one playable scene with real rule resolution and saved
  event replay for verification. Comparative visual variants are later work.
- **Player interaction:** any currently legal target can be selected. Selection
  is visible in the scene and DOM, and the submitted spell resolves against it.
  Self and whole-team spells automatically select the complete legal set;
  single-target spells permit one legal choice. Random targeting is excluded
  from the first interaction qualification. Every player action waits for the
  Cast button; selecting a spell or target alone must not submit it.
- **Information hierarchy:** names, HP, and status markers beside every actor;
  turn order above; abilities below; mana, cooldowns, and full effect descriptions
  in a side inspector.
- **Presentation:** fixed elevated camera, party left, enemies right; approximately
  one-second ordinary actions, slightly longer major spells, modest lunges and
  projectiles; speed controls and reduced motion; audio deferred.
- **Content and assets:** clearly identified model stand-ins and reuse are
  accepted. Use a free, clearly licensed miniature asset; keep the handoff's
  imported looping and one-shot clips and four independent instances.
- **Acceptance:** actual player-controlled combat, chosen-target correctness,
  rejected/duplicate command handling, enemy progression, victory/defeat,
  presentation correctness, independent imported model instances, measured
  desktop rendering, and stable resource counts after warm-up.
- **Run boundary:** reuse the current battle WebSocket and server logic within
  the existing battle route. Keep the current view available and avoid a second
  connection or a browser-local combat driver. Existing ownership determines
  which party characters the user controls.

Implementation facts will be resolved from the repository and available tools.
Art appeal, readability, frame times, and asset quality require evidence from the
running prototype; the interview should define how to evaluate them.

## Relevant evidence

- The [game overview](game-overview.md) distinguishes dungeon waves from combat
  rounds, describes nonspatial targeting, and documents gameplay gaps to avoid.
- The [research](threejs-research.md) already provides a rendering candidate,
  event mapping, asset ownership guidance, and proposed acceptance criteria.
- The original handoff described fixed scripted outcomes. The user's round-3
  answer supersedes that premise: the first milestone must be actively playable.
- `BM` in `apps/game/src/bm.ts` exposes casting, turn lifecycle, current state,
  and victory/defeat methods, already used by the server. Reuse that execution
  path; the new scene consumes the resulting state and events.
- The current `useBattle` hook submits a cast when the required number of targets
  has been selected, advances presentation on a one-second timer, and depends on
  a live WebSocket. Disable automatic submission for the 3D prototype; its Cast
  button calls the existing command. Preserve the ordinary view when adapting
  the shared hook.
- `BattleWebsocket.processSpellCast` calls `postTurn` even when `safeCastSpell`
  rejects a command. Qualify and isolate the smallest necessary correction in
  this existing path; it is not a reason to create an alternate driver.
- Existing client development/build scripts use Doppler. Use the current
  development setup and authenticated session; inspect available setup before
  requesting user input for any missing access.
- The live battle route is `apps/client/src/routes/battle/$id.tsx`; the existing
  `BattleRender` checks the active character against the signed-in user's ID.
  Preserve these ownership semantics and verify the command boundary as well.

## Accepted interview decisions

### Round 1 — purpose, device, and style

User answers: `q1 c > a > b`, `q2 desktop only`, `q3 rec`.

- **Priority:** technical feasibility → visual direction/readability → gameplay
  feel. Start with one scene and measured runtime behavior. The round-3 answer
  makes active fighting a requirement of that technical milestone; the earlier
  assistant interpretation that meaningful combat was deferred was incorrect.
- **Desktop only:** keep mouse and keyboard operation and resizing across
  desktop windows. Remove mobile/narrow-phone acceptance, touch requirements,
  and mobile screenshots from the handoff.
- **Art direction:** accept stylized dark-fantasy miniatures with distinct
  silhouettes and restrained effects. Round 2 accepts model stand-ins for this
  technical milestone; final creature-specific silhouettes are a later concern.

### Round 2 — selection, information, assets, and pacing

User answers: `q4 you should be able to choose a target of the legal ones`,
`q5 rec`, `q6 yes`, `q7 rec`.

- **Selectable legal targets:** the user can choose any member of the current
  legal-target set. Reflect the chosen entity in the scene and DOM controls;
  the action must resolve against that choice, as clarified in round 3.
- **HUD and formation:** names, HP, and status markers beside every actor;
  turn order above; abilities below; mana, cooldowns, and full effect descriptions
  in a side inspector. Fixed elevated camera, party left and enemies right.
- **Model stand-ins:** accepted. Use a free, clearly licensed miniature asset,
  distinguish entities using labels and markers, and explicitly identify visual
  substitutions. One model may serve multiple game entities while proving
  independent animation; matching the complete enemy roster is deferred.
- **Motion and sound:** approximately one-second ordinary actions, slightly
  longer major spells, modest lunges/projectiles, fixed camera, and no audio
  in this milestone. Include speed controls and reduced motion.

### Round 3 — active fighting and target sets

User answers: `q8 the choice must be selected. we are actively fighting in the
game`, `q9 rec`.

- **Active fighting:** player decisions drive actual combat. Resolve the chosen
  spell against the chosen legal target through the game's rules, apply its
  resources/effects/cooldowns, and advance through enemy turns to the next player
  decision or battle end. A selector beside an independent recording or a small
  set of per-target canned outcomes does not satisfy this requirement.
- **Self/team selection:** automatically select self for self-targeted spells
  and the whole legal team for all-target spells; highlight the complete set.
  Single-target spells permit any one legal entity. Keep random-target abilities
  outside the first interaction qualification. Round 4 settles submission:
  automatic selection still waits for the explicit Cast button.
- **Presentation versus combat:** speed and skip affect already resolved visuals.
  They cannot pick player actions or rerun calculations. Keep recorded replay
  controls separate from the active battle, and block stale/duplicate input.

### Round 4 — existing transport and explicit casting

User answers: `q10 we already have the websocket and game logic`,
`q11 cast button`.

- **Existing game integration:** reuse the WebSocket and existing server game
  logic. The 3D prototype is a presentation option for actual battle sessions,
  retaining authentication and character ownership. Do not build the proposed
  local in-memory substitute or a second battle engine.
- **Explicit commitment:** select a spell, choose its legal target or accept its
  automatically selected self/team set, then press Cast. Allow changes/cancel
  before submission. Target selection cannot trigger an automatic cast.
- **Command eligibility:** enable Cast only for the active character's owner,
  while connected and caught up, with a legal complete selection and no command
  pending. Server validation remains authoritative. Protect against duplicate
  clicks and outdated target responses.
- **Existing lifecycle:** reconnect to current authoritative state without
  automatically resending a pending cast; maintain spectator restrictions and
  the existing result flow. View switching and replay controls cannot start,
  rewind, or otherwise mutate a live battle.

The handoff now includes actual battle completion and command correctness in
addition to the original rendering, animation, replay, and reproducibility
criteria. Runtime quality and art suitability must be measured in the prototype;
they cannot be settled by interview alone.

The handoff and root glossary now reflect these decisions. Remaining unknowns
are implementation evidence: development access, exact compatible dependency
set, asset availability, browser behavior, and measured runtime cost. Resolve
them during implementation and verification, reporting any actual blocker.
