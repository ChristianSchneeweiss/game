import { Button } from "@/components/ui/button";
import {
  RpgBackLink,
  RpgBadge,
  RpgEmptyState,
  RpgInset,
  RpgPage,
  RpgPanel,
  RpgStatTile,
} from "@/components/rpg-ui";
import { cn } from "@/lib/utils";
import { queryClient, trpc } from "@/utils/trpc";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Shield,
  Sparkles,
  Wand2Icon,
  Zap,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
  CharacterCard,
  type CharacterDetailTab,
} from "./-components/character-card";

export const Route = createFileRoute("/characters/$character-id")({
  component: RouteComponent,
});

function RouteComponent() {
  const { "character-id": characterId } = Route.useParams();
  const [activeTab, setActiveTab] = useState<CharacterDetailTab>("stats");
  const { data: character, isLoading: isLoadingCharacter } = useQuery(
    trpc.character.getCharacter.queryOptions(
      { id: characterId },
      {
        staleTime: 60_000,
      },
    ),
  );
  const { data: _spells } = useQuery(
    trpc.getMySpells.queryOptions(undefined, {
      staleTime: 60_000,
    }),
  );
  const spells = _spells?.all;
  const { mutateAsync: equipSpell, isPending: isEquippingSpell } = useMutation(
    trpc.character.equipSpell.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(
          trpc.character.getCharacter.queryOptions({ id: characterId }),
        );
        await queryClient.invalidateQueries(trpc.getMySpells.queryOptions());
        await queryClient.invalidateQueries(
          trpc.character.getCharacters.queryOptions(),
        );
      },
    }),
  );

  const { data: equipment } = useQuery(
    trpc.getMyEquipment.queryOptions(undefined, {
      staleTime: 60_000,
    }),
  );

  const { mutateAsync: equipEquipment, isPending: isEquippingEquipment } =
    useMutation(
    trpc.character.equipEquipment.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(
          trpc.character.getCharacter.queryOptions({ id: characterId }),
        );
        await queryClient.invalidateQueries(trpc.getMyEquipment.queryOptions());
      },
    }),
  );

  const { data: _passiveSkills } = useQuery(
    trpc.getMyPassiveSkills.queryOptions(undefined, {
      staleTime: 60_000,
    }),
  );
  const passiveSkills = _passiveSkills?.all;

  const { mutateAsync: equipPassiveSkill, isPending: isEquippingPassiveSkill } =
    useMutation(
    trpc.character.equipPassiveSkill.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(
          trpc.character.getCharacter.queryOptions({ id: characterId }),
        );
        await queryClient.invalidateQueries(
          trpc.getMyPassiveSkills.queryOptions(),
        );
      },
    }),
  );

  const availableSpells =
    spells?.filter((spell) => spell.equippedBy === null) || [];

  const availableEquipment =
    equipment?.filter((equipment) => equipment.equippedBy === null) || [];
  const availablePassiveSkills =
    passiveSkills?.filter((passive) => passive.equippedBy === null) || [];

  const characterName = character?.name ?? "Character";
  const showLoadoutAside = activeTab !== "stats";

  return (
    <RpgPage>
      <div className="space-y-8">
        <RpgBackLink to="/characters">Back to roster</RpgBackLink>

        <RpgPanel className="px-6 py-6 sm:px-8 sm:py-8">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-end">
            <div className="max-w-3xl">
              <RpgBadge>
                <Shield className="h-3.5 w-3.5" />
                Character dossier
              </RpgBadge>
              <h1 className="rpg-heading mt-5 text-4xl font-semibold uppercase tracking-[0.06em] sm:text-5xl lg:text-6xl">
                {characterName}
              </h1>
              <p className="rpg-copy mt-5 max-w-2xl text-base leading-8 sm:text-lg">
                Tune the loadout, stack the right tools, and prepare this build
                for the next attrition-heavy dungeon run.
              </p>
            </div>

            <RpgInset variant="parchment" className="p-5">
              <p className="rpg-title text-[0.62rem] text-[#cfbf97]/75">
                Loadout pulse
              </p>
              <div className="mt-4 grid grid-cols-3 gap-3">
                <RpgStatTile
                  label="Spells"
                  value={availableSpells.length.toString()}
                />
                <RpgStatTile
                  label="Gear"
                  value={availableEquipment.length.toString()}
                />
                <RpgStatTile
                  label="Passives"
                  value={availablePassiveSkills.length.toString()}
                />
              </div>
            </RpgInset>
          </div>
        </RpgPanel>

        <RpgInset variant="stone" className="p-2">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {characterDetailTabs.map((tab) => (
              <button
                key={tab.value}
                type="button"
                onClick={() => setActiveTab(tab.value)}
                className={cn(
                  "rounded-[1.1rem] border px-4 py-3 text-left transition-all duration-200",
                  activeTab === tab.value
                    ? "border-[#b89656]/45 bg-[#3a3023]/95 text-[#f1e8d4] shadow-[inset_0_1px_0_rgba(255,239,201,0.06)]"
                    : "border-[#8a7753]/20 bg-[#241d15]/78 text-[#b8aa89] hover:border-[#8a7753]/38 hover:bg-[#2c241b]/92 hover:text-[#e6d6b0]",
                )}
              >
                <p className="rpg-title text-[0.58rem] text-current/70">{tab.eyebrow}</p>
                <p className="mt-1 text-lg font-semibold uppercase tracking-[0.05em]">
                  {tab.label}
                </p>
              </button>
            ))}
          </div>
        </RpgInset>

        <div
          className={cn(
            "grid grid-cols-1 gap-8",
            showLoadoutAside &&
              "xl:grid-cols-[minmax(0,1.08fr)_minmax(320px,0.92fr)]",
          )}
        >
          <section>
            {isLoadingCharacter ? (
              <RpgPanel className="p-8">
                <div className="h-10 w-48 rounded-full bg-white/8" />
                <div className="mt-6 h-28 rounded-3xl bg-white/6" />
                <div className="mt-6 h-56 rounded-3xl bg-white/6" />
                <div className="mt-6 h-56 rounded-3xl bg-white/6" />
              </RpgPanel>
            ) : character ? (
              <CharacterCard character={character} tab={activeTab} />
            ) : (
              <RpgEmptyState
                icon={<Shield className="h-8 w-8" />}
                title="Character not found"
                copy="Head back to the roster and pick another build."
              />
            )}
          </section>

          {showLoadoutAside ? (
            <aside className="space-y-8">
              {activeTab === "spells" ? (
                <>
                  <LoadoutSection
                    title="Available spells"
                    eyebrow="Arcane reserve"
                    icon={<Sparkles className="h-5 w-5" />}
                    accent="purple"
                    emptyIcon="📚"
                    emptyTitle="No spells available."
                    emptyCopy="Grab more spells from the spellbook and loot drops to widen this build."
                    items={availableSpells.map((spell) => ({
                      id: spell.id,
                      title: formatLabel(spell.type),
                      meta: `Mana ${spell.description.manaCost} | Cooldown ${spell.description.cooldown}`,
                      description: spell.description.text,
                      badge: "Spell",
                      badgeIcon: "⚡",
                    }))}
                    pending={isEquippingSpell}
                    actionLabel="Equip"
                    actionIcon={<Wand2Icon className="h-4 w-4" />}
                    onAction={async (id, title) => {
                      try {
                        await equipSpell({ characterId, spellId: id });
                        toast.success(`Equipped ${title}.`);
                      } catch (error) {
                        toast.error(getErrorMessage(error, `Failed to equip ${title}.`));
                      }
                    }}
                    footerLink={{
                      to: "/spells",
                      label: "Open spellbook",
                    }}
                  />

                  <LoadoutSection
                    title="Available passive skills"
                    eyebrow="Trait reserve"
                    icon={<Zap className="h-5 w-5" />}
                    accent="emerald"
                    emptyIcon="✨"
                    emptyTitle="No passive skills available."
                    emptyCopy="Passives sitting outside any character loadout will appear here and can be slotted instantly."
                    items={availablePassiveSkills.map((passive) => ({
                      id: passive.id,
                      title: formatLabel(passive.type),
                      meta: "Passive skill",
                      description: getPassiveDescription(passive.type),
                      badge: "Passive",
                      badgeIcon: "🌟",
                    }))}
                    pending={isEquippingPassiveSkill}
                    actionLabel="Equip"
                    actionIcon={<Zap className="h-4 w-4" />}
                    onAction={async (id, title) => {
                      try {
                        await equipPassiveSkill({
                          characterId,
                          passiveSkillId: id,
                        });
                        toast.success(`Equipped ${title}.`);
                      } catch (error) {
                        toast.error(getErrorMessage(error, `Failed to equip ${title}.`));
                      }
                    }}
                    footerLink={{
                      to: "/loot",
                      label: "Open rewards",
                    }}
                  />
                </>
              ) : null}

              {activeTab === "equipment" ? (
                <LoadoutSection
                  title="Available equipment"
                  eyebrow="Vault reserve"
                  icon={<Shield className="h-5 w-5" />}
                  accent="blue"
                  emptyIcon="🛡️"
                  emptyTitle="No gear available."
                  emptyCopy="Items in the shared vault will appear here once they are unequipped or newly earned."
                  items={availableEquipment.map((equipment) => ({
                    id: equipment.id,
                    title: formatLabel(equipment.type),
                    meta: `${formatLabel(equipment.item.equipmentSlot)} | Tier ${equipment.item.tier}`,
                    description: equipment.item.description,
                    badge: "Equipment",
                    badgeIcon: getEquipmentIcon(equipment.type),
                  }))}
                  pending={isEquippingEquipment}
                  actionLabel="Equip"
                  actionIcon={<Shield className="h-4 w-4" />}
                  onAction={async (id, title) => {
                    try {
                      await equipEquipment({ characterId, equipmentId: id });
                      toast.success(`Equipped ${title}.`);
                    } catch (error) {
                      toast.error(getErrorMessage(error, `Failed to equip ${title}.`));
                    }
                  }}
                  footerLink={{
                    to: "/items",
                    label: "Open vault",
                  }}
                />
              ) : null}
            </aside>
          ) : null}
        </div>
      </div>
    </RpgPage>
  );
}

const characterDetailTabs: Array<{
  value: CharacterDetailTab;
  label: string;
  eyebrow: string;
}> = [
  { value: "stats", label: "Stats", eyebrow: "Build sheet" },
  { value: "spells", label: "Spells", eyebrow: "Arcane kit" },
  { value: "equipment", label: "Equipment", eyebrow: "Vault fit" },
];

type LoadoutItem = {
  id: string;
  title: string;
  meta: string;
  description: string;
  badge: string;
  badgeIcon: string;
};

type LoadoutSectionProps = {
  title: string;
  eyebrow: string;
  icon: React.ReactNode;
  accent: "purple" | "blue" | "emerald";
  emptyIcon: string;
  emptyTitle: string;
  emptyCopy: string;
  items: LoadoutItem[];
  pending: boolean;
  actionLabel: string;
  actionIcon: React.ReactNode;
  onAction: (id: string, title: string) => Promise<void>;
  footerLink?: {
    to: "/spells" | "/items" | "/loot";
    label: string;
  };
};

function LoadoutSection({
  title,
  eyebrow,
  icon,
  accent,
  emptyIcon,
  emptyTitle,
  emptyCopy,
  items,
  pending,
  actionLabel,
  actionIcon,
  onAction,
  footerLink,
}: LoadoutSectionProps) {
  const accents = {
    purple: {
      wrapper:
        "hover:border-[#6b3fa0]/50",
      halo: "bg-[radial-gradient(circle_at_top,rgba(107,63,160,0.2),transparent_72%)]",
      iconBox: "border-[#6b3fa0]/45 bg-[#6b3fa0]/12 text-[#ceb2ea]",
      eyebrow: "text-[#c9b0df]",
      badge: "border-[#6b3fa0]/35 bg-[#6b3fa0]/12 text-[#ceb2ea]",
      button: "border-[#6b3fa0]/35 bg-[#6b3fa0]/12 text-[#ceb2ea] hover:bg-[#6b3fa0]/20",
    },
    blue: {
      wrapper:
        "hover:border-[#3ca6ff]/50",
      halo: "bg-[radial-gradient(circle_at_top,rgba(60,166,255,0.18),transparent_72%)]",
      iconBox: "border-[#3ca6ff]/35 bg-[#3ca6ff]/12 text-[#9bd0ff]",
      eyebrow: "text-[#9bd0ff]",
      badge: "border-[#3ca6ff]/35 bg-[#3ca6ff]/12 text-[#9bd0ff]",
      button: "border-[#3ca6ff]/35 bg-[#3ca6ff]/12 text-[#9bd0ff] hover:bg-[#3ca6ff]/20",
    },
    emerald: {
      wrapper:
        "hover:border-[#5c8f3a]/50",
      halo: "bg-[radial-gradient(circle_at_top,rgba(92,143,58,0.18),transparent_72%)]",
      iconBox:
        "border-[#5c8f3a]/35 bg-[#5c8f3a]/12 text-[#b2d58e]",
      eyebrow: "text-[#b2d58e]",
      badge: "border-[#5c8f3a]/35 bg-[#5c8f3a]/12 text-[#b2d58e]",
      button: "border-[#5c8f3a]/35 bg-[#5c8f3a]/12 text-[#b2d58e] hover:bg-[#5c8f3a]/20",
    },
  }[accent];

  return (
    <section
      className={`rpg-panel relative p-6 transition-all duration-300 ${accents.wrapper}`}
    >
      <div aria-hidden="true" className={`absolute inset-x-0 top-0 h-28 ${accents.halo} opacity-90`} />
      <div className="relative">
        <div className="mb-5 flex items-center gap-3">
          <div
            className={`rpg-icon-frame h-11 w-11 ${accents.iconBox}`}
          >
            {icon}
          </div>
          <div>
            <p
              className={`rpg-title text-[0.62rem] ${accents.eyebrow}`}
            >
              {eyebrow}
            </p>
            <h2 className="rpg-heading text-2xl font-semibold uppercase tracking-[0.05em]">
              {title}
            </h2>
          </div>
        </div>

        {items.length === 0 ? (
          <div className="rpg-empty-state px-5 py-12">
            <div className="text-5xl">{emptyIcon}</div>
            <h3 className="rpg-heading mt-4 text-xl font-semibold uppercase tracking-[0.05em]">
              {emptyTitle}
            </h3>
            <p className="rpg-copy mt-3 text-sm leading-7">
              {emptyCopy}
            </p>
            {footerLink && (
              <Button
                asChild
                variant="outline"
                className="mt-6"
              >
                <Link to={footerLink.to}>{footerLink.label}</Link>
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {items.map((item) => (
              <div
                key={item.id}
                className="rpg-parchment p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div
                      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.18em] ${accents.badge}`}
                    >
                      <span>{item.badgeIcon}</span>
                      {item.badge}
                    </div>
                    <h3 className="rpg-heading mt-3 text-xl font-semibold uppercase tracking-[0.05em]">
                      {item.title}
                    </h3>
                    <p className="mt-1 text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-[#ac9f85]">
                      {item.meta}
                    </p>
                    <p className="rpg-copy mt-3 text-sm leading-7">
                      {item.description}
                    </p>
                  </div>
                  <Button
                    disabled={pending}
                    onClick={() => onAction(item.id, item.title)}
                    className={`h-10 px-4 text-xs ${accents.button}`}
                  >
                    {actionIcon}
                    {actionLabel}
                  </Button>
                </div>
              </div>
            ))}

            {footerLink && (
              <Button
                asChild
                variant="outline"
                className="w-full"
              >
                <Link to={footerLink.to}>
                  {footerLink.label}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

function formatLabel(value: string) {
  return value.replaceAll("-", " ").replaceAll("_", " ");
}

function getEquipmentIcon(type: string) {
  const icons: Record<string, string> = {
    "int-armor": "🛡️",
    "int-weapon": "🪄",
    "str-weapon": "🪓",
    "dex-weapon": "🏹",
    helmet: "⛑️",
    cloak: "🧥",
    boots: "👢",
    gloves: "🧤",
    ring: "💍",
    amulet: "🔮",
    belt: "🪢",
  };
  return icons[type] || "⚔️";
}

function getPassiveDescription(type: string): string {
  const descriptions: Record<string, string> = {
    "armor-up": "Increases armor by 20%.",
    "thorn-carapace": "Reflects damage back to attackers.",
    "blessed-fortune": "Increases blessed by 5.",
    bloodfang: "Gains life steal on attacks.",
    soulleech: "Drains mana from enemies.",
    "mystic-flow": "Increases mana regeneration.",
    "vital-wellspring": "Increases health regeneration.",
    "stoneform-resolve": "Gains damage reduction.",
    "titans-resurgence": "Increases strength and vitality.",
    "keen-instincts": "Increases critical hit chance.",
  };

  return descriptions[type] || "A persistent passive that sharpens this build.";
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
}
