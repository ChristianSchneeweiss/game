import { Button } from "@/components/ui/button";
import { queryClient, trpc } from "@/utils/trpc";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
  BookOpen,
  PlusIcon,
  Shield,
  Sparkles,
  Star,
  WandSparkles,
  Zap,
} from "lucide-react";

export const Route = createFileRoute("/spells/")({
  component: RouteComponent,
});

function RouteComponent() {
  const { data: _spells, isLoading: isLoadingSpells } = useQuery(
    trpc.getMySpells.queryOptions(),
  );
  const spells = _spells?.grouped;

  const { data: _passiveSkills, isLoading: isLoadingPassives } = useQuery(
    trpc.getMyPassiveSkills.queryOptions(),
  );
  const passiveSkills = _passiveSkills?.grouped;

  const { mutateAsync: createSpell, isPending: isCreatingSpell } = useMutation(
    trpc.createSpell.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(trpc.getMySpells.queryOptions());
      },
    }),
  );

  const spellEntries = spells ? Array.from(spells.entries()) : [];
  const passiveEntries = passiveSkills
    ? Array.from(passiveSkills.entries())
    : [];
  const totalSpells = spellEntries.reduce(
    (total, [, { ids }]) => total + ids.length,
    0,
  );
  const totalPassives = passiveEntries.reduce(
    (total, [, { ids }]) => total + ids.length,
    0,
  );

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(192,132,252,0.16),transparent_22%),radial-gradient(circle_at_82%_16%,rgba(56,189,248,0.12),transparent_18%),linear-gradient(180deg,#030712_0%,#111827_46%,#020617_100%)] px-6 py-8 text-stone-100">
      <div className="mx-auto max-w-7xl">
        <section className="relative overflow-hidden rounded-4xl border border-white/10 bg-black/25 p-8 shadow-[0_30px_120px_rgba(0,0,0,0.45)] backdrop-blur-xl sm:p-10">
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-[linear-gradient(rgba(248,250,252,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(248,250,252,0.04)_1px,transparent_1px)] bg-size-[64px_64px] opacity-15"
          />
          <div
            aria-hidden="true"
            className="absolute top-0 right-0 h-56 w-56 rounded-full bg-purple-300/10 blur-3xl"
          />

          <div className="relative grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-end">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-3 rounded-full border border-purple-300/18 bg-purple-300/10 px-4 py-2 text-[0.7rem] font-semibold tracking-[0.28em] text-purple-100/85 uppercase">
                <WandSparkles className="h-3.5 w-3.5" />
                Arcane inventory
              </div>
              <h1 className="mt-5 font-['Iowan_Old_Style','Palatino_Linotype','Book_Antiqua',Palatino,Georgia,serif] text-5xl leading-[0.92] font-semibold tracking-[-0.05em] text-stone-50 sm:text-6xl">
                Stack the spellbook.
                <br />
                Shape the build.
              </h1>
              <p className="mt-5 max-w-2xl font-['Avenir_Next','Segoe_UI',sans-serif] text-base leading-8 text-stone-300 sm:text-lg">
                Your grimoire should read like a real loadout, not a dump of
                entries. Track spell stock, passive layers, and the tools that
                define each run.
              </p>
            </div>

            <div className="rounded-[1.75rem] border border-white/10 bg-white/5 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
              <p className="text-xs font-semibold tracking-[0.24em] text-stone-400 uppercase">
                Archive pulse
              </p>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-3xl border border-white/8 bg-black/20 p-4">
                  <p className="text-xs tracking-[0.2em] text-stone-500 uppercase">
                    Spells
                  </p>
                  <p className="mt-2 text-3xl font-semibold text-stone-50">
                    {totalSpells}
                  </p>
                </div>
                <div className="rounded-3xl border border-white/8 bg-black/20 p-4">
                  <p className="text-xs tracking-[0.2em] text-stone-500 uppercase">
                    Passives
                  </p>
                  <p className="mt-2 text-3xl font-semibold text-stone-50">
                    {totalPassives}
                  </p>
                </div>
              </div>

              <Button
                disabled={isCreatingSpell}
                className="mt-5 h-12 w-full rounded-full border border-purple-300/20 bg-purple-300 px-6 text-sm font-semibold tracking-[0.18em] text-slate-950 uppercase shadow-[0_12px_40px_rgba(192,132,252,0.28)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-purple-200 disabled:translate-y-0 disabled:opacity-70"
                onClick={async () => {
                  await createSpell();
                }}
              >
                <PlusIcon className="h-4 w-4" />
                {isCreatingSpell ? "Inscribing..." : "Create spells"}
              </Button>
            </div>
          </div>
        </section>

        <section className="mt-8">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-3xl border border-purple-300/15 bg-purple-300/10 text-purple-100">
              <Zap className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold tracking-[0.24em] text-purple-200/70 uppercase">
                Active arsenal
              </p>
              <h2 className="text-2xl font-semibold tracking-[-0.04em] text-stone-50">
                My Spells
              </h2>
            </div>
          </div>

          {isLoadingSpells && (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={index}
                  className="rounded-[1.75rem] border border-white/10 bg-white/4 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.35)]"
                >
                  <div className="h-6 w-40 rounded-full bg-white/8" />
                  <div className="mt-5 h-20 rounded-3xl bg-white/6" />
                  <div className="mt-5 grid grid-cols-3 gap-3">
                    <div className="h-16 rounded-2xl bg-white/6" />
                    <div className="h-16 rounded-2xl bg-white/6" />
                    <div className="h-16 rounded-2xl bg-white/6" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {!isLoadingSpells && spellEntries.length > 0 ? (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
              {spellEntries.map(([type, { spell, ids }]) => (
                <article
                  key={type}
                  className="group relative overflow-hidden rounded-[1.75rem] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.96),rgba(2,6,23,0.98))] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.45)] transition-all duration-300 hover:-translate-y-1 hover:border-purple-300/18"
                >
                  <div
                    aria-hidden="true"
                    className="absolute inset-x-0 top-0 h-28 bg-[radial-gradient(circle_at_top,rgba(192,132,252,0.18),transparent_72%)] opacity-90"
                  />

                  <div className="relative">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <div className="flex h-14 w-14 items-center justify-center rounded-3xl border border-purple-300/15 bg-purple-300/10 text-2xl shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                          🔮
                        </div>
                        <div>
                          <p className="text-[0.7rem] font-semibold tracking-[0.24em] text-purple-100/70 uppercase">
                            Grimoire entry
                          </p>
                          <h3 className="mt-1 font-['Iowan_Old_Style','Palatino_Linotype','Book_Antiqua',Palatino,Georgia,serif] text-3xl leading-none text-stone-50">
                            {type.replaceAll("-", " ")}
                          </h3>
                        </div>
                      </div>

                      <div className="rounded-full border border-purple-300/20 bg-purple-300/12 px-3 py-1 text-xs font-semibold tracking-[0.22em] text-purple-100 uppercase">
                        x{ids.length}
                      </div>
                    </div>

                    <div className="mt-5 rounded-3xl border border-white/8 bg-white/4 p-4">
                      <div className="mb-3 flex items-center gap-2 text-xs font-semibold tracking-[0.22em] text-blue-200/80 uppercase">
                        <BookOpen className="h-4 w-4" />
                        Description
                      </div>
                      <p className="text-sm leading-7 text-stone-300">
                        {spell.description.text}
                      </p>
                    </div>

                    <div className="mt-5 grid grid-cols-3 gap-3">
                      <div className="rounded-3xl border border-blue-300/10 bg-blue-400/6 p-4 text-center">
                        <p className="text-[0.65rem] font-semibold tracking-[0.18em] text-blue-200/70 uppercase">
                          Mana
                        </p>
                        <p className="mt-2 text-2xl font-semibold text-stone-50">
                          {spell.description.manaCost}
                        </p>
                      </div>
                      <div className="rounded-3xl border border-amber-300/10 bg-amber-300/6 p-4 text-center">
                        <p className="text-[0.65rem] font-semibold tracking-[0.18em] text-amber-100/70 uppercase">
                          Cooldown
                        </p>
                        <p className="mt-2 text-2xl font-semibold text-stone-50">
                          {spell.description.cooldown}
                        </p>
                      </div>
                      <div className="rounded-3xl border border-cyan-300/10 bg-cyan-300/6 p-4 text-center">
                        <p className="text-[0.65rem] font-semibold tracking-[0.18em] text-cyan-100/70 uppercase">
                          Targeting
                        </p>
                        <p className="mt-2 text-sm font-semibold tracking-[0.12em] text-stone-50 uppercase">
                          {spell.description.targetType.enemies}E /{" "}
                          {spell.description.targetType.allies}A
                        </p>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : null}

          {!isLoadingSpells && spellEntries.length === 0 && (
            <div className="rounded-4xl border border-dashed border-white/12 bg-white/4 px-6 py-16 text-center shadow-[0_20px_80px_rgba(0,0,0,0.28)]">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-purple-300/20 bg-purple-300/10 text-4xl shadow-[0_12px_40px_rgba(192,132,252,0.16)]">
                🔮
              </div>
              <h3 className="mt-6 font-['Iowan_Old_Style','Palatino_Linotype','Book_Antiqua',Palatino,Georgia,serif] text-4xl leading-none text-stone-50">
                Your spellbook is empty.
              </h3>
              <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-stone-400">
                Inscribe the first entry and start building real combat options
                instead of relying on a bare loadout.
              </p>
            </div>
          )}
        </section>

        <section className="mt-10">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-3xl border border-emerald-300/15 bg-emerald-300/10 text-emerald-100">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold tracking-[0.24em] text-emerald-200/70 uppercase">
                Persistent edges
              </p>
              <h2 className="text-2xl font-semibold tracking-[-0.04em] text-stone-50">
                Passive Skills
              </h2>
            </div>
          </div>

          {isLoadingPassives && (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={index}
                  className="rounded-[1.75rem] border border-white/10 bg-white/4 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.35)]"
                >
                  <div className="h-6 w-40 rounded-full bg-white/8" />
                  <div className="mt-5 h-24 rounded-3xl bg-white/6" />
                </div>
              ))}
            </div>
          )}

          {!isLoadingPassives && passiveEntries.length > 0 ? (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
              {passiveEntries.map(([type, { ids }]) => (
                <article
                  key={type}
                  className="group relative overflow-hidden rounded-[1.75rem] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.96),rgba(2,6,23,0.98))] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.45)] transition-all duration-300 hover:-translate-y-1 hover:border-emerald-300/18"
                >
                  <div
                    aria-hidden="true"
                    className="absolute inset-x-0 top-0 h-28 bg-[radial-gradient(circle_at_top,rgba(74,222,128,0.14),transparent_72%)] opacity-90"
                  />

                  <div className="relative">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <div className="flex h-14 w-14 items-center justify-center rounded-3xl border border-emerald-300/15 bg-emerald-300/10 text-2xl shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                          🛡️
                        </div>
                        <div>
                          <p className="text-[0.7rem] font-semibold tracking-[0.24em] text-emerald-100/70 uppercase">
                            Passive imprint
                          </p>
                          <h3 className="mt-1 font-['Iowan_Old_Style','Palatino_Linotype','Book_Antiqua',Palatino,Georgia,serif] text-3xl leading-none text-stone-50">
                            {type.replaceAll("-", " ")}
                          </h3>
                        </div>
                      </div>

                      <div className="rounded-full border border-emerald-300/20 bg-emerald-300/12 px-3 py-1 text-xs font-semibold tracking-[0.22em] text-emerald-100 uppercase">
                        x{ids.length}
                      </div>
                    </div>

                    <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-amber-300/14 bg-amber-300/10 px-3 py-1.5 text-xs font-semibold tracking-[0.18em] text-amber-100 uppercase">
                      <Star className="h-3.5 w-3.5" />
                      Passive skill
                    </div>

                    <div className="mt-5 rounded-3xl border border-white/8 bg-white/4 p-4">
                      <div className="mb-3 flex items-center gap-2 text-xs font-semibold tracking-[0.22em] text-emerald-200/80 uppercase">
                        <Sparkles className="h-4 w-4" />
                        Effect
                      </div>
                      <p className="text-sm leading-7 text-stone-300">
                        {getPassiveDescription(type)}
                      </p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : null}

          {!isLoadingPassives && passiveEntries.length === 0 && (
            <div className="rounded-4xl border border-dashed border-white/12 bg-white/4 px-6 py-16 text-center shadow-[0_20px_80px_rgba(0,0,0,0.28)]">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-emerald-300/20 bg-emerald-300/10 text-4xl shadow-[0_12px_40px_rgba(74,222,128,0.15)]">
                🛡️
              </div>
              <h3 className="mt-6 font-['Iowan_Old_Style','Palatino_Linotype','Book_Antiqua',Palatino,Georgia,serif] text-4xl leading-none text-stone-50">
                No passive skills archived.
              </h3>
              <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-stone-400">
                Once you start collecting passives, this section becomes the
                quiet layer that sharpens every build.
              </p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

// Helper function to get passive skill descriptions
function getPassiveDescription(type: string): string {
  const descriptions: Record<string, string> = {
    "armor-up": "Increases armor by 20%",
    "thorn-carapace": "Reflects damage back to attackers",
    "blessed-fortune": "Increases blessed by 5",
    bloodfang: "Gains life steal on attacks",
    soulleech: "Drains mana from enemies",
    "mystic-flow": "Increases mana regeneration",
    "vital-wellspring": "Increases health regeneration",
    "stoneform-resolve": "Gains damage reduction",
    "titans-resurgence": "Increases strength and vitality",
    "keen-instincts": "Increases critical hit chance",
  };
  return descriptions[type] || "A powerful passive ability";
}
