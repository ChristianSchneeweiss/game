---
status: accepted
---

# Validate AI activation plans before committing any action

AI selects a complete activation containing optional movement followed by an
action, while the ordinary battle interface can commit movement separately.
Validate the entire AI plan before committing any part of it, rather than keeping
a legal movement when its proposed follow-up action is invalid. This preserves
the original position and resources for player takeover or deterministic enemy
fallback, at the cost of validating the follow-up against the projected state.

Committed selections must be recorded so recovery reproduces the actual battle
without querying the model to reconstruct historical choices. A pending response
may commit only while its activation, battle state, and control settings remain
current; taking over or editing the prompt invalidates an uncommitted response.

This records the agreed design, not an implemented feature. The
[AI battle control specification](../features/ai-battle-control/spec.md) contains
the complete behavior and integration requirements; the
[design interview](../features/ai-battle-control.md) records the decisions.
