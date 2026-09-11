import type { Entity } from "@loot-game/game/entity-types";
import type { Stats } from "./timeline";
import type { ConditionDetail } from "./battle-effects";
import { ConditionIcons } from "./condition-icons";
import { entityLabel } from "./entity-label";
import { miniatureFor } from "./visual-manifest";

type LabelProps = {
  participants: Entity[];
  stats: Map<string, Stats>;
  conditions: Map<string, ConditionDetail>;
  labels: Map<string, HTMLDivElement>;
  selected: string[];
  legal: string[];
  activeId?: string;
  impact: boolean;
};

/** DOM labels remain separate from WebGL actors and are positioned by the camera. */
export function BattleLabels(props: LabelProps) {
  return (
    <div className="battle-label-layer">
      {props.participants.map((entity) => {
        const stats = props.stats.get(entity.id);
        const marker = stats?.flags.dead
          ? "✕ Fallen"
          : props.selected.includes(entity.id)
            ? "◎ Selected"
            : props.activeId === entity.id
              ? "◆ Acting"
              : props.legal.includes(entity.id)
                ? "◇ Legal target"
                : entity.team === "TEAM_A"
                  ? "I Party"
                  : "II Enemy";
        return (
          <div
            className="battle-actor-label"
            key={entity.id}
            ref={(node) => {
              if (node) props.labels.set(entity.id, node);
              else props.labels.delete(entity.id);
            }}
            data-entity-label={entity.id}
            data-model={miniatureFor(entity).id}
            data-state={
              stats?.flags.dead
                ? "fallen"
                : props.selected.includes(entity.id)
                  ? "selected"
                  : props.activeId === entity.id
                    ? "acting"
                    : "idle"
            }
          >
            <span>{marker}</span>
            <strong>{entityLabel(entity, props.participants)}</strong>
            <div className="battle-actor-health">
              <i
                style={{
                  width: `${Math.max(0, (stats?.health ?? 0) / entity.maxHealth) * 100}%`,
                }}
              />
            </div>
            <small>
              {stats?.health ?? 0} / {entity.maxHealth} HP
            </small>
            <ConditionIcons
              ids={stats?.activeEffects ?? []}
              details={props.conditions}
              entityName={entityLabel(entity, props.participants)}
            />
            {props.impact && stats?.deltaHealth ? (
              <b className={stats.deltaHealth > 0 ? "is-healing" : "is-damage"}>
                {stats.deltaHealth > 0 ? "+" : ""}
                {stats.deltaHealth}
              </b>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
