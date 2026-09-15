# Friends and shared dungeon runs

Issue [#2](https://github.com/ChristianSchneeweiss/game/issues/2) is implemented
locally. The [specification](spec.md) defines the player contract. These
changes have not been deployed; the two-account browser walkthrough remains
pending by the user's choice.

## Player controls

Friends provides a copyable account code, code lookup, incoming and outgoing
requests, accepted friends, removal, blocking, and unblocking. The header inbox
lists addressed dungeon invitations, including expired and unavailable ones.
Invitations last 24 hours and remain available while the host is offline.

Dungeon preparation offers Invite friend. Each saved preparation has one host
and one guest place; the first valid acceptance closes its competing invitations.
Both players choose one owned character, connect, and mark ready. Only the host
chooses the dungeon, commits paths, and starts encounters. The party remains
fixed after entry. Solo preparation and simultaneous runs remain available,
including reuse of a character in more than one run.

Shared run and battle views show participant connection and readiness, retained
personal rewards, explicit abandonment, and Play again together after victory or
defeat. Leaving preparation and closing the browser have different effects:
explicit guest departure frees the place, host departure closes preparation,
and going offline only clears readiness. Removing or blocking a friend separates
waiting preparations while keeping already-started runs and results accessible.

## Authoritative boundaries

- `social-relations.ts` serializes relationship changes with ordered account
  locks. `social-invitations.ts` checks eligibility, expiry, and capacity inside
  the preparation transaction. Database constraints enforce unique codes,
  friendships, and pending requests/invitations.
- Shared preparation creates the run and first frozen encounter atomically.
  Existing run commands lock the run, preparation, and character rows in that
  order. Initial entry also locks the account pair before preparation; build
  mutations only acquire character/item locks.
- Readiness records each owner's selected character build revision. Equipment,
  spell, passive, attribute, and level changes invalidate matching readiness
  across waiting runs without rewriting active battle snapshots. Starting checks
  both current revisions and connected participants under the same locks. Ready
  and Start requests identify the displayed preparation revision; Ready also
  identifies the displayed build revision. Changes to preparation, encounters,
  and attendance advance that version so delayed requests cannot authorize a
  different encounter or re-arm consent after reconnecting.
- `PreparationPresence` owns a WebSocket room per preparation/run. Heartbeats,
  close/error callbacks, cold recovery, and expiring database leases clear stale
  consent. Multiple tabs do not disconnect an owner until the last live socket
  is gone. Departed members cannot retain room capacity or renew presence.
- Active abandonment goes through the current battle Durable Object's serialized
  command boundary. A persisted terminal intent prevents subsequent casts. A
  committed final cast is saved and settled before marking the run abandoned;
  delayed workflow calls cannot add another result. An encounter identity check
  prevents an older battle object from terminating a newer encounter.

## Database and runtime upgrade

Apply `20260914_shared_preparation.sql` followed by `20260914_social.sql` through
the existing migration runner. Fresh schema SQL and the checksum manifest include
both. Existing runs receive no preparation record and retain their saved party,
resources, results, and replay compatibility. New direct solo entry rejects
foreign-owned characters.

The worker adds the `PREPARATION_PRESENCE` binding and Durable Object migration
`v3` in both deployed and isolated-local configurations. Publish schema and worker
changes through the existing release runbook; no production migration or
deployment was performed during implementation.

## Verification

New authenticated API integration suites cover social authorization, invitation
expiry and acceptance, readiness, build changes, concurrent preparations/runs,
personal rewards, departure, abandonment, and playing again. Focused real-runtime
boundary tests cover both owners receiving committed battle state, waiting for an
absent owner, journal recovery, failed delivery during abandonment, stale battle
identity, presence cleanup, and account-scoped client queries.
Delayed mutation callbacks cannot navigate an account that signed in after the
action began; loss of preparation access removes its controls and connection.

The PostgreSQL rehearsal verifies fresh and upgraded schema equivalence,
transaction rollback, backup restoration, and independent-session races involving
invitation acceptance, remove/block/closure, starts versus builds/disconnects,
abandonment versus completion, and simultaneous XP/reward settlement. PGlite
integration coverage is separate from this real row-lock proof.

Final local verification on 2026-09-14 used Node 22.19.0 and Bun 1.4.0:

- Application and test type checks passed, with exactly four documented
  historical diagnostics in the complete-coverage gate.
- The battle release gate passed with 654 passing tests and exactly three
  accepted historical recording failures across 42 files. All 34 protected
  historical files remained byte-identical.
- The release verifier's 26 tests passed. PostgreSQL 16 passed schema upgrade,
  rollback, backup restoration, and 28 independent-session concurrency scenarios.
- Client production build and artifact verification passed. The Worker dry run
  bundled the new presence binding successfully. No deployment was performed.
- React Doctor reported 55 diagnostics against 57 at the baseline, with no new
  findings. Whitespace validation passed.

Historical exceptions remain governed by the existing exact-signature checks.
These automated checks do not establish the pending two-account browser
walkthrough or Cloudflare staging behavior. The disposable PostgreSQL container
was removed after verification.
