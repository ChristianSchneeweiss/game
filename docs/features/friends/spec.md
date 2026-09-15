# Friends and shared dungeon runs specification

The feature is implemented locally. See the [implementation record](implementation.md)
for delivered behavior, verification and remaining browser and deployment work.
The accepted requirements below preserve the original problem statement.

## Problem Statement

Players cannot reliably find friends, agree to enter a dungeon together, or
coordinate a shared run through the normal game interface. The battle transport
already supports multiple character owners, but that does not provide persistent
friendships, invitation consent, shared preparation, or clear leadership and
readiness rules. Players also need to keep playing other dungeons while a friend
is unavailable.

## Solution

Add persistent friendships between player accounts, discovered through unique
friend codes and established through accepted friend requests. Let a player
invite friends into preparation for a particular dungeon through an in-game
inbox that works even when the recipient is offline.

Each shared run contains two players with one owned character each. The inviter
is the host, who selects the dungeon, chooses paths, and starts encounters after
both players are connected and ready. Each owner controls their own character.
The party is fixed once the run starts. Disconnected players can return to their
waiting turn; either participant can explicitly abandon that run while retaining
earned rewards. After victory or defeat, the same pair can prepare another run
together without exchanging a new dungeon invitation.

All preparation, leadership, invitations, readiness, and run progress are scoped
to an individual dungeon. Players can run multiple solo or shared dungeons at
once, including reusing a character. This feature introduces no global party or
reservation of a player or character. Existing solo play, battle balance,
personal loot, survivor XP, and saved replay behavior remain available.

## User Stories

1. As a player, I want a unique, copyable friend code, so that I can tell someone how to find my account.
2. As a player, I want to enter another player's friend code and see which player it identifies, so that I can request friendship with the intended person.
3. As a player, I want to send a friend request, so that another player can choose whether to connect with me.
4. As a recipient, I want to see incoming friend requests on the Friends page, so that I can decide who joins my friends list.
5. As a recipient, I want to accept a friend request, so that both accounts become friends.
6. As a recipient, I want to decline a friend request, so that I can refuse a connection.
7. As a player, I want duplicate requests or repeated clicks to preserve one consistent relationship, so that my friends list and requests do not contain duplicate connections.
8. As a player, I want friendships to remain after reloading or signing back in, so that I do not need to add the same friends again.
9. As a player, I want friendships to belong to accounts rather than characters, so that changing my character does not change who my friends are.
10. As a player, I want to remove a friend, so that I can end that social connection.
11. As a player, I want to block another player, so that friend requests and dungeon invitations between us stop.
12. As a player, I want removing or blocking someone to cancel our pending dungeon invitations and separate our preparation lobbies, so that an old invitation or lobby cannot start a new shared run between us.
13. As a participant, I want removing or blocking my teammate to leave an ongoing run intact, so that my character and earned rewards are not silently removed.
14. As a player preparing a dungeon, I want an Invite friend action, so that I can bring a friend into that dungeon's preparation.
15. As a host, I want to choose which dungeon we prepare, so that my friend knows the expedition they are joining.
16. As a host, I want to invite more than one friend for the available guest place, so that the first willing friend can join me.
17. As a recipient, I want a global dungeon-invitation inbox badge, so that I can notice invitations while using other parts of the game.
18. As an offline recipient, I want invitations to be stored for later, so that I can respond when I return.
19. As a recipient, I want to see the inviter, dungeon, and invitation availability before accepting, so that I know what I would join.
20. As a recipient, I want to accept or decline a dungeon invitation, so that joining preparation is my choice.
21. As a host, I want my preparation lobby to survive going offline or closing the browser, so that a friend can still join it later.
22. As a recipient, I want invitations to expire after 24 hours and show when they are no longer usable, so that I do not try to join through a stale invitation.
23. As an invitee, I want the first valid acceptance to fill the single guest place and close the other invitations, so that two guests cannot be admitted to a two-character party.
24. As a player, I want repeated acceptance or retried requests to leave one consistent lobby membership, so that a connection problem cannot duplicate my participation.
25. As a participant, I want to see the other player's selected character and readiness in preparation, so that we can coordinate before starting.
26. As a participant, I want to select one of my own characters for a shared run, so that I choose the character I will control.
27. As a character owner, I want another player to need my participation consent and readiness before including my character, so that knowing its identifier cannot enroll it in a dungeon.
28. As a solo player, I want to keep preparing a dungeon with one or two owned characters, so that adding friends does not remove the existing solo flow.
29. As a participant, I want the party's players and character identities to stay fixed after the run starts, so that the people and characters I agreed to play with do not change midway.
30. As a participant, I want to mark myself ready before every encounter, so that the host knows when I am prepared to fight.
31. As a participant, I want changing my selected character or its build to clear my readiness, so that an earlier ready state does not apply to a changed preparation.
32. As a participant, I want changing the dungeon or chosen path to clear both players' readiness, so that both of us prepare for the encounter we will actually enter.
33. As a participant, I want disconnecting to clear my readiness, so that an unattended ready state cannot start a later encounter for me.
34. As a host, I want to start an encounter only when both players are connected and ready, so that we enter together.
35. As a host, I want to choose the next path and start subsequent encounters, so that one player leads the expedition.
36. As a guest, I want shared dungeon controls to make the host's role clear, so that I know which actions I can take and which require the host.
37. As a participant, I want to control only my own character in battle, so that hosting or being friends does not give someone control over my character.
38. As a participant, I want both players to see the same committed battle state, so that we can cooperate through the existing multiplayer battle flow.
39. As a disconnected participant, I want my character to wait when it needs to act and to resume after I reconnect, so that a temporary connection loss does not hand over control or abandon the run.
40. As the remaining participant, I want to see when progress is waiting for my teammate, so that I understand why their turn or the next encounter cannot proceed.
41. As a participant, I want to explicitly abandon a shared run, so that I can end it without needing the other player to return.
42. As a participant, I want abandonment to end that run for both players, so that we cannot continue incompatible versions of the same expedition.
43. As a participant, I want already earned rewards, including unclaimed rewards, to survive abandonment, so that ending a run does not erase rewards I have earned.
44. As a participant, I want retries, reconnects, and overlapping completion or abandonment requests to settle rewards once, so that rewards are neither lost nor duplicated.
45. As a player, I want to participate in multiple preparation lobbies and dungeon runs at once, so that waiting in one dungeon does not prevent playing elsewhere.
46. As a player, I want to reuse a character across concurrent dungeons, so that this feature does not introduce a character reservation that the game did not previously require.
47. As a participant, I want each dungeon to retain its own party, host, health, mana, and progress, so that actions in another dungeon do not overwrite this run.
48. As a participant, I want invitation responses, departure, or abandonment in one dungeon to affect only that dungeon, so that my other preparations and runs remain available.
49. As a character owner, I want a shared build change to clear my readiness in every waiting run using that character, so that none of those runs starts with consent for an outdated build.
50. As a participant in a battle already underway, I want its starting build to remain frozen when the persistent character changes elsewhere, so that the active battle and replay remain consistent.
51. As a guest, I want explicitly leaving preparation to free my place while the host keeps that lobby, so that the host can invite someone else.
52. As a host, I want explicitly leaving preparation to close that lobby and its invitations, so that guests cannot join a preparation I have ended.
53. As a player, I want lobby departure and invitation cancellation to have clear visible results, so that going offline is not confused with deliberately leaving.
54. As a participant, I want existing personal loot and survivor XP rules to apply to shared runs, so that playing with a friend does not unexpectedly split or rebalance rewards.
55. As a participant who completed or lost a run, I want Play again together to preserve the eligible pair and host, so that we can prepare another dungeon without a new dungeon invitation.
56. As a participant preparing another run with the same friend, I want fresh character selection and readiness, so that I can change my preparation and explicitly agree to the next run.
57. As a participant, I want earlier results, unclaimed rewards, and recorded replays to remain accessible while preparing another run, so that replaying together does not replace the previous outcome.
58. As a signed-in player, I want my friends, requests, invitations, and private run data to remain tied to my account when accounts change, so that another signed-in account does not inherit my private interface state.

## Implementation Decisions

- Use the project's account, Character, Party, Friend, Friend request, Friend code, Dungeon invitation, Preparation lobby, Host, Ready, and Abandoned run terminology. Follow the accepted decision on explicit participation consent and host leadership.
- Extend the existing application and persistence layers with cohesive social-relationship and shared-preparation operations. Reuse the current authenticated game API, run commands/read models, character ownership rules, and multiplayer battle transport rather than creating another combat implementation.
- Persist account-to-friend-code mapping, friend requests, mutually accepted friendships, blocks, per-dungeon preparation, selected characters, invitations with expiry and terminal outcomes, and sufficient readiness state to validate the upcoming encounter. Enforce identity uniqueness and slot exclusivity at their proper scopes. Do not add an exclusive active-lobby, active-run, or character-reservation constraint across dungeons.
- Friend-code lookup identifies a player; it grants no friendship, run access, or character rights. Return the player identity needed to make the request. Prevent self-friendship, duplicate social connections, and unauthorized changes to another account's requests, blocks, or invitations. Repeated operations must leave a consistent relationship and participation state.
- A new shared preparation is for one planned dungeon run and has a host and one guest place. Only accepted friends can receive new dungeon invitations. Invitations are addressed to the recipient account, remain available while the host is offline, and expire 24 hours after creation if still pending. An already accepted invitation does not later expire the guest's membership.
- A host may invite several friends for the guest place. Acceptance must atomically validate recipient, friendship/block eligibility, invitation expiry, lobby availability, and remaining capacity before admitting one guest and closing competing invitations to that lobby. A stale or repeated response cannot admit another participant or revive a canceled invitation. Accepting one dungeon invitation must not cancel invitations to another dungeon.
- Each shared-run participant chooses one character they own. Enforce consent and character ownership at the authoritative API boundary, including existing dungeon-entry routes, so directly supplied identifiers cannot bypass the friends/preparation flow. A continuing pairing through Play again together requires fresh character selection and readiness, but no new dungeon invitation.
- Once the shared run starts, keep its two participant accounts and character identities fixed. Existing permitted build changes remain available between encounters. Do not support late joining, replacement characters, a third participant, or automatic character takeover.
- The inviter is that run's host. Only the host selects the dungeon, commits path choices, and starts encounters. Neither hosting nor friendship grants control over another character, its inventory, or its personal loot.
- Readiness belongs to the upcoming encounter in a particular run. Start requires both participants to be connected to that run and freshly ready. Reset readiness for each subsequent encounter; changing a selected character or its build clears the owner's readiness, changing the dungeon or chosen path clears both players' readiness, and disconnecting clears that player's readiness.
- Validate readiness and the selected preparation together with authoritative encounter creation so a build edit, disconnect, path change, or duplicate start cannot consume stale readiness or create two encounters. Reuse the established run/character transaction ordering and frozen encounter-build capture. General online presence is not needed; connection information here is scoped to the lobby/run and its start gate.
- Support multiple concurrent preparations and solo/shared runs, including repeated use of the same character. Party membership, leadership, health, mana, progress, invitations, and abandonment are scoped to the run. Persistent character builds and progression remain shared as they are today. A persistent build change invalidates its owner's readiness across every affected waiting run; already-started battle snapshots remain unchanged.
- Reuse existing committed-state synchronization and reconnect behavior. A disconnected owner does not forfeit or transfer their character; progress waits when that character must act, and the next encounter cannot start without both players' fresh readiness. Do not introduce a disconnect-based abandonment timeout.
- Add an explicit terminal abandonment operation available to either participant. Abandonment ends further actions and progression for both in that run, including an active battle, without using destructive run removal to discard results. Serialize abandonment with completion through the existing durable settlement and database boundaries: honor already-earned completed outcomes exactly once, retain unclaimed earned rewards, and prevent late messages or retries from reviving or rewarding an abandoned encounter incorrectly. Other dungeons remain unaffected.
- Preserve existing balance, survivor XP, personal loot ownership and collection, and saved results/replays. Account progression updates and completion retries must continue to avoid lost updates or duplicate rewards when the same character participates concurrently.
- Apply the delegated lobby defaults: a guest explicitly leaving frees that guest place; the host can invite again, but previously closed invitations do not reopen. A host explicitly leaving closes that lobby and its outstanding invitations. Going offline or closing the browser does neither.
- Removing a friendship cancels pending dungeon invitations between the pair and separates every preparation lobby they share: its host keeps the lobby and its guest leaves. Blocking also removes the friendship and cancels/prevents friend requests and dungeon invitations between the pair in either direction. Neither action removes existing run participants or their access to earned results; either participant may still explicitly abandon an ongoing run.
- Add the Friends page for friends and friend requests, a global inbox badge and inbox for dungeon invitations, and Invite friend plus shared character/readiness controls in dungeon preparation. Show expired/unavailable invitations, host-only actions, disconnected/waiting states, and explicit departure/abandonment outcomes through normal player controls. Keep private query state scoped to the signed-in account using the existing account-switch lifecycle.
- Offer Play again together after victory or defeat while the pair remain friends. Continue the previously accepted pairing and host into a fresh preparation, with fresh character selection and readiness. Do not redirect or ready an absent participant implicitly, overwrite the previous run, or remove access to its results and rewards.
- Keep existing solo preparation and historical run/replay access working. Apply any additive persistence changes and compatibility handling through the project's existing database workflow. Exact storage names, endpoint names, and component layout are implementation choices; the observable rules above are the contract.

## Testing Decisions

- The user confirmed the proposed boundaries: primarily test through the existing authenticated game API with the real test database, supplemented by focused multiplayer reconnect/abandonment checks and one two-player browser walkthrough.
- Prefer one primary integration boundary: the public authenticated game API as called by two participants and an unrelated account. Exercise real application operations, database constraints, run commands, build changes, and reward settlement together. Reuse the existing caller/context and schema-backed PGlite harness; add the new social/preparation API to that harness instead of introducing a separate low-level mock boundary for each helper.
- A good test checks observable decisions and consequences: what an account can read or change, which invitation wins, who can join/start/cast/abandon, whether readiness is valid, what run state persists, and which rewards remain claimable. Avoid assertions about internal helper calls, SQL text, component structure, or a chosen schema layout. Use deterministic fixtures and time control only at existing external boundaries.
- Prior art includes the full dungeon-run and branching-route API integration tests, attempt identity and completion rollback tests, schema-backed reward-claim tests, multiplayer session/recovery tests, and account-switch query-isolation tests. Preserve protected historical fixtures and follow the existing release/test conventions when adding coverage.
- Cover friend-code lookup, request/accept/decline, persistence after reload, self/duplicate requests, account authorization, remove/block, and private query state after account changes. Blocking must not be bypassed through a retained friend code, stale request, or old invitation.
- Cover invitation availability after an offline interval, exact expiry, decline, explicit closure, guest departure, and first valid acceptance. Exercise duplicate responses and competing acceptance against expiry, host closure, removal/blocking, and the final guest slot. Assert one resulting guest and no cross-dungeon invitation cancellation.
- Cover each owner's character selection and rejection of direct attempts to enroll another owner's character without consent. Cover new preparation and Play again together, fixed character identities after start, host-only choices/starts, and existing solo entry.
- Cover fresh readiness before every encounter, not just the first: character/build edits, path/dungeon changes, disconnect/reconnect, a pending start concurrent with invalidation, and repeated start requests. Assert that at most one encounter starts with both players' current consent and frozen builds.
- Cover at least two simultaneous dungeon runs and preparations using the same accounts and character. Verify independent health/mana, parties, leadership, invitation outcomes, progress, and abandonment. Verify cross-run invalidation from a shared persistent build edit while active battle snapshots stay unchanged, and verify concurrent progression does not lose XP or duplicate rewards.
- Reuse the existing battle transport/session and Durable Object recovery boundaries only for behavior that the API/database seam cannot prove: two owners receiving committed state, per-character control, waiting on the absent owner's turn, reconnect synchronization, stale socket callbacks, and terminal abandonment of an active battle. Keep real command validation, journal handling, frozen builds, and completion handling underneath those tests.
- Test abandonment against battle completion, delayed delivery, retry, and reconnect. An already-earned result must settle once; unclaimed earned rewards must remain claimable; later commands cannot revive the run. Verify removal/blocking affects all shared preparation lobbies but preserves participation and earned results in already-started runs.
- PGlite coverage does not prove production row-lock behavior because its single connection serializes work. Extend the existing real PostgreSQL concurrency rehearsal for competing invitation acceptance and start/invalidation or abandonment/completion races; use separate sessions at the same public operation boundary rather than claiming a mocked race proves database isolation.
- Perform one focused browser walkthrough with two authenticated accounts through normal controls: establish friendship, deliver and accept an invitation across an offline interval, select one character each, ready and start, control each owner's turn, reconnect, advance through readiness for a later encounter, inspect personal rewards, and prepare another run together. Use another run in that walkthrough to check concurrent-run navigation and abandonment without losing earlier rewards. Record which behavior is proven in the browser versus the automated harness.
- Run the project's relevant integration, session, and account-isolation suites, application/test type checks, and required database/protected-fixture checks. Broaden testing when changed battle, persistence, or client boundaries warrant it. Establish the current baseline at implementation time rather than treating historical diagnostic counts as current results. This spec makes no claim that feature tests or implementation have already run.

## Out of Scope

- Parties larger than two characters, more than two players in a shared run, late joining, or swapping characters after a run starts.
- Matchmaking, guilds, public party discovery, a global party, or exclusive player/character reservations across dungeons.
- Broad player-name search, contact import, shareable dungeon admission links, email invitations, push notifications, general online status, or direct messaging.
- Host transfer, voting on paths, automatic character takeover, AI substitution for an absent player, or automatic abandonment on disconnect.
- New combat balance, multiplayer scaling or bonuses, loot splitting/trading, new progression/entry-cost rules, or changes to existing gold-wallet behavior.
- Replacing the multiplayer battle engine, transport, committed-state/replay model, or authentication provider.
- Deployment or feature implementation as part of publishing this specification.

## Further Notes

- This is the synthesis of the agreed friends design, including the final clarification that several dungeon runs and preparations can coexist. Earlier suggestions of one lobby or one shared run per account, or reserving characters, are superseded.
- The user delegated routine preparation-lobby exit behavior. The explicit host/guest departure and pre-run remove/block defaults above are implementation guidance, not unresolved questions.
- Existing multiplayer capability is the foundation. The missing work includes authenticated social/preparation flow and enforcement of invitation consent; merely exposing the current battle socket or passing another character's identifier is not sufficient.
- The implementation must distinguish ending participation in one dungeon from removing an account-level friendship. The former affects that dungeon; the latter affects pending social/preparation connections between the pair while preserving already-started run membership.
- The issue is intended for the project's ready-for-agent triage state. The test boundaries have been checked with the user, and no further product interview is required to start implementation from this spec.
