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
    <RpgPage>
      <div className="space-y-8">
        <RpgHero
          eyebrow="Arcane inventory"
          title={
            <>
              Stack the spellbook
              <br />
              shape the build
            </>
          }
          description="The grimoire should read like a real loadout, not a dump of entries. Track spell stock, passive layers, and the tools that define each run."
          aside={
            <RpgInset variant="parchment" className="p-5">
              <p className="rpg-title text-[0.62rem] text-[#cfbf97]/75">
                Archive pulse
              </p>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <RpgStatTile label="Spells" value={totalSpells} />
                <RpgStatTile label="Passives" value={totalPassives} />
              </div>
              <Button
                disabled={isCreatingSpell}
                variant="spell"
                size="lg"
                className="mt-5 w-full border-[#6b3fa0]/35 bg-[#6b3fa0]/14 text-[#ceb2ea] hover:bg-[#6b3fa0]/22"
                onClick={async () => {
                  await createSpell();
                }}
              >
                <PlusIcon className="h-4 w-4" />
                {isCreatingSpell ? "Inscribing..." : "Create spells"}
              </Button>
            </RpgInset>
          }
        />

        <section>
          <RpgSectionHeading
            icon={<Zap className="h-5 w-5" />}
            eyebrow="Active arsenal"
            title="My spells"
          />

          {isLoadingSpells && (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <RpgPanel key={index} className="p-6">
                  <div className="h-6 w-40 rounded-full bg-white/8" />
                  <div className="mt-5 h-20 rounded-3xl bg-white/6" />
                  <div className="mt-5 grid grid-cols-3 gap-3">
                    <div className="h-16 rounded-2xl bg-white/6" />
                    <div className="h-16 rounded-2xl bg-white/6" />
                    <div className="h-16 rounded-2xl bg-white/6" />
                  </div>
                </RpgPanel>
              ))}
            </div>
          )}

          {!isLoadingSpells && spellEntries.length > 0 ? (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
              {spellEntries.map(([type, { spell, ids }]) => (
                <RpgPanel
                  key={type}
                  className="group p-6 transition-all duration-200 hover:border-[#6b3fa0]/50"
                >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <div className="rpg-icon-frame h-14 w-14 text-[#ceb2ea]">
                          <WandSparkles className="h-6 w-6" />
                        </div>
                        <div>
                          <p className="rpg-title text-[0.58rem] text-[#c9b0df]/75">
                            Grimoire entry
                          </p>
                          <h3 className="rpg-heading mt-2 text-3xl leading-none font-semibold uppercase tracking-[0.05em]">
                            {type.replaceAll("-", " ")}
                          </h3>
                        </div>
                      </div>

                      <RpgBadge className="border-[#6b3fa0]/35 bg-[#6b3fa0]/12 text-[#ceb2ea]">
                        x{ids.length}
                      </RpgBadge>
                    </div>

                    <RpgInset variant="parchment" className="mt-5 p-4">
                      <div className="mb-3 flex items-center gap-2 text-xs font-semibold tracking-[0.22em] text-[#b6ab92] uppercase">
                        <BookOpen className="h-4 w-4" />
                        Description
                      </div>
                      <p className="rpg-copy text-sm leading-7">
                        {spell.description.text}
                      </p>
                    </RpgInset>

                    <div className="mt-5 grid grid-cols-3 gap-3">
                      <div className="rpg-stat-tile text-center">
                        <p className="text-[0.65rem] font-semibold tracking-[0.18em] text-[#9bd0ff] uppercase">
                          Mana
                        </p>
                        <p className="mt-2 text-2xl font-semibold text-[#f1e8d4]">
                          {spell.description.manaCost}
                        </p>
                      </div>
                      <div className="rpg-stat-tile text-center">
                        <p className="text-[0.65rem] font-semibold tracking-[0.18em] text-[#e8dca6] uppercase">
                          Cooldown
                        </p>
                        <p className="mt-2 text-2xl font-semibold text-[#f1e8d4]">
                          {spell.description.cooldown}
                        </p>
                      </div>
                      <div className="rpg-stat-tile text-center">
                        <p className="text-[0.65rem] font-semibold tracking-[0.18em] text-[#d0c8b6] uppercase">
                          Targeting
                        </p>
                        <p className="mt-2 text-sm font-semibold tracking-[0.12em] text-[#f1e8d4] uppercase">
                          {spell.description.targetType.enemies}E /{" "}
                          {spell.description.targetType.allies}A
                        </p>
                      </div>
                    </div>
                </RpgPanel>
              ))}
            </div>
          ) : null}

          {!isLoadingSpells && spellEntries.length === 0 && (
            <RpgEmptyState
              icon={<WandSparkles className="h-8 w-8" />}
              title="Your spellbook is empty"
              copy="Inscribe the first entry and start building real combat options instead of relying on a bare loadout."
            />
          )}
        </section>

        <section>
          <RpgSectionHeading
            icon={<Shield className="h-5 w-5" />}
            eyebrow="Persistent edges"
            title="Passive skills"
          />

          {isLoadingPassives && (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <RpgPanel key={index} className="p-6">
                  <div className="h-6 w-40 rounded-full bg-white/8" />
                  <div className="mt-5 h-24 rounded-3xl bg-white/6" />
                </RpgPanel>
              ))}
            </div>
          )}

          {!isLoadingPassives && passiveEntries.length > 0 ? (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
              {passiveEntries.map(([type, { ids }]) => (
                <RpgPanel
                  key={type}
                  className="group p-6 transition-all duration-200 hover:border-[#5c8f3a]/50"
                >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <div className="rpg-icon-frame h-14 w-14 text-[#b2d58e]">
                          <Shield className="h-6 w-6" />
                        </div>
                        <div>
                          <p className="rpg-title text-[0.58rem] text-[#b2d58e]/75">
                            Passive imprint
                          </p>
                          <h3 className="rpg-heading mt-2 text-3xl leading-none font-semibold uppercase tracking-[0.05em]">
                            {type.replaceAll("-", " ")}
                          </h3>
                        </div>
                      </div>

                      <RpgBadge className="border-[#5c8f3a]/35 bg-[#5c8f3a]/12 text-[#b2d58e]">
                        x{ids.length}
                      </RpgBadge>
                    </div>

                    <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-[#8a7753]/35 bg-[#8a7753]/12 px-3 py-1.5 text-xs font-semibold tracking-[0.18em] text-[#ead7aa] uppercase">
                      <Star className="h-3.5 w-3.5" />
                      Passive skill
                    </div>

                    <RpgInset variant="parchment" className="mt-5 p-4">
                      <div className="mb-3 flex items-center gap-2 text-xs font-semibold tracking-[0.22em] text-[#b2d58e] uppercase">
                        <Sparkles className="h-4 w-4" />
                        Effect
                      </div>
                      <p className="rpg-copy text-sm leading-7">
                        {getPassiveDescription(type)}
                      </p>
                    </RpgInset>
                </RpgPanel>
              ))}
            </div>
          ) : null}

          {!isLoadingPassives && passiveEntries.length === 0 && (
            <RpgEmptyState
              icon={<Shield className="h-8 w-8" />}
              title="No passive skills archived"
              copy="Once you start collecting passives, this section becomes the quiet layer that sharpens every build."
            />
          )}
        </section>
      </div>
    </RpgPage>
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
