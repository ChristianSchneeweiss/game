import { queryClient, trpc } from "@/utils/trpc";
import { DungeonKeySchema } from "@loot-game/game/dungeons/dungeon-keys";
import {
  useIsMutating,
  useMutation,
  useSuspenseQueries,
} from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { PartyCard, WaveTrail } from "@/features/expedition/run-ui";
import { nature, prepSearch } from "@/features/expedition/run-info";
import { SpellLoadout } from "@/features/expedition/spell-loadout";
import { emptySpellSlots } from "@/features/expedition/spell-slot-info";
import { PartyReadiness } from "@/features/expedition/party-readiness";
import { EquipmentLoadout } from "@/features/expedition/equipment-loadout";
import { equipmentBuildPreview } from "@loot-game/game/items/equipment/build-preview";
import { CreateSharedPreparation } from "@/features/social/preparation-actions";

export const Route = createFileRoute("/dungeons/prepare")({
  validateSearch: (search: Record<string, unknown>) => ({
    key: DungeonKeySchema.catch("trial-of-the-nature").parse(search.key),
    party: Array.isArray(search.party)
      ? search.party.filter((id): id is string => typeof id === "string")
      : undefined,
  }),
  component: PrepareRun,
});
function PrepareRun() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const [{ data: characters }, { data: config }] = useSuspenseQueries({
    queries: [
      trpc.character.getCharacters.queryOptions(),
      trpc.dungeon.getConfig.queryOptions({ key: search.key }),
    ],
  });
  const equipping = useIsMutating({
    mutationKey: trpc.character.equipSpell.mutationKey(),
  });
  const unequipping = useIsMutating({
    mutationKey: trpc.character.unequipSpell.mutationKey(),
  });
  const equippingGear = useIsMutating({
    mutationKey: trpc.character.equipEquipment.mutationKey(),
  });
  const unequippingGear = useIsMutating({
    mutationKey: trpc.character.unequipEquipment.mutationKey(),
  });
  const updatingBuild =
    equipping + unequipping + equippingGear + unequippingGear > 0;
  const [editingId, setEditingId] = useState<string>();
  const [buildTab, setBuildTab] = useState<"equipment" | "spells">("equipment");
  const partyIds =
    search.party ??
    characters
      .toSorted((a, b) => b.level - a.level)
      .slice(0, config.maxPartySize)
      .map((c) => c.id);
  const selectedIds = new Set(partyIds);
  const party = characters.filter((character) => selectedIds.has(character.id));
  const editing =
    party.find((character) => character.id === editingId) ?? party[0];
  const unfilledPartySlots = Math.max(0, config.maxPartySize - party.length);
  const enter = useMutation(
    trpc.dungeon.enterDungeon.mutationOptions({
      onSuccess: async (run) => {
        await queryClient.invalidateQueries({
          queryKey: trpc.dungeon.allDungeons.queryKey(),
        });
        await navigate({ to: "/dungeons/$id", params: { id: run.id } });
      },
    }),
  );
  function toggle(id: string) {
    const next = partyIds.includes(id)
      ? partyIds.filter((value) => value !== id)
      : partyIds.length < config.maxPartySize
        ? [...partyIds, id]
        : [...partyIds.slice(0, -1), id];
    void navigate({
      to: "/dungeons/prepare",
      search: prepSearch(next, search.key),
      replace: true,
    });
  }
  return (
    <main className="expedition">
      <div className="expedition-shell">
        <Link className="expedition-back" to="/dungeons">
          ← All expeditions
        </Link>
        <header className="expedition-title">
          <div>
            <p className="expedition-eyebrow">
              Field guide / Prepare your expedition
            </p>
            <h1>{config.name}</h1>
            <p>
              {search.key === nature.key
                ? "Beyond the mossgate, the old forest stirs. Choose the two who will answer it."
                : config.description}
            </p>
          </div>
          <span className="expedition-seal" aria-hidden="true">
            {config.availableEnemies.length}
            <small>WAVES</small>
          </span>
        </header>
        <WaveTrail dungeonKey={search.key} waves={config.availableEnemies} />
        <p className="expedition-muted">
          Between encounters, choose from paths discovered for this expedition.
          Find shrines, challenge elites, or seek treasure. Rare rooms appear
          less often; each new run brings a different map.
        </p>
        <div className="expedition-layout">
          <section>
            <div className="expedition-section-heading">
              <div>
                <small>01 / Assemble</small>
                <h2>Choose your party</h2>
              </div>
              <span
                className="expedition-slot-status"
                data-empty={unfilledPartySlots > 0}
              >
                {party.length}/{config.maxPartySize} in party
                {unfilledPartySlots > 0
                  ? ` · ${unfilledPartySlots} empty`
                  : " · Full"}
              </span>
            </div>
            <p className="expedition-muted">
              Health and mana carry between waves. A new expedition starts with
              recovered resources.
              {search.key === nature.key ? " Recommended: level 5–6." : ""}
            </p>
            {characters.length === 0 ? (
              <p>
                Create a character in <Link to="/characters">your roster</Link>{" "}
                to begin.
              </p>
            ) : (
              <div className="expedition-roster">
                {characters
                  .toSorted((a, b) => b.level - a.level)
                  .map((character) => (
                    <PartyCard
                      key={character.id}
                      character={character}
                      selected={selectedIds.has(character.id)}
                      onSelect={() => toggle(character.id)}
                    />
                  ))}
              </div>
            )}
          </section>
          <aside className="expedition-prep-side">
            <div className="expedition-departure">
              <small>When you're ready</small>
              <h2>Begin the expedition.</h2>
              {search.key === nature.key && (
                <p>
                  The Elder Treant drops an Iron Cuirass. Defeat the Oakwarden
                  to earn its staff and Nature’s Embrace for your next build.
                </p>
              )}
              <p>
                {party.length
                  ? party.map((character) => character.name).join(" & ")
                  : "Choose at least one adventurer."}
              </p>
              <PartyReadiness
                party={party}
                maxPartySize={config.maxPartySize}
              />
              <CreateSharedPreparation dungeonKey={search.key} />
              <button
                className="expedition-button"
                disabled={
                  party.length === 0 || enter.isPending || updatingBuild
                }
                onClick={() =>
                  enter.mutate({
                    key: search.key,
                    branching: true,
                    characters: party.map((c) => c.id),
                  })
                }
              >
                {enter.isPending ? "Preparing your run…" : "Enter dungeon →"}
              </button>
              {enter.error && (
                <p className="expedition-error" role="alert">
                  {enter.error.message}
                </p>
              )}
            </div>
            {editing && (
              <>
                <div
                  className="expedition-tabs"
                  aria-label="Choose character to equip"
                >
                  {party.map((character) => (
                    <button
                      key={character.id}
                      aria-pressed={editing.id === character.id}
                      onClick={() => setEditingId(character.id)}
                    >
                      {character.name}
                      <span
                        className="expedition-tab-slots"
                        data-empty={emptySpellSlots(character) > 0}
                      >
                        {emptySpellSlots(character) > 0
                          ? `${emptySpellSlots(character)} empty`
                          : "✓ Full"}
                      </span>
                    </button>
                  ))}
                </div>
                <div
                  className="expedition-build-tabs"
                  aria-label="Build section"
                >
                  <button
                    aria-pressed={buildTab === "equipment"}
                    onClick={() => setBuildTab("equipment")}
                  >
                    Gear & appearance
                  </button>
                  <button
                    aria-pressed={buildTab === "spells"}
                    onClick={() => setBuildTab("spells")}
                  >
                    Spell loadout
                  </button>
                </div>
                {buildTab === "equipment" ? (
                  <EquipmentLoadout
                    key={editing.id}
                    character={editing}
                    party={party}
                  />
                ) : (
                  <SpellLoadout
                    key={editing.id}
                    character={equipmentBuildPreview(editing)}
                  />
                )}
              </>
            )}
          </aside>
        </div>
      </div>
    </main>
  );
}
