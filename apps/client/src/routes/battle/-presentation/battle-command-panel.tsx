import { Button } from "@/components/ui/button";
import { ItemIcon } from "@/components/item-icon";
import type { BattleSession } from "../-hooks/use-battle";
import type { Stats } from "./timeline";
import { SkillIcon } from "../../../components/skill-icon";
import { TacticalActions } from "./tactical-board";
import "./battle-command-dock.css";

export function BattleCommandPanel({
  session,
  stats,
  status,
  targetNames,
  compact = false,
}: {
  session: BattleSession;
  stats: Map<string, Stats>;
  status: string;
  targetNames: string;
  compact?: boolean;
}) {
  const actor = session.activeEntity;
  const spells = actor?.spells ?? [];
  const selected = spells.find(
    (spell) => spell.config.id === session.activeSpell,
  );
  const description =
    selected && session.spellDescription.get(selected.config.id);
  const spellText = description?.text ?? "Loading spell details…";
  const mana = actor ? (stats.get(actor.id)?.mana ?? actor.mana) : 0;
  return (
    <div className="battle-command-panel" data-compact={compact || undefined}>
      {session.tactical && <TacticalActions session={session} />}
      <div className="battle-command-title">
        <span className="battle-eyebrow">
          {actor?.name ?? "Waiting for battle"}
        </span>
        <span role="status">{status}</span>
      </div>
      <div className="battle-spell-list" aria-label="Choose a spell">
        {spells.map((spell) => {
          const cooldown = actor
            ? (stats.get(actor.id)?.cooldowns.get(spell.config.id) ?? 0)
            : 0;
          const randomTarget =
            !session.tactical &&
            (spell.config.type === "storm-pulse" ||
              spell.config.type === "volt-lash");
          const unavailable =
            randomTarget ||
            !session.battleState?.availableSpells.includes(spell.config.id);
          return (
            <Button
              variant="outline"
              key={spell.config.id}
              disabled={!session.canChoose || unavailable}
              aria-pressed={session.activeSpell === spell.config.id}
              onFocus={() => session.getSpellDescription(spell.config.id)}
              onClick={() => session.getTargets(spell.config.id)}
            >
              <SkillIcon
                type={spell.config.type}
                size={compact ? 32 : 40}
                eager
              />
              <span className="battle-spell-text">
                <strong>{spell.config.name}</strong>
                <small>
                  {spell.config.manaCost} mana ·{" "}
                  {randomTarget
                    ? "Use Cards"
                    : cooldown > 0
                      ? `${cooldown} turn${cooldown === 1 ? "" : "s"}`
                      : mana < spell.config.manaCost
                        ? "Low mana"
                        : "Ready"}
                </small>
              </span>
            </Button>
          );
        })}
      </div>
      {session.tactical && !!session.battleState?.consumables?.length && (
        <div className="battle-spell-list" aria-label="Equipped consumables">
          {session.battleState.consumables.map((item) => (
            <Button
              key={item.slot}
              variant="outline"
              disabled={!session.canChoose || !item.available}
              onClick={() => session.tactical?.useConsumable(item.slot)}
            >
              <ItemIcon type={item.type} />
              <span className="battle-spell-text">
                <strong>
                  {item.name} ×{item.quantity}
                </strong>
                <small>
                  {item.quantity === 0
                    ? "Used"
                    : !item.available
                      ? `Full ${item.restoration.resource}`
                      : `Restore ${item.restoration.amount} ${item.restoration.resource} · Uses action`}
                </small>
              </span>
            </Button>
          ))}
        </div>
      )}
      <div className="battle-cast-row">
        <div className="battle-prepared-action">
          <div className="battle-prepared-heading">
            <span className="battle-eyebrow">Prepared action</span>
            <span className="battle-current-mana">{mana} mana available</span>
          </div>
          {selected ? (
            <>
              <div className="battle-prepared-name">
                <strong>{selected.config.name}</strong>
                {!compact && (
                  <span>
                    {selected.config.manaCost} mana · {selected.config.cooldown}
                    -turn cooldown
                  </span>
                )}
              </div>
              <p className="battle-prepared-targets">
                <span>
                  {selected.config.type === "storm-pulse" ||
                  selected.config.type === "volt-lash"
                    ? "Possible recipients"
                    : "Target"}
                </span>{" "}
                {targetNames ||
                  (session.validTargets
                    ? "Choose a legal target"
                    : "Requesting legal targets…")}
              </p>
              {compact ? (
                <>
                  <div
                    className="battle-spell-reading"
                    role="region"
                    aria-label="Prepared spell description"
                    tabIndex={0}
                  >
                    <p className="battle-spell-cost">
                      {selected.config.manaCost} mana ·{" "}
                      {selected.config.cooldown}-turn cooldown
                    </p>
                    <div className="battle-prepared-copy">{spellText}</div>
                  </div>
                  <details
                    className="battle-spell-details"
                    key={selected.config.id}
                  >
                    <summary>
                      Spell details · {selected.config.manaCost} mana ·{" "}
                      {selected.config.cooldown}-turn cooldown
                    </summary>
                    <div className="battle-prepared-copy">{spellText}</div>
                  </details>
                </>
              ) : (
                <div
                  className="battle-prepared-copy"
                  role="region"
                  aria-label="Prepared spell description"
                  tabIndex={0}
                >
                  {spellText}
                </div>
              )}
            </>
          ) : (
            <p className="battle-prepare-hint">
              {compact
                ? "Choose a spell to see its reach on the battlefield."
                : "Choose a skill, review its effect and targets, then Cast."}
            </p>
          )}
        </div>
        <div className="battle-commit-buttons">
          <Button
            variant="default"
            className="battle-cast-button"
            onClick={session.castSpell}
            disabled={!session.canCast}
            aria-busy={session.pending}
          >
            {session.pending ? "Casting…" : "Cast"}
          </Button>
          <Button
            variant="outline"
            onClick={session.cancelSpell}
            disabled={!session.activeSpell || session.pending}
          >
            Cancel
          </Button>
        </div>
      </div>
      {session.error && (
        <p
          role="alert"
          className="battle-command-error"
          tabIndex={compact ? 0 : undefined}
        >
          {session.error}
        </p>
      )}
    </div>
  );
}
