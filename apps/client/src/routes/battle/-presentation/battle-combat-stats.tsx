import { useEffect, useEffectEvent } from "react";
import type { AllAttributeKeys, Entity } from "@loot-game/game/entity-types";
import { attributeLabel, formatAttribute } from "@/lib/equipment-details";
import type { BattleSession } from "../-hooks/use-battle";
import "./battle-combat-stats.css";

function AttributeList({
  attributes,
  values,
}: {
  attributes: AllAttributeKeys[];
  values: Partial<Record<AllAttributeKeys, number>>;
}) {
  return (
    <dl className="battle-combat-stat-list">
      {attributes.map((attribute) => (
        <div key={attribute}>
          <dt>{attributeLabel(attribute)}</dt>
          <dd>
            {values[attribute] === undefined
              ? "—"
              : formatAttribute(attribute, values[attribute])}
          </dd>
        </div>
      ))}
    </dl>
  );
}

type InspectionSession = Pick<
  BattleSession,
  | "getCharacterAttributes"
  | "getSpellDescription"
  | "characterAttributes"
  | "spellDescription"
  | "battleState"
  | "readyState"
>;

export function BattleCombatStats({
  entity,
  session,
}: {
  entity: Entity;
  session: InspectionSession;
}) {
  const attack = entity.spells.find(
    (spell) => spell.config.type === "basic-attack",
  );
  const refresh = useEffectEvent(() => {
    session.getCharacterAttributes(entity.id);
    if (attack) session.getSpellDescription(attack.config.id);
  });
  useEffect(() => {
    refresh();
  }, [
    entity.id,
    session.battleState?.revision,
    session.battleState?.events.length,
    session.readyState,
  ]);

  const attributes = session.characterAttributes.get(entity.id);
  if (!attributes)
    return (
      <p className="battle-muted" role="status">
        Loading combat stats…
      </p>
    );
  const values = {
    ...attributes.baseAttributes,
    ...attributes.specialAttributes,
    ...attributes.affinities,
  };
  return (
    <section className="battle-combat-stats" aria-label="Live combat stats">
      <h3>Combat stats</h3>
      <p className="battle-muted">
        Current values, including equipment and active effects.
      </p>
      <AttributeList
        attributes={["armor", "magicResistance"]}
        values={values}
      />
      <p className="battle-defense-help">
        Armor subtracts from physical hits; magic resistance subtracts from
        magical hits. Either can reduce damage to zero.
      </p>
      {attack && (
        <div className="battle-basic-attack">
          <h4>Basic Attack</h4>
          <span>
            {entity.equipped.WEAPON?.name ??
              (entity.isBot ? "Natural attack" : "Unarmed")}
          </span>
          <p>
            {session.spellDescription.get(attack.config.id)?.text ??
              "Loading attack details…"}
          </p>
          <small>
            Damage shown before defenses, critical hits, and damage effects.
          </small>
        </div>
      )}
      <AttributeList
        attributes={[
          "strength",
          "intelligence",
          "agility",
          "vitality",
          "armorPenetration",
          "magicPenetration",
        ]}
        values={values}
      />
      <details className="battle-combat-more">
        <summary>More combat stats</summary>
        <AttributeList
          attributes={[
            "movement",
            "critChance",
            "critDamage",
            "healthRegen",
            "manaRegen",
            "lifesteal",
            "omnivamp",
            "blessed",
            "fire",
            "lightning",
            "earth",
            "water",
            "dark",
          ]}
          values={values}
        />
      </details>
    </section>
  );
}
