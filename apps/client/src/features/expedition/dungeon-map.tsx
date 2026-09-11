import { Check, Crown, Swords } from "lucide-react";
import { runPhase, waveName, type DungeonRunData } from "./run-info";
import { encounterDisplay } from "./route-display";

const stageX = (wave: number, count: number) =>
  80 + (wave / Math.max(1, count - 1)) * 840;
const forkY = (index: number, count: number) =>
  count === 1 ? 180 : 60 + (index * 240) / (count - 1);
const position = (x: number, y: number) => ({
  left: `${x / 10}%`,
  top: `${y / 3.8}%`,
});

export function DungeonMap({
  run,
  preview,
  onPreview,
}: {
  run: DungeonRunData;
  preview: string | undefined;
  onPreview: (offerId: string) => void;
}) {
  const total = run.actualEnemies.length;
  const pending = runPhase(run) === "choice";
  const forks = run.route?.forks ?? [];
  const decisions = new Map(
    run.route?.decisions.map((decision) => [decision.wave, decision.offerId]),
  );
  const chosen = decisions.get(run.round);
  const current = Math.min(
    total - 1,
    Math.max(0, pending ? run.round - 1 : run.round),
  );
  const currentFork = forks.find((fork) => fork.wave === run.round);
  const atFork = chosen && currentFork && !run.activeBattle && !run.cleared;
  const partyX = atFork
    ? (stageX(run.round - 1, total) + stageX(run.round, total)) / 2
    : stageX(current, total);
  const partyY = atFork
    ? forkY(
        currentFork.offers.findIndex((offer) => offer.id === chosen),
        currentFork.offers.length,
      )
    : 180;
  return (
    <section className="expedition-map" aria-label="Dungeon route map">
      <div className="expedition-map-heading">
        <div>
          <small>Cartographer's journal</small>
          <h2>A path of your own.</h2>
        </div>
        <span>
          {run.round} / {total} encounters cleared
        </span>
      </div>
      <div
        className="expedition-map-scroll"
        tabIndex={0}
        aria-label="Scrollable dungeon map"
      >
        <div
          className="expedition-map-canvas"
          style={{ minWidth: Math.max(680, total * 200) }}
        >
          <svg
            viewBox="0 0 1000 380"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <path
              className="expedition-map-contour"
              d="M0 120 Q100 20 250 110 T550 110 T1000 80 M0 335 Q190 210 330 335 T700 340 T1000 305 M0 345 Q190 220 330 345 T700 350 T1000 315"
            />
            {forks.flatMap(({ wave, offers }) => {
              const left = stageX(wave - 1, total);
              const right = stageX(wave, total);
              const mid = (left + right) / 2;
              const selected = decisions.get(wave);
              return offers.map((offer, index) => {
                const y = forkY(index, offers.length);
                return (
                  <path
                    key={offer.id}
                    className="expedition-map-road"
                    data-selected={selected === offer.id}
                    data-preview={
                      pending && wave === run.round && preview === offer.id
                    }
                    data-passed={
                      wave <= run.round &&
                      Boolean(selected) &&
                      selected !== offer.id
                    }
                    d={`M${left} 180 C${left + 35} 180 ${mid - 35} ${y} ${mid} ${y} S${right - 35} 180 ${right} 180`}
                  />
                );
              });
            })}
          </svg>
          {run.actualEnemies.map((_, wave) => {
            const complete = wave < run.round;
            const Icon = complete ? Check : wave === total - 1 ? Crown : Swords;
            return (
              <div
                key={waveName(run.key, wave)}
                className="expedition-map-stage"
                data-state={
                  complete
                    ? "complete"
                    : wave === run.round
                      ? "current"
                      : "ahead"
                }
                style={position(stageX(wave, total), 180)}
                aria-current={wave === run.round ? "step" : undefined}
              >
                <span>
                  <Icon size={21} />
                </span>
                <strong>{waveName(run.key, wave)}</strong>
                <small>{complete ? "Cleared" : `Encounter ${wave + 1}`}</small>
              </div>
            );
          })}
          {forks.flatMap(({ wave, offers }) => {
            const selected = decisions.get(wave);
            const available = pending && wave === run.round;
            return offers.map((offer, index) => {
              const { icon: Icon, short } =
                encounterDisplay[offer.encounter.kind];
              return (
                <button
                  key={offer.id}
                  className="expedition-map-fork"
                  type="button"
                  data-rarity={offer.encounter.rarity}
                  data-selected={selected === offer.id}
                  data-available={available}
                  style={position(
                    (stageX(wave - 1, total) + stageX(wave, total)) / 2,
                    forkY(index, offers.length),
                  )}
                  aria-label={`${offer.encounter.name} before ${waveName(run.key, wave)}${selected === offer.id ? ", chosen" : ""}`}
                  aria-pressed={
                    available ? preview === offer.id : selected === offer.id
                  }
                  disabled={!available}
                  onClick={() => onPreview(offer.id)}
                >
                  <Icon size={18} />
                  <span>{short}</span>
                  <small>{offer.encounter.rarity}</small>
                </button>
              );
            });
          })}
          <div
            className="expedition-map-party"
            style={position(partyX, partyY - 44)}
            aria-label={`Party: ${run.playerTeam.map((hero) => hero.name).join(" and ")}`}
          >
            {run.playerTeam.map((hero) => (
              <span key={hero.id} data-fallen={hero.health <= 0}>
                {hero.name[0]}
              </span>
            ))}
          </div>
          <span className="expedition-map-compass" aria-hidden="true">
            N<br />✧
          </span>
        </div>
      </div>
      <p className="expedition-map-key">
        {pending
          ? "Inspect a path on the map, then choose below. Only one path can be taken at each fork."
          : run.cleared
            ? "A journey written in your choices."
            : "Paths are discovered at the start of each run. Rare encounters are harder to find."}
      </p>
    </section>
  );
}
