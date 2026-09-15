import { useState } from "react";
import type { Entity } from "@loot-game/game/entity-types";
import type { SpellDescription } from "@loot-game/game/types";
import type { BattleSession } from "../-hooks/use-battle";
import type { Stats } from "./timeline";
import { groupConditions, type ConditionDetail } from "./battle-effects";
import { visibleHistory, type ActionHistoryEntry } from "./action-history";
import { SkillIcon } from "../../../components/skill-icon";
import { BattleCombatStats } from "./battle-combat-stats";

export function BattleInspector({
  entity,
  name,
  stats,
  conditions,
  session,
  descriptions,
  history,
  shownCursor,
}: {
  entity?: Entity;
  name: string;
  stats?: Stats;
  conditions: Map<string, ConditionDetail>;
  session?: BattleSession;
  descriptions?: Map<string, SpellDescription>;
  history: ActionHistoryEntry[];
  shownCursor: number;
}) {
  const [section, setSection] = useState<"details" | "history">("details");
  const entries = visibleHistory(history, shownCursor);
  const latest = entries[0];
  const active = groupConditions(stats?.activeEffects ?? [], conditions);
  return (
    <aside className="battle-inspector" aria-label="Entity inspector">
      <div
        className="battle-inspector-tabs"
        role="group"
        aria-label="Battle sidebar"
      >
        <button
          aria-pressed={section === "details"}
          onClick={() => setSection("details")}
        >
          Inspect
        </button>
        <button
          aria-pressed={section === "history"}
          onClick={() => setSection("history")}
        >
          Battle log
        </button>
      </div>
      <div className="battle-inspector-content">
        {section === "history" ? (
          <section
            aria-label="Recent battle actions"
            className="battle-history"
          >
            <span className="battle-eyebrow">Resolved actions</span>
            <h2>Battle log</h2>
            <p className="battle-muted">
              The latest 12 actions at this point in the battle.
            </p>
            {!entries.length && (
              <p className="battle-history-empty">
                Actions appear here when they resolve.
              </p>
            )}
            <ol>
              {entries.map((entry) => (
                <li key={entry.index} data-event-index={entry.index}>
                  <SkillIcon type={entry.iconType} size={30} eager />
                  <div>
                    <span className="battle-history-round">
                      Round {entry.round}
                      {entry.critical ? " · Critical" : ""}
                    </span>
                    {entry.caster && (
                      <strong className="battle-history-caster">
                        {entry.caster}
                      </strong>
                    )}
                    <strong>{entry.label}</strong>
                    {entry.results.map((result, index) => (
                      <p key={`${entry.index}:${index}`}>{result}</p>
                    ))}
                  </div>
                </li>
              ))}
            </ol>
          </section>
        ) : (
          <section aria-label="Inspected entity details">
            <span className="battle-eyebrow">Entity dossier</span>
            <h2>{name}</h2>
            <p className="battle-muted">
              {(stats?.team ?? entity?.team) === "TEAM_A"
                ? "Party member"
                : "Enemy"}
              {stats?.flags.dead ? " · Fallen" : ""}
            </p>
            {entity && (
              <>
                <div className="battle-inspector-resources">
                  <div>
                    <span>Health</span>
                    <strong>
                      {stats?.health}
                      <small> / {entity.maxHealth}</small>
                    </strong>
                  </div>
                  <div>
                    <span>Mana</span>
                    <strong>
                      {stats?.mana}
                      <small> / {entity.maxMana}</small>
                    </strong>
                  </div>
                  {session?.tactical && (
                    <div>
                      <span>Movement</span>
                      <strong>
                        {session.battleState?.actors?.find(
                          (actor) => actor.id === entity.id,
                        )?.movement ?? 3}
                        <small> tiles / activation</small>
                      </strong>
                    </div>
                  )}
                </div>
                {session && (
                  <BattleCombatStats entity={entity} session={session} />
                )}
                <h3>
                  Conditions <span>{active.length}</span>
                </h3>
                {!active.length && (
                  <p className="battle-muted">No active effects.</p>
                )}
                {active.map(({ detail, count }) => (
                  <div
                    className="battle-effect"
                    data-tone={detail.tone}
                    key={detail.id}
                  >
                    <div className="battle-effect-heading">
                      <SkillIcon type={detail.iconType} size={28} eager />
                      <div>
                        <strong>
                          {detail.name}
                          {count > 1 ? ` ×${count}` : ""}
                        </strong>
                        <span>{detail.category}</span>
                      </div>
                    </div>
                    <p>{detail.description}</p>
                  </div>
                ))}
                <h3>
                  Spellbook <span>↗</span>
                </h3>
                {entity.spells.map((spell) => {
                  const cooldown = stats?.cooldowns.get(spell.config.id) ?? 0;
                  return (
                    <details
                      key={spell.config.id}
                      onToggle={(event) => {
                        if (event.currentTarget.open)
                          session?.getSpellDescription(spell.config.id);
                      }}
                    >
                      <summary>
                        <SkillIcon type={spell.config.type} size={24} />
                        <strong>{spell.config.name}</strong>
                        {cooldown > 0 ? <span>{cooldown} cd</span> : null}
                      </summary>
                      <p>
                        {spell.config.manaCost} mana · {spell.config.cooldown}
                        -turn cooldown
                      </p>
                      <p>
                        {session?.spellDescription.get(spell.config.id)?.text ??
                          descriptions?.get(spell.config.id)?.text ??
                          "Description not available."}
                      </p>
                    </details>
                  );
                })}
              </>
            )}
            <div className="battle-legend">
              <span>◆ Active turn</span>
              <span>◇ Legal target</span>
              <span>◎ Selected target</span>
              <span>✕ Fallen</span>
            </div>
            <p className="battle-inspector-note">
              Inspecting is separate from targeting. Tab and Enter operate every
              control.
            </p>
            <p className="battle-model-note">
              Miniatures by KayKit, Quaternius, Mesh2Motion, Tennessippi and
              this project.
            </p>
          </section>
        )}
      </div>
      {section === "details" && latest && (
        <button
          className="battle-history-peek"
          onClick={() => setSection("history")}
        >
          <span className="battle-eyebrow">Latest action ↗</span>
          <strong>
            {latest.caster ? `${latest.caster} · ` : ""}
            {latest.label}
          </strong>
          <small>{latest.results[0]}</small>
        </button>
      )}
    </aside>
  );
}
