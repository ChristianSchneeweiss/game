import {
  routeRecovery,
  routeRewards,
  routeRules,
  type RouteAction,
} from "@loot-game/game/dungeons/route";
import type { RouteOffer } from "@loot-game/game/dungeons/route-catalog";
import type { DungeonRunData } from "./run-info";
import { encounterDisplay, gearName } from "./route-display";

const descriptions = {
  battle:
    "Follow the familiar trail. Face the next encounter at its usual strength.",
  elite: `The next enemies gain ${Math.round((routeRules.eliteHealth - 1) * 100)}% health and ${Math.round((routeRules.eliteAttributes - 1) * 100)}% strength, intelligence and vitality.`,
  shrine: `Restore ${routeRules.healthRecovery * 100}% of maximum health or ${routeRules.manaRecovery * 100}% of maximum mana to each survivor, up to their maximum. Fallen allies stay fallen.`,
  treasure:
    "Take the visible treasure, or reach deeper for a better prize. The choice is final.",
  vault:
    "An ancient seal gives way. One piece of rare equipment awaits, with no cost to your party.",
};

type Props = {
  offer: RouteOffer;
  run: DungeonRunData;
  selected: boolean;
  disabled: boolean;
  onPreview: () => void;
  onChoose: (action: RouteAction) => void;
};
export function RouteOfferCard({
  offer,
  run,
  selected,
  disabled,
  onPreview,
  onChoose,
}: Props) {
  const { encounter } = offer;
  const { icon: Icon } = encounterDisplay[encounter.kind];
  const rewards = routeRewards(run.round);
  const living = run.playerTeam.filter((hero) => hero.health > 0);
  const recovery = living.map((hero) => ({
    name: hero.name,
    health: routeRecovery(
      hero.health,
      hero.maxHealth,
      routeRules.healthRecovery,
    ),
    mana: routeRecovery(hero.mana, hero.maxMana, routeRules.manaRecovery),
  }));
  const actions: Record<
    RouteAction,
    { label: string; detail: string; unavailable?: boolean }
  > = {
    continue: {
      label: "Follow the patrol",
      detail: "No recovery or extra reward.",
    },
    elite: {
      label: "Challenge the elite",
      detail: `On victory: ${routeRules.eliteRewardChance * 100}% chance of an extra ${gearName(rewards.rareReward)} (D grade) for each player.`,
    },
    "restore-health": {
      label: "Restore health",
      detail: recovery
        .map((hero) => `${hero.name} +${hero.health} HP`)
        .join(" · "),
      unavailable: recovery.every((hero) => hero.health === 0),
    },
    "restore-mana": {
      label: "Restore mana",
      detail: recovery
        .map((hero) => `${hero.name} +${hero.mana} MP`)
        .join(" · "),
      unavailable: recovery.every((hero) => hero.mana === 0),
    },
    "take-treasure": {
      label: "Take the safe treasure",
      detail: `${gearName(rewards.safeReward)} (E grade), guaranteed for each player.`,
    },
    "gamble-treasure": {
      label: "Risk the hidden cache",
      detail: `${routeRules.gambleChance * 100}% chance of ${gearName(rewards.rareReward)} (D grade); otherwise each survivor loses ${routeRules.trapHealthCost * 100}% of maximum HP, down to at least 1 HP.`,
    },
    "open-vault": {
      label: "Open the ancient vault",
      detail: `${gearName(rewards.rareReward)} (D grade), guaranteed for each player. This vault appears at most once per run.`,
    },
  };
  return (
    <article
      className="expedition-route-card"
      data-selected={selected}
      data-rarity={encounter.rarity}
      onFocusCapture={onPreview}
    >
      <button
        className="expedition-route-card-heading"
        type="button"
        onClick={onPreview}
        aria-pressed={selected}
        aria-label={`Inspect ${encounter.name}`}
      >
        <Icon size={25} />
        <div>
          <small className="expedition-route-rarity">
            {encounter.rarity} encounter
          </small>
          <h3>{encounter.name}</h3>
        </div>
      </button>
      <p>{descriptions[encounter.kind]}</p>
      <div className="expedition-route-actions">
        {encounter.actions.map((action) => (
          <div key={action}>
            <p>{actions[action].detail}</p>
            <button
              className="expedition-button"
              disabled={disabled || actions[action].unavailable}
              onClick={() => onChoose(action)}
            >
              {actions[action].unavailable
                ? action === "restore-health"
                  ? "Health already full"
                  : "Mana already full"
                : actions[action].label}
            </button>
          </div>
        ))}
      </div>
    </article>
  );
}
