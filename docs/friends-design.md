# Friends and dungeon invitations

Design discussed 14 September 2026 and published as
[GitHub issue #2](https://github.com/ChristianSchneeweiss/game/issues/2), labelled
`ready-for-agent`. The [complete specification](friends-spec.md) includes the
confirmed testing boundaries. Routine lobby-exit behavior was delegated to the
implementer; feature implementation has not started.

## Confirmed scope

- Friendships persist between player accounts and require mutual acceptance.
  Friend requests and dungeon invitations are distinct.
- Friends gather in a preparation lobby before a dungeon run starts. The party
  is locked when the run starts, including character identities; joining an
  ongoing run or swapping in another character is outside this feature.
- A shared run has two players, each choosing one of their own characters. Solo
  play with one or two owned characters remains available.
- Dungeon invitations are stored in an in-game inbox and can be received while
  the recipient is offline. Accepting an invitation opens preparation; starting
  requires both players to be ready.
- Parties, hosts, invitations, readiness, and abandonment belong to individual
  dungeon runs. Players can participate in multiple dungeons at once. This
  supersedes the earlier proposal to limit each account to one preparation lobby
  or ongoing shared run.

## Confirmed interaction rules

### Friends and invitations

- Each player has a unique, copyable friend code. Entering a code identifies the
  player and lets the sender request friendship.
- A preparation lobby survives its host going offline. Invitations expire after
  24 hours.
- A host may invite multiple friends for the single guest place. The first
  accepted invitation fills that place and closes the other invitations.
- Players can remove friends and block players. Removing a friendship cancels
  pending dungeon invitations; blocking also prevents new friend requests.
  Neither action silently removes a character from an ongoing dungeon run.

### Leading and preparing a shared run

- The inviter is the host. The host chooses the dungeon and subsequent paths,
  and starts encounters.
- The reason for explicit invitation consent and host leadership is recorded in
  [ADR 0001](adr/0001-shared-run-consent-and-leadership.md).
- Both players must mark themselves ready before each encounter. Changing a
  selected character or its build clears that player's readiness.
- Disconnecting clears that player's readiness. Changing the dungeon or chosen
  path clears both players' readiness. Both players must be connected and ready
  when the host starts an encounter.
- Each player controls only their own character. Hosting does not transfer
  character control.

### Concurrent dungeons

- Waiting for one friend does not prevent playing another solo or shared dungeon.
  There is no global party, account reservation, or character reservation added
  by this feature.
- Preserve the existing ability to use a character in multiple runs: health,
  mana, encounter progress, and party membership belong to each run. Character
  progression and owned builds retain their existing persistent behavior.
- Readiness is specific to an upcoming encounter in one run. A build change
  clears the owner's readiness in every waiting run that uses the affected
  character. Battles already started retain their frozen starting builds.
- Accepting, declining, closing, or abandoning one dungeon does not close another
  dungeon or cancel its invitations.

### Disconnects, abandonment, and rewards

- A disconnected player's character waits when it needs to act; reconnecting
  lets its owner resume. Control is never transferred automatically.
- Explicitly abandoning the run ends it for both participants. Rewards already
  earned are retained.
- Existing combat balance and reward rules remain: personal loot and XP for
  surviving characters, with no new multiplayer bonus or loot-sharing system.

### Player-facing entry points

- A Friends page contains the friends list and friend requests.
- A global inbox badge exposes dungeon invitations.
- Dungeon preparation includes an Invite friend action and lobby readiness.
- General online presence and direct messaging are outside this feature.

### Playing again together

- After victory or defeat, offer Play again together while the pair remain
  friends. It returns the same pair and host to preparation with fresh character
  selection and readiness; the previously accepted pairing can continue without
  a new dungeon invitation. Starting the next run still requires both players'
  fresh readiness.
- Results and earned rewards remain accessible independently of preparing the
  next run.

## Routine lobby defaults

The user delegated the pre-run leaving edge case. Apply these defaults:

- A guest explicitly leaving frees that lobby's guest place; the host can invite
  another friend. Previously closed invitations do not reopen automatically.
- A host explicitly leaving closes that lobby and its outstanding invitations.
  Going offline or closing the browser leaves the lobby waiting.
- Removing or blocking an existing friend separates all preparation lobbies
  shared by that pair: each host keeps their lobby and its guest leaves. It does
  not eject either character from an already started run.
- Blocking removes the friendship and cancels/prevents friend requests and
  dungeon invitations between the pair in either direction. Existing runs can
  still be resumed or explicitly abandoned.

## Acceptance criteria

- Two authenticated accounts can find each other by friend code, request and
  accept friendship, and see the persistent friendship after reloading.
- An offline recipient can later see and accept a valid dungeon invitation.
  Expired, canceled, filled, or closed invitations cannot grant participation;
  simultaneous acceptance by two invitees admits only one guest.
- Each player chooses only their own character. A run cannot include another
  account's character without that account's participation consent and readiness:
  either an accepted dungeon invitation or continuing the previously accepted
  pairing through Play again together with fresh readiness.
- Only the host can choose the shared dungeon's path or start its encounters.
  Stale readiness, a disconnected participant, or a changed build prevents start
  until the affected readiness requirements are satisfied again.
- Both owners can play the same battle through the existing multiplayer
  transport, control only their own characters, and reconnect to committed state.
- Two or more concurrent dungeons keep party membership, health/mana, encounter
  readiness, invitations, and abandonment scoped to the individual run,
  including when a character is reused. Changes to a shared persistent build
  invalidate readiness in every affected waiting run, as specified above.
- Either participant can explicitly abandon an active shared run. This stops
  further progression for both while preserving rewards already earned and
  preventing duplicate completion or reward delivery.
- Remove/block and pre-run departure follow the documented rules without
  silently ejecting participants from an ongoing run.
- Play again together starts a fresh preparation for the same eligible pair;
  earlier results and rewards remain available.
- Solo preparation, existing battle balance, survivor XP, personal loot, and
  saved-run/replay access continue to work.

## Existing foundation

- The [domain glossary](../CONTEXT.md) already allows one or two characters in a
  party, with different owners.
- `apps/server/src/game-usecases/dungeon-access.ts` grants run access to the
  creator and participating character owners, without granting ownership of
  another player's characters or loot.
- `apps/server/src/game-usecases/dungeon-run.ts` exposes only the current player's
  unclaimed reward bundles in run data.
- `apps/server/src/game-usecases/dungeon-attempt.ts` currently lets the creator
  or either participant owner start an encounter. `dungeon-route.ts` likewise
  permits either participant owner to commit the next path choice.
- The current `dungeonRouter.enterDungeon` loads the supplied character IDs, and
  `dungeonManager.enterDungeon` validates party size and duplicates before saving
  participation. These entry functions do not establish the invitation consent
  required by this design; entry authorization needs explicit treatment during
  implementation.
- `dungeonManager.removeDungeon` currently permits only the creator to remove a
  run, blocks removal during an active battle, and deletes run records. The
  accepted shared-run abandonment behavior needs a distinct operation that can
  end an active run for both participants while retaining earned rewards.
- `TB_dungeonParticipant` does not reserve a character across runs, and
  `readDungeon` restores health and mana from the individual run's saved
  `characterData`. Starting an encounter freezes its builds; the existing
  completion process serializes updates to persistent character progression.

Shared run access is a foundation for this feature; it does not define friend
requests, invitation consent, or lobby behavior.
