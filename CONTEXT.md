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
