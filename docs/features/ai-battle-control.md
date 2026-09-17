# AI battle control — design interview

Status: Shared understanding confirmed by the user on 2026-09-17. The
[implementation specification](ai-battle-control/spec.md) is the current feature
contract; this document retains the interview decisions. The feature has not
been implemented by this work.

## Requested direction

- AI chooses actual movement, spells, and targets for individual activations.
- The model receives the relevant full battle state. A compact tactic selector
  driving predefined behaviors is outside the requested direction.
- Player characters can optionally use AI control with player-authored
  instructions for how to act.
- Enemy classes expose a simple opt-in flag and an optional behavior prompt.
- The first experiment uses `z-ai/glm-5.3-flash` on OpenRouter with structured
  output. The game configures the model. Verify real battle decision quality,
  latency, and cost during implementation.
- Character ownership remains distinct from who or what chooses its actions.

## Established implementation context

- `apps/game/src/tactical/ai.ts` contains the current deterministic enemy planner.
- `apps/server/src/battle/commands.ts` advances bots synchronously and currently
  requires the acting entity to be a `BaseEnemy`.
- `Character` sets `isBot` to false. Reusing that flag alone would not enable AI
  control of characters or distinguish the existing planner from model control.
- `apps/server/src/battle/reconstruct-battle.ts` recovers battle state by replaying
  player commands and rerunning automatic enemy decisions. External model choices
  will need a durable recovery design before they can drive live combat.

These observations identify constraints, not settled implementation decisions.

## Decisions — round 1

The user accepted these recommendations on 2026-09-17:

1. AI performs battle actions automatically and can finish the current battle
   while its owner is disconnected. It does not choose or enter the next
   encounter. Manual takeover is supported as specified in round 2.
2. Characters have saved control and behavior-prompt defaults, copied into each
   battle. Battle-specific changes are independent of other concurrent runs.
   Enemies receive defaults from their class flag and optional prompt.
3. The model constructs a structured action plan from battle state, rules, and
   targeting information. The game validates legality. Avoid enumerating every
   complete movement/spell/target combination. The expected token benefit must
   be measured rather than assumed.
4. The model sees public battle information and complete information about its
   own side. Hidden opposing build details and unsubmitted player selections
   remain private. The exact public-state representation needs to match the
   game's inspection interface.
5. Use OpenRouter structured output and one game-configured model for the first
   experiment. No player-facing model selector is needed for that experiment.

## Decisions — round 2

6. One model request plans one complete activation: optional movement followed by
   a spell, consumable, or ending the turn. An extra activation gets a fresh
   decision.
7. AI may spend equipped consumables by default. A separate allow-consumables
   setting can prohibit this regardless of prompt guidance.
8. Disabling AI invalidates any uncommitted response and returns manual control.
   Editing the prompt invalidates a pending response and requests a fresh plan.
   Committed actions remain committed.
9. Start with a five-second total decision deadline. On failure, a player
   character returns to manual control; an enemy uses the deterministic planner.
   This distinction supersedes the earlier recommendation to use deterministic
   fallback for both sides. Round 3 specifies failure presentation and
   disconnected-owner handling.
10. A custom prompt replaces all default behavioral guidance, including the
    default objective of winning. A prompt may deliberately cause reckless,
    passive, or otherwise suboptimal behavior. The engine still enforces the
    legal action interface and settings accepted in prior rounds.
11. Integrate directly into the existing battle system. No separate combat
    sandbox or special demonstration flow is wanted. Character opt-in and enemy
    class configuration are the entry points.

## Decisions — round 3

12. A player AI failure switches that character to manual control for the battle
    until its owner explicitly re-enables AI. If disconnected, the battle waits
    at that character's activation. Saved character defaults remain unchanged.
13. Character defaults live on the character page. The normal battle controls
    provide a toggle and prompt editor for battle-specific changes. Only the
    character's owner can change them. Enemy configuration lives in its class.
14. Minimize prompt tokens. Start with the current battle snapshot only, without
    event history or a growing conversation. This is the working interpretation
    of the user's preference for less context over the proposed round history.
    Avoid duplicating shared definitions, while retaining the information needed
    to understand legal actions and current effects.
15. Show a choosing-action indicator followed by ordinary animations/history.
    Player failures explain the failure and the return to manual control. Do not
    request generated explanations of successful decisions.
16. The user manages spending limits on the provider API key. Do not add the
    proposed per-battle or game-wide application spending caps. Provider budget
    errors follow the already agreed player/enemy failure behavior.

## Decisions — round 4

17. Start with `z-ai/glm-5.3-flash`, selected by the user for lower cost. Keep the
    model configurable on the server. Do not assume that the lowest-price
    provider also satisfies the response deadline or required output controls.
18. Validate the entire activation plan before committing any of it. If the
    movement is valid but the follow-up action is invalid, reject the complete
    plan. Player takeover or enemy deterministic fallback begins from the
    original state. See [the activation-plan ADR](../adr/0002-atomic-ai-activation-plans.md).

## Confirmation

All interview questions have answers. The user also specified the selector
boundary below, then confirmed shared understanding and requested the spec.
The [implementation specification](ai-battle-control/spec.md) consolidates these
decisions. Model endpoint verification, precise schemas, implementation, and
validation remain execution work rather than unresolved product choices.

## AI selector boundary

Keep the AI selector in one file, as explicitly requested by the user. It owns
provider request construction, model configuration, prompt/schema construction,
the network call, and parsing/schema validation of the returned plan. Expose one
small asynchronous function accepting a compact battle snapshot, effective
behavior instructions, and an abort signal, and returning a provider-neutral
activation plan. Provider response types must not leak into battle code.

Start with OpenRouter. Changing to a different provider such as Vercel AI Gateway
should require changing this file while preserving its input/output contract.
Do not build provider adapters, a registry, a provider class hierarchy, or a
general-purpose AI framework for this feature. These are ordinary implementation
choices that can be revisited if a real need appears, not an additional ADR.

Keep battle-state extraction, game-rule validation, action commitment,
player/enemy failure handling, and durable recovery in the battle system. The
selector chooses a plan; it does not mutate battle state or decide who takes
control after a failure. Shape validation in the selector does not replace
whole-plan legality validation by the engine.

## Integration requirements

- Persist committed model-selected actions and control changes so recovery uses
  recorded decisions rather than querying a model to reproduce prior actions.
- Bind an in-flight response to the actor, activation, battle revision, and
  control/prompt version. Ignore stale responses after takeover, edits, or any
  other relevant state change.
- Use a compact current-state representation and shared definitions rather than
  serializing application objects or repeating entire spell descriptions per
  entity. Tokens and full-response timing must be measured with real snapshots.
- Enforce the output schema locally and validate all game rules in the engine.
  OpenRouter structured-output support varies by provider endpoint; route only to
  compatible endpoints and require the requested parameters. Strict-output
  behavior alone does not establish action legality or universal schema
  conformance. See [OpenRouter structured outputs](https://openrouter.ai/docs/guides/features/structured-outputs).
- Current provider-specific reasoning-disable support is unverified. Do not
  assume hidden reasoning is free, disabled, or compatible with a five-second
  full-response deadline until measured/configured for the chosen endpoint.

## Verification required during implementation

- Exercise valid move-and-cast plans, casts without movement, consumables,
  movement-only/end-turn plans, and extra activations against the same engine
  rules used for manual actions.
- Reject malformed or illegal plans without consuming movement, mana,
  consumables, or combat RNG. Verify no-op plans and actors unable to act do not
  stall battle progression.
- Verify ownership, public-state filtering, per-battle settings isolation,
  consumable permission, and complete replacement of default behavior guidance
  by a custom prompt.
- Cover timeouts, provider failures, malformed responses, manual takeover,
  prompt edits, and late responses with the agreed distinct player/enemy paths.
- Recover and reconnect during both pending and committed activations without
  duplicating actions or recomputing historical model decisions. Preserve
  compatibility with existing stored battles.
- Measure real request tokens, all billed output tokens, full-response latency,
  and schema/plan success rates for the selected GLM endpoint. Do not treat the
  existing cost scenarios as measurements.

## Research

See [model research](../research/2026-09-17-ai-enemy-models.md). Its original compact
cost scenario is not a measured full-state prompt. Subsequent discussion uses
10,000 input tokens per decision as a provisional planning budget, with
5,000–20,000 as an unmeasured range.
