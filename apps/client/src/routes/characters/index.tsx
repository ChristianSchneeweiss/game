import { Button } from "@/components/ui/button";
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
            hash: tx
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

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(251,191,36,0.12),transparent_22%),radial-gradient(circle_at_80%_18%,rgba(96,165,250,0.12),transparent_18%),linear-gradient(180deg,#030712_0%,#0f172a_48%,#020617_100%)] px-6 py-8 text-stone-100">
      <div className="mx-auto max-w-7xl">
        <section className="relative overflow-hidden rounded-4xl border border-white/10 bg-black/25 p-8 shadow-[0_30px_120px_rgba(0,0,0,0.45)] backdrop-blur-xl sm:p-10">
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-[linear-gradient(rgba(248,250,252,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(248,250,252,0.04)_1px,transparent_1px)] bg-size-[64px_64px] opacity-20"
          />
          <div
            aria-hidden="true"
            className="absolute top-0 right-0 h-56 w-56 rounded-full bg-amber-300/10 blur-3xl"
          />

          <div className="relative grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-end">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-3 rounded-full border border-amber-300/20 bg-amber-300/10 px-4 py-2 text-[0.7rem] font-semibold tracking-[0.28em] text-amber-100/85 uppercase">
                <Shield className="h-3.5 w-3.5" />
                Character roster
              </div>
              <h1 className="mt-5 font-['Iowan_Old_Style','Palatino_Linotype','Book_Antiqua',Palatino,Georgia,serif] text-5xl leading-[0.92] font-semibold tracking-[-0.05em] text-stone-50 sm:text-6xl">
                Shape the party
                <br />
                before the dungeon does.
              </h1>
              <p className="mt-5 max-w-2xl font-['Avenir_Next','Segoe_UI',sans-serif] text-base leading-8 text-stone-300 sm:text-lg">
                Build out a sharper roster, inspect stats at a glance, and push
                each run with a crew that actually feels distinct.
              </p>
            </div>

            <div className="rounded-[1.75rem] border border-white/10 bg-white/5 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
              <p className="text-xs font-semibold tracking-[0.24em] text-stone-400 uppercase">
                Roster pulse
              </p>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-3xl border border-white/8 bg-black/20 p-4">
                  <p className="text-xs tracking-[0.2em] text-stone-500 uppercase">
                    Characters
                  </p>
                  <p className="mt-2 text-3xl font-semibold text-stone-50">
                    {characters?.length ?? 0}
                  </p>
                </div>
                <div className="rounded-3xl border border-white/8 bg-black/20 p-4">
                  <p className="text-xs tracking-[0.2em] text-stone-500 uppercase">
                    Status
                  </p>
                  <p className="mt-2 text-sm font-semibold tracking-[0.18em] text-amber-100 uppercase">
                    {isLoading ? "Syncing" : "Ready"}
                  </p>
                </div>
              </div>

              <Button
                size="lg"
                disabled={isCreatingCharacter}
                className="mt-5 h-12 w-full rounded-full border border-emerald-300/20 bg-emerald-400 px-6 text-sm font-semibold tracking-[0.18em] text-slate-950 uppercase shadow-[0_12px_40px_rgba(74,222,128,0.24)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-emerald-300 disabled:translate-y-0 disabled:opacity-70"
                onClick={async () => {
                  await createCharacter();
                }}
              >
                <PlusIcon className="h-4 w-4" />
                {isCreatingCharacter ? "Forging..." : "Create character"}
              </Button>
            </div>
          </div>
        </section>

        {isLoading && (
          <section className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                key={index}
                className="rounded-[1.75rem] border border-white/10 bg-white/4 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.35)]"
              >
                <div className="h-6 w-32 rounded-full bg-white/8" />
                <div className="mt-6 grid grid-cols-2 gap-3">
                  <div className="h-20 rounded-3xl bg-white/6" />
                  <div className="h-20 rounded-3xl bg-white/6" />
                </div>
                <div className="mt-6 h-28 rounded-3xl bg-white/6" />
                <div className="mt-6 h-10 rounded-full bg-white/8" />
              </div>
            ))}
          </section>
        )}

        {characters && characters.length > 0 && (
          <section className="mt-8">
            <div className="mb-6 flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold tracking-[0.28em] text-blue-200/70 uppercase">
                  Ready roster
                </p>
                <h2 className="mt-2 flex items-center gap-3 text-2xl font-semibold tracking-[-0.04em] text-stone-50">
                  <Swords className="h-6 w-6 text-blue-200" />
                  Your Characters
                </h2>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
              {characters.map((character) => (
                <article
                  onMouseEnter={() => ensureCharacterDetail(character.id)}
                  key={character.id}
                  className="group relative overflow-hidden rounded-[1.75rem] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.96),rgba(2,6,23,0.98))] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.45)] transition-all duration-300 hover:-translate-y-1 hover:border-amber-300/18"
                >
                  <div
                    aria-hidden="true"
                    className="absolute inset-x-0 top-0 h-28 bg-[radial-gradient(circle_at_top,rgba(251,191,36,0.16),transparent_72%)] opacity-80"
                  />

                  <div className="relative">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <div className="flex h-14 w-14 items-center justify-center rounded-3xl border border-amber-300/15 bg-amber-300/10 text-2xl shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                          🧙‍♂️
                        </div>
                        <div>
                          <p className="text-[0.7rem] font-semibold tracking-[0.24em] text-amber-100/70 uppercase">
                            Adventurer dossier
                          </p>
                          <Link
                            className="inline-block"
                            to="/characters/$character-id"
                            params={{ "character-id": character.id }}
                          >
                            <h3 className="mt-1 font-['Iowan_Old_Style','Palatino_Linotype','Book_Antiqua',Palatino,Georgia,serif] text-3xl leading-none text-stone-50 transition-colors duration-300 group-hover:text-amber-100">
                              {character.name}
                            </h3>
                          </Link>
                        </div>
                      </div>

                      <div className="rounded-full border border-amber-300/20 bg-amber-300/12 px-3 py-1 text-xs font-semibold tracking-[0.22em] text-amber-100 uppercase">
                        Lv {character.level}
                      </div>
                    </div>

                    <div className="mt-6 grid grid-cols-2 gap-3">
                      <div className="rounded-3xl border border-red-300/10 bg-red-400/6 p-4">
                        <div className="flex items-center gap-2 text-xs font-semibold tracking-[0.18em] text-red-200/80 uppercase">
                          <Heart className="h-4 w-4" />
                          Health
                        </div>
                        <p className="mt-3 text-2xl font-semibold text-stone-50">
                          {character.health}
                        </p>
                      </div>
                      <div className="rounded-3xl border border-blue-300/10 bg-blue-400/6 p-4">
                        <div className="flex items-center gap-2 text-xs font-semibold tracking-[0.18em] text-blue-200/80 uppercase">
                          <Zap className="h-4 w-4" />
                          Mana
                        </div>
                        <p className="mt-3 text-2xl font-semibold text-stone-50">
                          {character.mana}
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 rounded-3xl border border-white/8 bg-white/4 p-4">
                      <div className="mb-3 flex items-center gap-2 text-xs font-semibold tracking-[0.22em] text-blue-200/80 uppercase">
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
                          <div
                            key={attr}
                            className="rounded-2xl border border-white/8 bg-black/20 px-3 py-2.5"
                          >
                            <p className="text-[0.7rem] tracking-[0.18em] text-stone-500 uppercase">
                              {attr}
                            </p>
                            <p className="mt-1 text-lg font-semibold text-stone-100">
                              {
                                character.baseAttributes[
                                  attr as keyof typeof character.baseAttributes
                                ]
                              }
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="mt-5 rounded-3xl border border-white/8 bg-white/4 p-4">
                      <div className="mb-3 flex items-center gap-2 text-xs font-semibold tracking-[0.22em] text-purple-200/80 uppercase">
                        <Sparkles className="h-4 w-4" />
                        Equipped spells
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {character.spells.slice(0, 4).map((spell) => (
                          <span
                            key={`equipped-${spell.config.id}`}
                            className="inline-flex items-center gap-2 rounded-full border border-purple-300/14 bg-purple-300/10 px-3 py-1.5 text-xs font-medium text-purple-100"
                          >
                            <Sparkles className="h-3 w-3" />
                            {spell.config.name}
                          </span>
                        ))}
                        {character.spells.length === 0 && (
                          <span className="text-sm text-stone-500">
                            No spells equipped.
                          </span>
                        )}
                        {character.spells.length > 4 && (
                          <span className="inline-flex items-center rounded-full border border-white/8 bg-black/20 px-3 py-1.5 text-xs font-medium text-stone-400">
                            +{character.spells.length - 4} more
                          </span>
                        )}
                      </div>
                    </div>

                    <Link
                      to="/characters/$character-id"
                      params={{ "character-id": character.id }}
                    >
                      <Button className="mt-5 h-11 w-full rounded-full border border-blue-300/16 bg-blue-400/14 text-sm font-semibold tracking-[0.18em] text-blue-100 uppercase transition-all duration-300 hover:bg-blue-400/20">
                        Open character
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        {characters && characters.length === 0 && !isLoading && (
          <section className="mt-8 rounded-4xl border border-dashed border-white/12 bg-white/4 px-6 py-16 text-center shadow-[0_20px_80px_rgba(0,0,0,0.28)]">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-amber-300/20 bg-amber-300/10 text-4xl shadow-[0_12px_40px_rgba(251,191,36,0.15)]">
              🧙‍♂️
            </div>
            <h3 className="mt-6 font-['Iowan_Old_Style','Palatino_Linotype','Book_Antiqua',Palatino,Georgia,serif] text-4xl leading-none text-stone-50">
              Your roster is empty.
            </h3>
            <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-stone-400">
              Forge the first character now and start shaping a party that can
              survive the dungeon’s attrition loop.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Button
                size="lg"
                disabled={isCreatingCharacter}
                className="h-12 rounded-full border border-emerald-300/20 bg-emerald-400 px-6 text-sm font-semibold tracking-[0.18em] text-slate-950 uppercase shadow-[0_12px_40px_rgba(74,222,128,0.24)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-emerald-300 disabled:translate-y-0 disabled:opacity-70"
                onClick={async () => {
                  await createCharacter();
                }}
              >
                <PlusIcon className="h-4 w-4" />
                {isCreatingCharacter ? "Forging..." : "Create first character"}
              </Button>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/8 bg-black/20 px-4 py-2 text-xs font-medium tracking-[0.18em] text-stone-400 uppercase">
                <ScrollText className="h-4 w-4" />
                Party building starts here
              </div>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
