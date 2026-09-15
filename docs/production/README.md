# Production and development

[All documentation](../README.md)

Start with setup for local development. For release work, use the checklist,
follow the release runbook, and record results against the tested commit.
The retained evidence establishes local results; staging and production
qualification remain incomplete.

| Document | Purpose |
| --- | --- |
| [Setup and commands](setup.md) | Pinned runtimes, isolated development, checks and historical exception policy. |
| [Release checklist](checklist.md) | Remaining candidate, staging, browser and promotion requirements. |
| [Release evidence](evidence.md) | Candidate identity, local results, decisions and retained reports. |
| [Release, migration and recovery](release.md) | Target preflight, backups, cutover, deployment and rollback. |
| [Persistence and module boundaries](architecture.md) | Run commands, transaction order and saved-data compatibility. |
| [Client sessions and presentation](client.md) | Connection and command ownership, private queries and Cards controls. |
| [Security and operations review](security-review.md) | Findings, remediations, permissions and dependency dispositions. |
| [Browser qualification](browser.md) | Observed flows, device-specific measurements and remaining live proof. |
| [Manual database migrations](../../apps/server/migrations/manual/README.md) | Historical migration preflights and ordering. |

The [evidence directory](evidence/) holds retained reports, including the
[11 September schema-push smoke](evidence/schema-push-smoke-20260911.md).
The [battle test README](../../tests/battle/README.md) preserves the immutable
historical baseline; setup and release evidence document accepted exceptions.
