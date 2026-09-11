import { Link } from "@tanstack/react-router";
import {
  prepSearch,
  readable,
  runPhase,
  waveName,
  type DungeonRunData,
} from "./run-info";

type Props = {
  run: DungeonRunData;
  onFight: () => void;
  pending: boolean;
  error?: string;
};
export function RunDeparture({ run, onFight, pending, error }: Props) {
  const phase = runPhase(run);
  const ended = phase === "cleared" || phase === "fallen";
  const enemies = run.actualEnemies[run.round] ?? [];
  return (
    <aside className="expedition-departure">
      <small>{ended ? "The next chapter" : "Beyond this clearing"}</small>
      <h2>
        {ended ? "Return with a new plan." : waveName(run.key, run.round)}
      </h2>
      {!ended && (
        <ul className="expedition-enemies">
          {enemies.map((enemy) => (
            <li key={enemy.id}>
              <strong>{readable(enemy.type)}</strong>
              <span>
                {enemy.health} HP · {enemy.mana} MP
              </span>
            </li>
          ))}
        </ul>
      )}
      <RunAction run={run} onFight={onFight} pending={pending} />
      {error && (
        <p role="alert" className="expedition-error">
          {error}
        </p>
      )}
      <p className="expedition-muted">
        {ended
          ? "Collected spells and equipment are ready to equip during preparation."
          : "Health and mana carry into the next wave. Progress is saved after each battle."}
      </p>
    </aside>
  );
}
function RunAction({ run, onFight, pending }: Omit<Props, "error">) {
  const phase = runPhase(run);
  if (phase === "battle" && run.activeBattleId)
    return (
      <Link
        className="expedition-button"
        to="/battle/$id"
        params={{ id: run.activeBattleId }}
      >
        Resume battle →
      </Link>
    );
  if (phase === "cleared" || phase === "fallen")
    return (
      <Link
        className="expedition-button"
        to="/dungeons/prepare"
        search={prepSearch(
          run.playerTeam.map((hero) => hero.id),
          run.key,
        )}
      >
        Adjust build & start again →
      </Link>
    );
  return (
    <button
      className="expedition-button"
      disabled={pending || phase !== "ready"}
      onClick={onFight}
    >
      {pending ? "Entering the clearing…" : `Fight wave ${run.round + 1} →`}
    </button>
  );
}
