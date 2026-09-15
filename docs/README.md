# Documentation

Start with [setup and commands](production/setup.md) to run the game, or the
[feature guide](features/README.md) to understand its behavior.

The implementation records describe local work. Staging and production release
qualification remain incomplete in the recorded evidence. Use the
[release checklist](production/checklist.md) for remaining gates and
[release evidence](production/evidence.md) for dated results and their limits.

## Browse by topic

| Section | Contents |
| --- | --- |
| [Production and development](production/README.md) | Setup, architecture, client sessions, security, browser qualification, releases and recovery. |
| [Features](features/README.md) | Library, friends, tactical grids, equipment, dungeon runs and encounter presentation. |
| [Might and balance](might/README.md) | Might specification, current assessments, calibration, research and reproducible probes. |
| [Enemy models](enemy-models/README.md) | Asset mapping, provenance, licenses, conversion and validation evidence. |
| [Domain model](../CONTEXT.md) | Shared game vocabulary. |
| [Architecture decisions](adr/) | Accepted decisions and their rationale. |

## Working conventions

- [Issue tracker](agents/issue-tracker.md)
- [Triage labels](agents/triage-labels.md)
- [Domain documentation](agents/domain.md)

## Reading and maintaining these docs

Implementation guides describe delivered behavior; specifications preserve the
accepted requirements. Research and dated evidence retain their original scope
and are not an active backlog. Check each document's date and status before
treating a proposed task or reported defect as current work.

Keep documents in the matching topic folder and link them from its index.
Keep supporting reports beside the relevant guide. Remove superseded material;
Git history preserves earlier versions. Update repository references when moving
or removing a document. Use repository-relative links so they work in any checkout.

## Historical documents

Commit `eb016e5` contains the retired archive, initial Might assessments and
tactical-grid feasibility research at their original paths. For example:

```sh
git show eb016e5:docs/archive/battle-audit/README.md
git show eb016e5:docs/might-assessments-v1.md
git show eb016e5:docs/tactical-grid-feasibility.md
```
