import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { queryClient, trpc } from "@/utils/trpc";
import {
  type RouteAction,
  type RouteDecision,
} from "@loot-game/game/dungeons/route";
import { DungeonMap } from "./dungeon-map";
import { RouteOfferCard } from "./route-offer-card";
import { encounterDisplay, gearName } from "./route-display";
import { runPhase, waveName, type DungeonRunData } from "./run-info";
import "./route.css";

export function RoutePlanner({ run }: { run: DungeonRunData }) {
  const fork = run.route?.forks.find((entry) => entry.wave === run.round);
  const [preview, setPreview] = useState(fork?.offers[0]?.id);
  const pending = runPhase(run) === "choice";
  const decision = run.route?.decisions.find(
    (entry) => entry.wave === run.round,
  );
  const choose = useMutation(
    trpc.dungeon.choosePath.mutationOptions({
      onSettled: async () => {
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: trpc.dungeon.getRun.queryKey({ id: run.id }),
          }),
          queryClient.invalidateQueries({
            queryKey: trpc.dungeon.getBattleContext.queryKey(),
          }),
          queryClient.invalidateQueries({
            queryKey: trpc.getMyLoot.queryKey(),
          }),
        ]);
      },
    }),
  );
  function select(offerId: string, action: RouteAction) {
    choose.mutate({ id: run.id, wave: run.round, offerId, action });
  }
  return (
    <>
      <DungeonMap run={run} preview={preview} onPreview={setPreview} />
      {pending && fork && (
        <section
          className="expedition-route-choice"
          aria-label="Choose your next path"
          aria-busy={choose.isPending}
        >
          <div className="expedition-section-heading">
            <div>
              <small>
                Fork {run.round} / Before {waveName(run.key, run.round)}
              </small>
              <h2>Where will you lead them?</h2>
            </div>
            <span>Choose one path</span>
          </div>
          <div
            className="expedition-route-offers"
            data-count={fork.offers.length}
          >
            {fork.offers.map((offer) => (
              <RouteOfferCard
                key={offer.id}
                offer={offer}
                run={run}
                selected={preview === offer.id}
                onPreview={() => setPreview(offer.id)}
                disabled={choose.isPending}
                onChoose={(action) => select(offer.id, action)}
              />
            ))}
          </div>
          {choose.isPending && (
            <p role="status" className="expedition-muted">
              Taking the path…
            </p>
          )}
          {choose.error && (
            <p role="alert" className="expedition-error">
              {choose.error.message}
            </p>
          )}
        </section>
      )}
      {decision && !run.activeBattle && !run.cleared && (
        <RouteResolution run={run} decision={decision} />
      )}
    </>
  );
}

function RouteResolution({
  run,
  decision,
}: {
  run: DungeonRunData;
  decision: RouteDecision;
}) {
  const offer = run.route?.forks
    .find((fork) => fork.wave === decision.wave)
    ?.offers.find((offer) => offer.id === decision.offerId);
  if (!offer) return null;
  const { icon: Icon } = encounterDisplay[offer.encounter.kind];
  const description =
    decision.outcome === "elite"
      ? `The next encounter is stronger. Victory gives a ${(decision.eliteRewardChance ?? 1) * 100}% chance of an extra piece of gear.`
      : decision.outcome === "trap"
        ? "The cache was trapped. Your party lost health, but everyone who entered survived."
        : decision.outcome === "restored"
          ? "The shrine's blessing has been saved to your party."
          : decision.outcome === "treasure"
            ? "Your discoveries are waiting in Your spoils below."
            : "You follow the patrol's trail toward the next encounter.";
  return (
    <section className="expedition-route-resolution" role="status">
      <Icon size={25} />
      <div>
        <small>Path chosen / {offer.encounter.rarity}</small>
        <h3>{offer.encounter.name}</h3>
        <p>{description}</p>
        {decision.rewards.length > 0 && (
          <p className="expedition-route-gains">
            {decision.rewards.map(gearName).join(" + ")}
          </p>
        )}
        {decision.resources.length > 0 && (
          <ul>
            {decision.resources.map((change) => (
              <li key={change.characterId}>
                {
                  run.playerTeam.find((hero) => hero.id === change.characterId)
                    ?.name
                }
                :{" "}
                {change.health !== 0 &&
                  `${change.health > 0 ? "+" : ""}${change.health} HP`}
                {change.mana !== 0 &&
                  `${change.mana > 0 ? "+" : ""}${change.mana} MP`}
              </li>
            ))}
          </ul>
        )}
      </div>
      <span>Saved ✓</span>
    </section>
  );
}
