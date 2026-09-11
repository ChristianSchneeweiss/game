import { Link } from "@tanstack/react-router";
import {
  prepSearch,
  resultCopy,
  type BattleContext,
  type BattleResultData,
  type DungeonRunData,
} from "./run-info";

export function ResultHeading({
  victory,
  context,
}: {
  victory: boolean;
  context?: BattleContext;
}) {
  const copy = resultCopy(victory, context);
  return (
    <header className="expedition-title">
      <div>
        <p className="expedition-eyebrow">{copy.eyebrow}</p>
        <h1>{copy.title}</h1>
        <p>{copy.description}</p>
      </div>
      <span
        className="expedition-seal"
        aria-label={victory ? "Victory" : "Defeat"}
      >
        {victory ? "✓" : "×"}
        <small>{victory ? "VICTORY" : "DEFEAT"}</small>
      </span>
    </header>
  );
}
export function ResultParty({
  data,
  context,
  pending,
}: {
  data: BattleResultData;
  context?: BattleContext;
  pending: boolean;
}) {
  const names = new Map(
    data.participants.map((entity) => [entity.id, entity.name]),
  );
  const awards = new Map(
    context?.xpAwards.map((award) => [award.characterId, award.xp]),
  );
  const saved = Boolean(context?.attempt.completedAt);
  return (
    <div className="expedition-result-party">
      {data.teamA.map((hero) => (
        <div className="expedition-result-hero" key={hero.id}>
          <div>
            <strong>{names.get(hero.id) ?? hero.id}</strong>
            <p>
              {hero.dead
                ? "Fallen"
                : `${Math.ceil(hero.health)} HP · ${Math.ceil(hero.mana)} MP remaining`}
            </p>
          </div>
          <span>
            {saved
              ? `+${awards.get(hero.id) ?? 0} XP`
              : pending
                ? "Saving XP…"
                : ""}
          </span>
        </div>
      ))}
    </div>
  );
}
export function ResultNextStep({
  run,
  saved,
  pending,
  victory,
}: {
  run?: DungeonRunData;
  saved: boolean;
  pending: boolean;
  victory: boolean;
}) {
  if (!run || !saved)
    return (
      <button className="expedition-button" disabled>
        {pending ? "Saving your expedition…" : "Expedition unavailable"}
      </button>
    );
  if (run.cleared || !victory)
    return (
      <Link
        className="expedition-button"
        to="/dungeons/prepare"
        search={prepSearch(
          run.playerTeam.map((hero) => hero.id),
          run.key,
        )}
      >
        Equip & run again →
      </Link>
    );
  return (
    <Link
      className="expedition-button"
      to="/dungeons/$id"
      params={{ id: run.id }}
    >
      Continue to wave {run.round + 1} →
    </Link>
  );
}
