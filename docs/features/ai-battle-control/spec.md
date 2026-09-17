# AI battle control

Status: Accepted design, ready for implementation. Created 2026-09-17 from the
[design interview](../ai-battle-control.md) and the user's confirmation of shared
understanding. This document specifies the feature; it does not claim that the
feature has been implemented or tested.

## Problem and intended behavior

Enemies currently use deterministic action selection, and characters require
manual battle input. Add optional model-driven control for both through the
existing battle system. The model chooses actual movement, spells and spatial
targets, or equipped consumables, for an individual activation. Its behavior can
be directed by a prompt supplied by the character's owner or enemy author.

Start with `z-ai/glm-5.3-flash` through OpenRouter structured output. Keep the
selector in one simple file so switching providers, including to Vercel AI
Gateway, does not require changing battle logic.

## Player and author controls

### Character defaults and battle overrides

- Add saved character defaults for AI enabled, an optional behavior prompt, and
  allow-consumables. Existing and newly created characters default to manual
  control; allow-consumables defaults to true.
- Expose these defaults on the normal character page. Copy them into each new
  battle alongside that battle's character state.
- Expose an AI toggle, prompt editor, and allow-consumables setting in the normal
  battle controls. Battle edits affect only that character in that battle.
- Only the character's owner may read/edit its private behavior prompt or change
  its control settings. Hosting a shared run does not grant that authority.
- Saved-default changes affect future battles. They do not overwrite settings in
  existing battles or other concurrent runs using the same character.
- Enabling AI for an actionable character activation requests a plan from the
  current state, including movement already spent. Otherwise it takes effect
  when that character next has an actionable activation.
- Disabling AI invalidates any uncommitted request and returns control to the
  owner. Prompt edits invalidate a pending request and request a fresh plan when
  the character is still eligible to act under AI control. Changing consumable
  permission must likewise prevent an answer based on stale permission from
  committing.
- Turning off AI does not undo a committed action or alter saved defaults.

### Enemy configuration

- Each enemy class can opt into model control with a simple boolean flag and an
  optional behavior prompt. An omitted/false flag keeps deterministic behavior.
- Enabling an enemy must not require adding it to another registry, writing a
  separate controller, or changing the battle driver for that enemy type.
- Capture the effective enemy control configuration for a battle so recovery
  does not reinterpret that battle using subsequently edited class defaults.
- Keep model control distinct from the existing `isBot` concept: an ordinary
  deterministic enemy is still automated, and a player-owned character can use
  model control without becoming an enemy.
- Deliver the configuration mechanism through the current enemy classes. A
  separate sandbox, demonstration dungeon, or new enemy content is not required.

### Autonomy and shared runs

AI acts only inside a started battle, using the same action opportunities and
resource rules as manual control. It may finish that battle while its owner is
disconnected. It does not select paths, ready players, start encounters, change
builds, or operate the inventory outside battle. Existing ownership, shared-run
consent, encounter-start, abandonment, result, and reward rules continue to apply.

Manual characters still wait for their owners. Owner-enabled AI is explicit
permission to act in battle; disconnecting alone never enables AI or transfers
character control to another player.

## Decision input and behavioral instructions

Each request is self-contained and contains only the current relevant battle
snapshot. Do not attach event history, previous model responses, a growing chat,
or generated summaries of prior activations.

The snapshot must provide enough information to understand the current legal
actions and their effects:

- The acting entity, teams, current activation/turn order, remaining movement,
  battlefield bounds, positions, and relevant terrain/obstacles.
- Current visible health, mana, combat attributes, resistances, active effects
  and durations, and other state that changes action outcomes or permissions.
- Complete information about the acting side's current combat kits, available
  spells, cooldowns, mana costs, targeting rules, passive effects, and equipped
  consumables with remaining quantities.
- Opponent information available through normal public battle inspection.
  Hidden opposing build details, opponents' private prompts, and unsubmitted
  player selections must not be included.
- Compact descriptions of applicable action rules and available targeting
  information. Reuse authoritative game definitions and queries.

Minimize duplication: include a shared spell/effect definition once and refer to
it from entities. Describe equipment through its relevant combat effects rather
than sending inventory/catalogue objects. Do not enumerate every complete
movement/spell/target combination. Avoid sending rendering data, unrelated
progression, or application objects. Any description/estimate generation must
leave battle state and combat RNG unchanged.

Separate the fixed mechanical protocol from behavioral instructions. The
protocol describes the response schema and game rules. Without a custom prompt,
use a short shared default objective of helping the acting side win. A nonempty
custom prompt replaces that default behavioral guidance entirely, including
preferences for winning, caution, or particular roles. It may intentionally
produce reckless, passive, or suboptimal play. Do not silently restore the
default objective alongside a custom prompt.

Prompts cannot expand legal actions, reveal hidden information, or bypass the
allow-consumables setting. Clearing the prompt restores the default behavior.

## Activation plan and validation

One request returns one complete activation plan: optional movement followed by
exactly one of the following actions.

| Action | Required meaning |
| --- | --- |
| Cast | An owned spell identifier and its spatial selection using the existing targeting model. |
| Use consumable | An equipped consumable slot that is allowed and usable in the projected state. |
| End turn | Finish the activation, with or without the optional movement. |

Reuse existing tile and `CastSelection` semantics, including tile, direction,
caster, and global aims. The engine resolves actual recipients; the model
cannot invent recipients, damage, resources, spells, or extra actions. Do not
request free-form explanations or a sequence of future activations.

Validate the entire plan against the current activation and the state projected
after its proposed movement before committing anything. Check movement,
occupancy, allowance, spell ownership, targeting, cooldowns, resource costs,
status restrictions, and consumable permission/availability through the same
rules used for manual actions.

If a follow-up action is illegal, reject the movement too. Rejected plans must
leave positions, resources, events, and combat RNG unchanged. Do not keep a valid
prefix, silently substitute a different target, or spend another model request
repairing the plan. Use the failure behavior below from the original state.

A valid plan commits as one activation. Its normal combat effects, animations,
turn advancement, and any additional activation remain governed by the engine.
An extra actionable activation gets a fresh decision. Actors that cannot act
must progress under existing combat rules without waiting for a futile request.
A valid pass must advance the turn rather than trigger another decision loop.

See [ADR 0002](../../adr/0002-atomic-ai-activation-plans.md) for the decision to
validate the complete plan before committing any part of it.

## Deadline, cancellation, and failures

Use a five-second total deadline for receiving a complete usable model response,
not merely its first token. Abort requests on expiry, takeover, relevant control
changes, or battle termination. There is no application-level retry/repair loop
for a failed activation. An explicit prompt edit or re-enabling AI can create a
fresh request under the control rules above.

Every pending decision belongs to a specific actor, activation, battle revision,
and version of the effective control settings. Recheck those identities before
committing. Late/stale responses are ignored and must not cause fallback, alter
settings, spend resources, or interfere with a newer request. Only one current
decision may commit for an activation.

| Outcome | Player character | Enemy |
| --- | --- | --- |
| Timeout, provider error, exhausted key budget, malformed response, or illegal plan | Switch this battle's character to manual and explain why. Keep it manual until its owner explicitly re-enables AI. | Execute the deterministic planner from the unchanged state for this activation. |
| Owner disconnected after a player failure | Wait at the character's activation for manual input or explicit re-enablement when the owner returns. | Not applicable. |
| Request cancelled by takeover/settings change or made stale | Honor the current control state; ignore the old result. | Honor the current battle state; ignore the old result. |
| Battle completed or run abandoned | Stop pending work and reject later results. | Stop pending work and reject later results. |

Player failure never silently hands the character to the deterministic planner.
The character's saved defaults remain unchanged. An enemy fallback does not turn
off its class configuration for future activations.

## Existing battle interface

Show a choosing-action indicator while an AI decision is pending. Keep the
owner's takeover control usable during that wait. Execute committed decisions
through the normal battle presentation and history, with no generated rationale
or preview of an enemy's uncommitted plan.

For a player's AI failure, show an understandable reason and that manual control
has resumed. Preserve that control state across reconnection. Display useful
game-facing messages without exposing provider credentials or raw responses.
Use existing keyboard, narrow-screen, session, and account-switch conventions
for the new controls.

## Single-file selector

Use one `ai-selector.ts` file in the server battle area for the selector. It owns
the effective provider/model configuration, prompt/schema construction,
provider request, and response parsing/schema validation. Its small asynchronous
interface is conceptually:

```ts
selectAiAction(snapshot, prompt, signal): Promise<ActionPlan>
```

Use the server's existing environment/configuration boundary for credentials;
they are not part of the battle snapshot or client controls. Start with
OpenRouter and a configurable model default of `z-ai/glm-5.3-flash`.

The input and returned plan are provider-neutral. Replacing the provider call
with Vercel AI Gateway or another provider belongs inside this file. Do not
introduce provider adapters, a registry, a provider class hierarchy, a plugin
system, a player-facing model selector, or a general-purpose AI framework.

Battle-state extraction, engine legality checks, action commitment, player/enemy
failure policy, ownership, and durable recovery stay in the battle system. The
selector returns a plan; it does not mutate the battle or choose who takes over.
Using shared game types does not require moving provider details into the game
package.

Request structured output from a compatible OpenRouter endpoint and validate it
locally. Keep provider-specific response shapes and reasoning options inside
the selector. Model/provider support must be verified during implementation;
the exact reasoning controls have not yet been established for the chosen GLM
endpoint. Hiding reasoning text does not imply that reasoning is disabled or
unbilled. Keep output limited to the plan and measure all billed tokens.

The user manages spending limits on the API key. Do not build per-battle or
game-wide spending caps. Provider budget errors use the normal failure policy.

## Persistence and recovery

The current battle driver advances enemies synchronously, and recovery replays
player commands while recomputing automatic enemy decisions. Extend that path
to support asynchronous model decisions without putting network calls inside
deterministic combat resolution.

Persist the actual committed selections and effective control changes needed to
reconstruct a battle. Recovery must apply recorded AI actions, including their
movement and selections, rather than call the model to reproduce them. It must
also preserve player failure/manual state, prompt changes, and whether an
activation already committed. Preserve the outcome of a deterministic fallback
under the same recovery guarantees.

A crash/reconnect may resume an unresolved live activation under its restored
control settings; it must never execute both an old response and a replacement
decision. Commitment and durable recording must agree: a committed activation
survives recovery once, while a rejected/uncommitted plan has no battle effects.
Do not present actions as durably committed before they can be recovered.

Owner disconnection must not be the mechanism that stops an enabled AI battle.
Keep server progress alive through the existing battle lifecycle, including
consecutive enemy/AI-character activations. Do not hold a serialization boundary
across the model wait if that prevents takeover, prompt changes, or abandonment
from being processed.

Preserve older stored battles and recordings that lack model-control metadata.
They retain their original manual/deterministic behavior and do not make model
requests during replay. Reconnecting, watching a recorded battle, or retrying
result delivery must not duplicate actions, resource spending, or rewards.

## Implementation anchors

These are the existing seams to extend, not a request for a new battle engine:

- `apps/game/src/tactical/ai.ts`: deterministic enemy planner and relevant
  tactical queries.
- `apps/game/src/base-entity.ts` and enemy classes: entity ownership and authored
  enemy defaults; do not overload `isBot` to express model control.
- `apps/game/src/tactical/types.ts`: tile and spatial-selection semantics.
- `apps/server/src/battle/commands.ts`: current action validation and synchronous
  bot progression.
- `apps/server/src/battle/reconstruct-battle.ts`: historical command recovery.
- Existing character persistence, frozen battle builds, battle transport, and
  character/battle controls: settings, authorization, recovery, and UI.

Storage names, endpoint names, and component layout are routine implementation
choices. Prefer the existing project's patterns and the smallest changes that
satisfy the observable behavior above.

## Acceptance and verification

Use real battle rules and the existing authenticated API/session/recovery test
boundaries. Substitute controlled provider responses at the external request
boundary for deterministic failure and concurrency tests. Do not require paid
inference for the normal automated test suite.

1. A character's saved AI settings survive reload, seed each new battle, and can
   be overridden independently in two concurrent battles using that character.
2. Only the owner can change that character's settings or read its private
   prompt. A teammate/host cannot take control through forged requests.
3. An enemy can use the selector through its class flag alone, with either a
   custom prompt or the default behavior. Unflagged enemies stay deterministic.
4. A custom prompt completely replaces default behavior guidance. Input uses
   current state only, preserves necessary mechanics, deduplicates definitions,
   and omits hidden opponent information and private pending inputs.
5. The model can commit legal move-and-cast, cast-without-movement, consumable,
   movement-and-end-turn, and pass plans using normal game rules. Enabling AI
   after manual movement uses only the remaining allowance.
6. Consumables are restricted to equipped, permitted, available supplies. They
   are spent once through existing resource handling. Disallowing consumables
   cannot be bypassed by a prompt or stale response.
7. Invalid movement or an invalid follow-up rejects the whole plan without
   changing position, mana, consumables, combat events, or RNG. Existing manual
   action behavior remains intact.
8. Timeouts, malformed output, invalid plans, provider/key failures, and missing
   server configuration follow the distinct player/enemy failure policy. A
   failed player waits when offline and remains manual after reconnect.
9. Takeover, prompt edits, and permission changes invalidate pending results.
   A stale success or failure cannot overwrite a newer decision or control
   setting. Battle completion/abandonment cancels further actions.
10. Consecutive AI activations and extra actions progress without a connected
    owner. Stunned/unable-to-act entities and legal passes do not stall or loop.
11. Recover before/during/after a model wait and action commitment. Verify each
    action/resource use occurs once, control changes survive, and historical
    decisions are never regenerated through the provider.
12. Existing stored battle fixtures, manual combat, deterministic enemies,
    multiplayer synchronization, and result/reward settlement remain valid.
13. Walk through character defaults, battle override, prompt edit during a wait,
    takeover, an enemy AI activation, a player failure, and reconnection through
    the normal interface, including narrow-screen and keyboard use.
14. With the configured key, measure real snapshot sizes, input and all output
    tokens, full-response latency, and plan validity for GLM. Record the endpoint
    and settings used. A five-second deadline is a required behavior, not a
    claim that the provider currently meets it reliably.
15. Verify that changing provider request/response handling is confined to the
    selector file and does not require changing battle callers or game rules.

Run relevant rule, API/session/recovery, UI, persistence-compatibility, and type
checks required by the implementation. Report measured provider limitations;
do not silently change the selected model, deadline, or failure behavior to
make an evaluation pass.

## Scope boundaries and references

This feature covers optional character/enemy control in the current battle
system. It does not add dungeon autopilot, AI dialogue, explanations, long-term
memory, an authored tactic-selection layer, a separate demo flow, model pickers,
application spending caps, or provider infrastructure beyond the one selector.

Creating this specification does not implement, deploy, publish an issue, or run
paid model calls. No further product interview is required to implement the
accepted behavior; endpoint verification and measurements are implementation
work.

- [Design interview](../ai-battle-control.md)
- [Atomic activation plans](../../adr/0002-atomic-ai-activation-plans.md)
- [Model research and estimated costs](../../research/2026-09-17-ai-enemy-models.md)
- [OpenRouter structured-output requirements](https://openrouter.ai/docs/guides/features/structured-outputs)

The earlier 1,500-token estimate was a compact scenario, not a measured full
battle prompt. Even the later 10,000-token planning assumption is unmeasured;
actual request usage determines the cost of this implementation.
