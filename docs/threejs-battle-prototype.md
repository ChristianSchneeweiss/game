# Development 3D battle prototype

Implemented for issue [#1](https://github.com/ChristianSchneeweiss/game/issues/1) on the existing `prototype` checkout. The original documentation/tooling changes remain untouched. This is local development work; it has not been deployed or published.

## Open the prototype

The running client is at http://127.0.0.1:3001. Sign in, use **Dungeons** to enter an encounter with existing characters, start the battle, and choose **3D prototype** above the Cards view. Both views share one battle WebSocket and the same server state. The existing chat connection remains separate.

Completed live acceptance results in this local database:

- Small encounter: http://127.0.0.1:3001/battle/finished/e9d4gsje6rx2
- Six-entity encounter: http://127.0.0.1:3001/battle/finished/yy0jlk9l83h8

Each result page offers **3D replay prototype**. A portable, read-only recording harness is at http://127.0.0.1:3001/dev/battle-replay.html. It contains results produced by real server command handlers; it has no live connection or Cast controls and cannot establish live fighting by itself.

The 3D controls and dynamic imports are development-only. The production build excludes the 3D JavaScript chunk. Public model files are still copied as static assets by Vite, but ordinary navigation does not request them.

## Launch again

Prerequisites: Bun, Node 22+, Doppler CLI access to `game-server/dev` and `game-web/dev`, the existing local PostgreSQL database, and Clerk development sign-in. No authentication bypass or credentials are included in this change.

From the repository root:

```sh
bun install
```

Server terminal, from `apps/server`:

```sh
doppler run --project game-server --config dev --mount .env -- node ../../node_modules/wrangler/bin/wrangler.js dev --port 3000
```

Client terminal, from `apps/client`:

```sh
doppler run --project game-web --config dev -- bun --bun ../../node_modules/vite/bin/vite.js --host 127.0.0.1 --port 3001
```

The acceptance run verified the configured database host as `0.0.0.0:5432/game` and the runtime as development. Check your selected environment before creating further encounters. Starting a dungeon and finishing fights persist local game progress and rewards. The six-entity run used the user's explicit approval for Deshaun27 and Araceli_Schroeder7.

## Fight and inspect

1. Select an available spell. The server supplies current legal targets.
2. Select a target, or review the automatically selected self/whole-team set. Repeated enemy names receive stable formation numbers.
3. Inspect any entity separately; inspection does not change the selected target. Prepared spell and target names remain visible.
4. Press **Cast** once to submit. Selecting, changing, inspecting or canceling alone does not cast.

Tab and Enter operate the HTML spell, target, inspection and Cast buttons. Mesh picking uses the same selection state. Unavailable spells, other owners' turns, disconnected sessions, pending casts and unresolved visual backlogs disable command input. Speed, reduced motion and Skip visuals affect presentation only. Reconnection clears prepared input and catches up to current server history without resending uncertain commands. Victory/defeat makes the existing result link available after bounded final feedback.

Replay has separate play/pause, restart and event seeking. Seeking never sends combat commands. The final cursor is inclusive of every event. The inspector contains mana, cooldowns and full recorded/server effect descriptions. Party/enemy, acting, legal, selected and fallen states have text and shape markers in addition to color.

## Implementation and bounded baseline corrections

The pinned rendering dependencies are Three.js **0.186.0**, React Three Fiber **9.7.0** and Three types **0.185.4**. The one-revision runtime/type mismatch remains explicit: both TypeScript projects, the production build and the exercised browser paths pass with this combination. Drei was not added; the scene uses Three's own GLTFLoader and SkeletonUtils, so the researched Drei declaration issues do not apply to this dependency set.

- `apps/server/src/battle/protocol.ts` contains the existing command contract, with compatible optional request IDs and event-history revisions. Responses add correlation, spell availability, explicit acceptance and rejection.
- `commands.ts` validates ownership, turn, availability, unique legal target membership and counts before casting. Only accepted commands advance the existing engine or enter the Durable Object command log. Enemy turns still use the real enemy rule implementations.
- `starting-builds.ts` freezes builds before BM applies equipment/passives. Hibernation restoration uses those builds and accepted commands instead of mutable roster rows. Legacy objects acquire a snapshot on their next reconstruction; this cannot retroactively freeze historical roster data.
- `use-battle.ts` owns the shared live session and explicit pending/selection contract. Target replies must match spell, caster, request and revision. The Cards view uses the same explicit Cast contract.
- `-presentation/timeline.ts` reconstructs display frames from ordered authoritative events and Maps. `use-playback.ts` owns presentation timing, history replacement, catch-up, speed, reduced motion and replay cursors. Neither runs combat calculations.
- `battle-view-3d.tsx` provides accessible HTML controls; `battle-scene.tsx` provides the fixed orthographic diorama. Labels project from the same formation positions. Graphics and lazy-module failures retain a Cards fallback.
- `miniature.tsx` owns the shared asset cache and independent skinned instances. See [asset provenance](../apps/client/public/models/kaykit-skeletons-1.0/PROVENANCE.md).

The exercised baseline defects needed small corrections: invalid casts previously advanced turns; lethal effect damage assumed a spell-shaped source; buffered effect/death events could remain unflushed; BM initialized RNG after entity joins; tooltip reads could consume combat RNG; serialization could detach live managers; result participants incorrectly used final HP as replay starting HP. Result writes are idempotent, and the completed result is saved before offering the replay handoff.

Type-only baseline repairs align passive hook parameters with the existing hook interfaces, use the stateful RNG type, point tsconfig at the existing generated Worker declarations, and give the Sentry environment callback its existing `Env` type. No combat balance or spell formulas were changed by those repairs.

## Repeatable verification

From the repository root:

```sh
bun run test:battle
bun run typecheck
```

Production build without pulling production secrets, from `apps/client`:

```sh
bun --bun ../../node_modules/vite/bin/vite.js build --emptyOutDir --outDir /tmp/loot-game-build
```

`bun run record:battle` regenerates the supporting six-entity fixture through the real command handler. It intentionally overwrites that fixture; effect IDs may change because existing content uses `nanoid`. The saved recording includes initial snapshots, spell identities/descriptions, commands, effect metadata, resolved events and final resources. A seed alone is not the reproduction contract.

The two `live-*.json` recordings came from the authenticated local browser fights, their accepted Durable Object command logs and saved PostgreSQL results. Account user IDs are replaced with `fixture-owner`; tokens and secrets are excluded. Regression tests replay their frozen builds through the real engine and independently reconstruct display resources from the saved events.

Automated coverage includes explicit Cast and duplicate-click gating; ownership/spectators; stale target replies; disconnect/reconnect without resend; unchanged/append/replaced histories; invalid casts without turn/resource/RNG consumption; self/team counts; enemy victory and defeat; lethal effects; capped healing/regeneration; exact recorded HP/mana/cooldowns/effects/death; normal/4×/reduced/skip/seek equivalence; frozen-build recovery; serialization and tooltip purity; GLB validation; four independent imported skeletons and repeated one-shot resets.

## Browser evidence

See [the evidence report](threejs-evidence/README.md) for screenshots, measurements, live actions, qualifications and remaining limits. Rendering measurements are local desktop feasibility evidence, not a guarantee of a sustained 60 fps on every browser/device or a production download benchmark.
