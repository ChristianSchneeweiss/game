# AI-controlled enemy behavior: model research

Researched 2026-09-17 against primary sources. No paid inference or gameplay experiment was run. Prices are USD and can change. Design recommendations below are inferences, not measured improvements.

## Recommendation

Worth a small elite/boss prototype. Jev is the most interesting match for choosing among legal actions; DeepSeek V4.1 Flash and GLM 5.3 Flash are useful comparison models. Cost is low for a few decisions per encounter. The harder questions are responsiveness and whether players find the choices more interesting than the existing heuristic.

Basic focus fire, retreat thresholds, healing, and archetype weights can also be implemented cheaply in ordinary code. The possible added value is flexible authored personalities and adaptation to unusual combinations, not merely replacing straightforward rules with network calls. Try 1–3 tactic decisions per boss fight first, or one action choice per boss turn, while ordinary mobs keep the heuristic. Telegraph the tactic so the player can understand and counter it.

## Verified model facts

| Model / route | Input / million tokens | Output / million tokens | Relevant support |
| --- | ---: | ---: | --- |
| `deepseek/deepseek-v4.1-flash`, OpenRouter | $0.15 starting price | $0.60 | JSON-schema response format and tool calling |
| `z-ai/glm-5.3-flash`, OpenRouter, DeepInfra promotion | $0.075 | $0.25 | JSON-schema response format and tool calling |
| GLM 5.3 Flash, common non-promotional providers | $0.15 | $0.50 | Provider capabilities and speed vary |
| `typesafe-ai/jev`, Vercel AI Gateway listing | $0.04 | No output rate listed | Typed Choice, Score, and Boolean answers |
| Jev, TypeSafe's own published rate | $0.042 | Free | Typed answers; no free-form text generation |

DeepSeek and GLM rates/support come from their live [DeepSeek model page](https://openrouter.ai/deepseek/deepseek-v4.1-flash) and [GLM model page](https://openrouter.ai/z-ai/glm-5.3-flash). GLM's lowest rate is explicitly a 50%-off DeepInfra promotion; avoid budgeting as though it were permanent. Provider routing can change the actual rate.

The [Vercel Jev listing](https://vercel.com/ai-gateway/models/jev) shows $0.04/M input. TypeSafe's [launch article](https://typesafe.ai/blog/introducing-system-one-models-and-jev) gives the more precise $0.042/M input and free output. Treat the small difference as an unresolved listing/direct-price discrepancy and budget $0.04–$0.042/M until actual Gateway usage confirms it.

Jev evaluates questions in parallel against shared state; its choices and scores include probabilities/confidence. TypeSafe's native yes/no primitive is called Noul, whereas Vercel exposes Boolean. Questions are independent, so choosing separate movement and spell outputs does not automatically make their combination valid. One Choice over complete legal action bundles fits better. The docs recommend small, atomic judgments and composing complex decisions in code. [TypeSafe introduction](https://docs.typesafe.ai/introduction)

Vercel added Jev on September 16, 2026, through AI SDK 7's experimental `evaluate` API, supported from version 7.0.105. This is a new integration to validate, not a drop-in chat-completion model. [Vercel announcement](https://vercel.com/changelog/typesafe-ai-jev-now-available-on-ai-gateway)

## Cost model

Formula for text models: `(input_tokens × input_rate + all_output_tokens × output_rate) / 1,000,000`. Include system instructions, legal candidates and state in input. Include reasoning tokens in output.

These scenarios assume one request per decision, no cache discount, retries, additional reasoning, taxes, application hosting, or optional gateway services. Jev is calculated at both published input rates; generated-output assumptions do not apply to it.

| Model/rate | 1,500 input + 100 output, per decision | 3,000 input + 300 output, per decision | 10,000 battles × 30 decisions, smaller request |
| --- | ---: | ---: | ---: |
| DeepSeek V4.1 Flash | $0.000285 | $0.000630 | $85.50 |
| GLM promotional | $0.0001375 | $0.000300 | $41.25 |
| GLM common rate | $0.000275 | $0.000600 | $82.50 |
| Jev | $0.000060–$0.000063 | $0.000120–$0.000126 | $18.00–$18.90 |

At the smaller request size, 30 decisions cost approximately 0.18–0.19 cents per Jev battle, 0.41 cents for promotional GLM, 0.83 cents for ordinary GLM, or 0.86 cents for DeepSeek. At only three calls per fight, divide the final column by ten. These are calculated scenarios, not measured prompt sizes.

OpenRouter Standard lists a 5.5% platform fee; inference is passed through and fees are collected when buying credits. Budget roughly $90.20 instead of $85.50 for the DeepSeek example before any payment-specific conditions or tax. [OpenRouter pricing](https://openrouter.ai/pricing), [billing explanation](https://openrouter.ai/support/)

Vercel AI Gateway states zero token markup/platform fee. Its $5 monthly free allowance covers only eligible models, so do not assume Jev is included. Optional services can have separate charges. [Gateway pricing](https://vercel.com/docs/ai-gateway/pricing)

## Latency and reasoning caveats

Observed OpenRouter page snapshots: DeepSeek's own endpoint showed 0.94 seconds latency and 122 tokens/second. GLM's cheapest DeepInfra endpoint showed 2.58 seconds and 15 tokens/second; Baseten showed 0.96 seconds and 74 tokens/second at $0.15/$0.50. These are aggregate P50 observations across workloads/reasoning settings, not game benchmarks or promises. [DeepSeek providers](https://openrouter.ai/deepseek/deepseek-v4.1-flash), [GLM providers](https://openrouter.ai/z-ai/glm-5.3-flash)

A rough estimate is first-token latency plus output length divided by throughput. The model page's latency alone is not full decision time, and multiple consecutive enemy calls compound the wait. Provider failures and fallback retries also add delay. [OpenRouter latency guide](https://openrouter.ai/docs/guides/best-practices/latency-and-performance)

Reasoning tokens are billed as output. Hiding them with `reasoning.exclude` does not prevent their generation or billing. They usually share `max_tokens` with the final answer; an overly small cap can produce no usable action. Exact current supported effort levels and whether reasoning can be disabled for these two specific Flash models were not conclusively verified in this research. Read the live model API `reasoning` metadata and verify actual usage before assuming a 100-token total output or configuring a disable switch. [OpenRouter reasoning documentation](https://openrouter.ai/docs/guides/best-practices/reasoning-tokens)

TypeSafe reports Jev end-to-end calls of 70–500 ms, but its evaluations ran primarily from West Coast laptops near its service. Its striking aggregate speed/cost comparisons concern its own workflow benchmarks, not this game's combat. It also demonstrated Doom using structured state at ten calls per second, costing approximately $7/hour; the authors acknowledge a conventional bot could play better and emphasize instruction-following as the fun part. Jev supports up to 255 choice options. These are vendor reports, not independent measurements. [TypeSafe launch and Doom demo](https://typesafe.ai/blog/introducing-system-one-models-and-jev)

## Fit with this game

The local game is a small-party, turn-based grid RPG. [`planEnemyTurn`](../../apps/game/src/tactical/ai.ts) already considers reachable destinations and legal casts, scoring immediate damage, kill/control bonuses, healing deficits, and repeated-effect avoidance. This is a useful basis for producing a diverse shortlist of roughly 8–20 legal movement/spell/target bundles. The model should select one candidate ID under an enemy personality and current tactic. The engine retains authority over legality, resources, damage, and resolution.

The server's [`advanceBots`](../../apps/server/src/battle/commands.ts) currently resolves consecutive bots synchronously. [`reconstructBattle`](../../apps/server/src/battle/reconstruct-battle.ts) reruns bots when replaying the player command journal. Introducing external decisions therefore needs an asynchronous decision driver, timeout/failure fallback to the existing heuristic, and persistence of selected enemy commands. Recovery must apply recorded choices rather than call the model again; otherwise battle replay can diverge.

Suggested evaluation: 50–100 varied battle snapshots for all three models plus the current heuristic, recording full-response p50/p95, usage including reasoning, invalid/stale choices, timeout/fallback rate, personality adherence, and tactical outcome. Then playtest whether an elite or boss feels readable and interesting. Include difficult combinations and low-confidence states. Schema validity and model confidence do not establish that a tactic is good or fun.

No gameplay source code was changed by this research.
