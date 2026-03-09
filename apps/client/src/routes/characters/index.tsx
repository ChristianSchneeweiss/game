import { Button } from "@/components/ui/button";
import {
  RpgBadge,
  RpgEmptyState,
  RpgHero,
  RpgInset,
  RpgPage,
  RpgPanel,
  RpgSectionHeading,
  RpgStatTile,
} from "@/components/rpg-ui";
import { useCharacterContract } from "@/hooks/use-character-contract";
import { queryClient, trpc } from "@/utils/trpc";
import { userStore } from "@/utils/user-store";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Heart,
  PlusIcon,
  ScrollText,
  Shield,
  Sparkles,
  Swords,
  Zap,
} from "lucide-react";
import { usePublicClient } from "wagmi";

export const Route = createFileRoute("/characters/")({
  component: CharactersComponent,
});

function CharactersComponent() {
  const { user } = userStore();
  const contract = useCharacterContract();
  const publicClient = usePublicClient();

  const { mutateAsync: createCharacter, isPending: isCreatingCharacter } =
    useMutation(
      trpc.character.createCharacter.mutationOptions({
        onSuccess: async () => {
          if (!contract) throw new Error("Contract not found");
          if (!publicClient) throw new Error("Public client not found");

          const tx = await contract.write.mintCharacter();
          await publicClient.waitForTransactionReceipt({
            hash: tx,
          });

          await queryClient.invalidateQueries(
            trpc.character.getCharacters.queryOptions(),
          );
        },
      }),
    );



  const { data: characters, isLoading } = useQuery(
    trpc.character.getCharacters.queryOptions(undefined, {
      enabled: !!user,
      staleTime: 60_000,
    }),
  );

  const ensureCharacterDetail = (id: string) => {
    queryClient.ensureQueryData(
      trpc.character.getCharacter.queryOptions(
        { id },
        {
          staleTime: 60_000,
        },
      ),
    );
  };

  const characterCount = characters?.length ?? 0;
  const hasCharacters = characterCount > 0;
  const showRosterPanel = !isLoading && !hasCharacters;

  return (
    <RpgPage>
      <div className="space-y-8">
        {showRosterPanel && <RpgHero
          eyebrow="Character roster"
          title={
            <>
              Shape the party
              <br />
              before the dungeon does
            </>
          }
          description="Inspect the roster, forge new entries, and keep every adventurer readable at a glance. This page should feel like a living party ledger, not a web dashboard."
          aside={
            showRosterPanel ? (
              <RpgInset variant="parchment" className="p-5">
                <p className="rpg-title text-[0.62rem] text-[#cfbf97]/75">
                  Character roster
                </p>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <RpgStatTile label="Characters" value={characterCount} />
                  <RpgStatTile
                    label="Status"
                    value={isLoading ? "Syncing" : "Ready"}
                  />
                </div>
                <Button
                  size="lg"
                  variant="relic"
                  disabled={isCreatingCharacter}
                  className="mt-5 w-full"
                  onClick={async () => {
                    await createCharacter();
                  }}
                >
                  <PlusIcon className="h-4 w-4" />
                  {isCreatingCharacter ? "Forging..." : "Create character"}
                </Button>
              </RpgInset>
            ) : hasCharacters ? (
              <RpgInset
                variant="stone"
                className="ml-auto w-fit min-w-52 px-4 py-3 lg:mt-0 lg:self-start"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="rpg-title text-[0.55rem] text-[#cfbf97]/70">
                      Roster pulse
                    </p>
                    <p className="mt-1 text-lg font-semibold text-[#f1e8d4]">
                      {characterCount} active
                    </p>
                  </div>
                  <RpgBadge className="px-2.5 py-1 text-[0.58rem]">
                    {isLoading ? "Syncing" : "Ready"}
                  </RpgBadge>
                </div>
              </RpgInset>
            ) : null
          }
        />}

        {isLoading ? (
          <section className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <RpgPanel key={index} className="p-6">
                <div className="rpg-panel-content">
                  <div className="h-6 w-32 rounded-full bg-[#4c4335]" />
                  <div className="mt-6 grid grid-cols-2 gap-3">
                    <div className="h-20 rounded-2xl bg-[#403628]" />
                    <div className="h-20 rounded-2xl bg-[#403628]" />
                  </div>
                  <div className="mt-6 h-28 rounded-2xl bg-[#403628]" />
                  <div className="mt-6 h-10 rounded-[0.9rem] bg-[#4c4335]" />
                </div>
              </RpgPanel>
            ))}
          </section>
        ) : null}

        {characters && characters.length > 0 ? (
          <section>
            <RpgSectionHeading
              icon={<Swords className="h-5 w-5" />}
              eyebrow="Ready roster"
              title="Your characters"
            />
            <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
              {characters.map((character) => (
                <RpgPanel
                  onMouseEnter={() => ensureCharacterDetail(character.id)}
                  key={character.id}
                  className="group p-6 transition-all duration-200 hover:border-[#b89656]/55"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="rpg-icon-frame h-14 w-14 text-[#ead7aa]">
                        <Shield className="h-6 w-6" />
                      </div>
                      <div>
                        <p className="rpg-title text-[0.58rem] text-[#cfbf97]/70">
                          Adventurer dossier
                        </p>
                        <Link
                          className="inline-block"
                          to="/characters/$character-id"
                          params={{ "character-id": character.id }}
                        >
                          <h3 className="rpg-heading mt-2 text-3xl leading-none font-semibold uppercase tracking-[0.05em] transition-colors duration-200 group-hover:text-[#f2dfb5]">
                            {character.name}
                          </h3>
                        </Link>
                      </div>
                    </div>
                    <RpgBadge>Lv {character.level}</RpgBadge>
                  </div>

                  <div className="mt-6 grid grid-cols-2 gap-3">
                    <RpgStatTile
                      label="Health"
                      value={character.health}
                      icon={<Heart className="h-4 w-4" />}
                    />
                    <RpgStatTile
                      label="Mana"
                      value={character.mana}
                      icon={<Zap className="h-4 w-4" />}
                    />
                  </div>

                  <RpgInset variant="parchment" className="mt-5 p-4">
                    <div className="mb-3 flex items-center gap-2 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-[#b6ab92]">
                      <Shield className="h-4 w-4" />
                      Core attributes
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        "intelligence",
                        "vitality",
                        "agility",
                        "strength",
                      ].map((attr) => (
                        <RpgInset
                          key={attr}
                          variant="stone"
                          className="px-3 py-2.5"
                        >
                          <p className="text-[0.7rem] uppercase tracking-[0.16em] text-[#ac9f85]">
                            {attr}
                          </p>
                          <p className="mt-1 text-lg font-semibold text-[#f1e8d4]">
                            {
                              character.baseAttributes[
                                attr as keyof typeof character.baseAttributes
                              ]
                            }
                          </p>
                        </RpgInset>
                      ))}
                    </div>
                  </RpgInset>

                  <RpgInset variant="parchment" className="mt-5 p-4">
                    <div className="mb-3 flex items-center gap-2 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-[#b6ab92]">
                      <Sparkles className="h-4 w-4" />
                      Equipped spells
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {character.spells.slice(0, 4).map((spell) => (
                        <RpgBadge
                          key={`equipped-${spell.config.id}`}
                          className="border-[#6b3fa0]/35 bg-[#6b3fa0]/12 text-[#ceb2ea]"
                        >
                          <Sparkles className="h-3 w-3" />
                          {spell.config.name}
                        </RpgBadge>
                      ))}
                      {character.spells.length === 0 ? (
                        <span className="text-sm text-[#ac9f85]">
                          No spells equipped.
                        </span>
                      ) : null}
                      {character.spells.length > 4 ? (
                        <RpgBadge className="border-[#8a7753]/36 bg-[#251f18]/92 text-[#dbcaa6]">
                          +{character.spells.length - 4} more
                        </RpgBadge>
                      ) : null}
                    </div>
                  </RpgInset>

                  <Button asChild variant="outline" className="mt-5 w-full">
                    <Link
                      to="/characters/$character-id"
                      params={{ "character-id": character.id }}
                    >
                      Open character
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </RpgPanel>
              ))}
            </div>
          </section>
        ) : null}

        {characters && characters.length === 0 && !isLoading ? (
          <RpgEmptyState
            icon={<Shield className="h-8 w-8" />}
            title="Your roster is empty"
            copy="Forge the first character now and start shaping a party that can survive the dungeon's attrition loop."
            action={
              <div className="flex flex-wrap items-center justify-center gap-3">
                <Button
                  size="lg"
                  variant="relic"
                  disabled={isCreatingCharacter}
                  onClick={async () => {
                    await createCharacter();
                  }}
                >
                  <PlusIcon className="h-4 w-4" />
                  {isCreatingCharacter ? "Forging..." : "Create first character"}
                </Button>
                <RpgBadge>
                  <ScrollText className="h-4 w-4" />
                  Party building starts here
                </RpgBadge>
              </div>
            }
          />
        ) : null}
      </div>
    </RpgPage>
  );
}
