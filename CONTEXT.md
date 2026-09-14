# Shards of Affinity

A small-party, turn-based dungeon RPG built around collecting spells and
combining them into character builds.

## Language

**Entity**:
A character or enemy participating in a battle.

**Character**:
A player-controlled entity with a persistent build of attributes, spells,
passive skills, and equipment.

**Enemy**:
An automated opposing entity with a configured combat kit.

**Party**:
The one or two characters undertaking a dungeon together; their owners may differ.
Party membership belongs to that dungeon run, so a player or character may
participate in other runs at the same time.

**Friend**:
A player account with a persistent, mutually accepted social connection to another
player account.
_Avoid_: Using “friend” to mean a character or a temporary party member.

**Friend request**:
A proposal from one player account to another to become friends.
_Avoid_: Dungeon invitation.

**Friend code**:
A unique, shareable identifier for a player account used to find that player
and send a friend request.

**Dungeon invitation**:
An invitation to a friend to join preparation for a particular dungeon run.
_Avoid_: Friend request.

**Preparation lobby**:
A shared space where friends assemble their party and mark themselves ready
before starting a particular dungeon run; it does not reserve their participation
across other dungeons.

**Host**:
The player who invites a friend and leads their shared dungeon run by selecting
the dungeon, choosing paths, and starting encounters.
_Avoid_: Using “host” to imply ownership or control of the friend's character.

**Ready**:
A player's confirmation that their selected character is prepared for the
upcoming encounter in a particular dungeon run.

**Abandoned run**:
A shared dungeon run deliberately ended by a participant before completion;
the participants retain rewards already earned.
_Avoid_: Treating a disconnected player as having abandoned the run.

**Spell**:
A combat ability, including physical attacks, magic, healing, and defensive
actions. Basic Attack is also a spell.
_Avoid_: Using “spell” to mean only magic.

**Legal target**:
An entity permitted as a target for the current caster and spell in the current
battle situation. Being legal does not mean it has been selected.
_Avoid_: Available target when that could mean a target already chosen.

**Selected target**:
An entity chosen from the legal targets for the current spell. When the spell
is cast, it resolves against the selected entity or complete selected target set.
_Avoid_: Inspected actor, hovered actor.

**Cast**:
An entity's committed use of a spell against its selected legal targets,
distinct from preparing a choice of spell and targets.

**Battle**:
A fight between the party and an enemy team, resolved through combat turns
until one team has no living entities.

**Battle replay**:
A view of a battle's already resolved events; watching it does not make new
combat decisions.

**Combat round**:
One traversal of the battle's turn queue, including any additional actions
granted by combat effects.
_Avoid_: Unqualified “round” when discussing dungeon progression.

**Dungeon wave**:
One authored enemy encounter in a dungeon run.
_Avoid_: Combat round.
