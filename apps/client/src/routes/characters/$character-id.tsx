import { Button } from "@/components/ui/button";
import { queryClient, trpc } from "@/utils/trpc";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Shield,
  Sparkles,
  Wand2Icon,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { CharacterCard } from "./-components/character-card";

export const Route = createFileRoute("/characters/$character-id")({
  component: RouteComponent,
});

function RouteComponent() {
  const { "character-id": characterId } = Route.useParams();
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

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(251,191,36,0.12),transparent_20%),radial-gradient(circle_at_80%_16%,rgba(96,165,250,0.12),transparent_18%),linear-gradient(180deg,#030712_0%,#0f172a_46%,#020617_100%)] px-6 py-8 text-stone-100">
      <div className="mx-auto max-w-7xl">
        <Link
          to="/characters"
          className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-stone-300 transition-all duration-300 hover:border-white/20 hover:bg-white/8 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to roster
        </Link>

        <section className="relative overflow-hidden rounded-4xl border border-white/10 bg-black/25 p-8 shadow-[0_30px_120px_rgba(0,0,0,0.45)] backdrop-blur-xl sm:p-10">
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-[linear-gradient(rgba(248,250,252,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(248,250,252,0.04)_1px,transparent_1px)] bg-size-[64px_64px] opacity-15"
          />
          <div
            aria-hidden="true"
            className="absolute right-0 top-0 h-56 w-56 rounded-full bg-amber-300/10 blur-3xl"
          />

          <div className="relative grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-end">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-3 rounded-full border border-amber-300/18 bg-amber-300/10 px-4 py-2 text-[0.7rem] font-semibold uppercase tracking-[0.28em] text-amber-100/85">
                <Shield className="h-3.5 w-3.5" />
                Character dossier
              </div>
              <h1 className="mt-5 font-['Iowan_Old_Style','Palatino_Linotype','Book_Antiqua',Palatino,Georgia,serif] text-5xl leading-[0.92] font-semibold tracking-[-0.05em] text-stone-50 sm:text-6xl">
                {characterName}
              </h1>
              <p className="mt-5 max-w-2xl font-['Avenir_Next','Segoe_UI',sans-serif] text-base leading-8 text-stone-300 sm:text-lg">
                Tune the loadout, stack the right tools, and prepare this build
                for the next attrition-heavy dungeon run.
              </p>
            </div>

            <div className="rounded-[1.75rem] border border-white/10 bg-white/5 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-400">
                Loadout pulse
              </p>
              <div className="mt-4 grid grid-cols-3 gap-3">
                <StatPill
                  label="Spells"
                  value={availableSpells.length.toString()}
                />
                <StatPill
                  label="Gear"
                  value={availableEquipment.length.toString()}
                />
                <StatPill
                  label="Passives"
                  value={availablePassiveSkills.length.toString()}
                />
              </div>
            </div>
          </div>
        </section>

        <div className="mt-8 grid grid-cols-1 gap-8 xl:grid-cols-[minmax(0,1.08fr)_minmax(320px,0.92fr)]">
          <section>
            {isLoadingCharacter ? (
              <div className="rounded-4xl border border-white/10 bg-white/4 p-8 shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
                <div className="h-10 w-48 rounded-full bg-white/8" />
                <div className="mt-6 h-28 rounded-3xl bg-white/6" />
                <div className="mt-6 h-56 rounded-3xl bg-white/6" />
                <div className="mt-6 h-56 rounded-3xl bg-white/6" />
              </div>
            ) : character ? (
              <CharacterCard character={character} />
            ) : (
              <div className="rounded-4xl border border-dashed border-white/12 bg-white/4 px-6 py-16 text-center shadow-[0_20px_80px_rgba(0,0,0,0.28)]">
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-white/12 bg-black/20 text-4xl">
                  🧙‍♂️
                </div>
                <h2 className="mt-6 font-['Iowan_Old_Style','Palatino_Linotype','Book_Antiqua',Palatino,Georgia,serif] text-4xl text-stone-50">
                  Character not found.
                </h2>
                <p className="mt-4 text-stone-400">
                  Head back to the roster and pick another build.
                </p>
              </div>
            )}
          </section>

          <aside className="space-y-8">
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
          </aside>
        </div>
      </div>
    </main>
  );
}

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-white/8 bg-black/20 p-4 text-center">
      <p className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-stone-500">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold text-stone-50">{value}</p>
    </div>
  );
}

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
        "shadow-[0_24px_80px_rgba(0,0,0,0.45)] hover:border-purple-300/18",
      halo: "bg-[radial-gradient(circle_at_top,rgba(192,132,252,0.18),transparent_72%)]",
      iconBox: "border-purple-300/15 bg-purple-300/10 text-purple-100",
      eyebrow: "text-purple-200/70",
      badge: "border-purple-300/14 bg-purple-300/10 text-purple-100",
      button:
        "border-purple-300/16 bg-purple-300/12 text-purple-100 hover:bg-purple-300/18",
    },
    blue: {
      wrapper:
        "shadow-[0_24px_80px_rgba(0,0,0,0.45)] hover:border-blue-300/18",
      halo: "bg-[radial-gradient(circle_at_top,rgba(96,165,250,0.16),transparent_72%)]",
      iconBox: "border-blue-300/15 bg-blue-300/10 text-blue-100",
      eyebrow: "text-blue-200/70",
      badge: "border-blue-300/14 bg-blue-300/10 text-blue-100",
      button:
        "border-blue-300/16 bg-blue-300/12 text-blue-100 hover:bg-blue-300/18",
    },
    emerald: {
      wrapper:
        "shadow-[0_24px_80px_rgba(0,0,0,0.45)] hover:border-emerald-300/18",
      halo: "bg-[radial-gradient(circle_at_top,rgba(74,222,128,0.14),transparent_72%)]",
      iconBox:
        "border-emerald-300/15 bg-emerald-300/10 text-emerald-100",
      eyebrow: "text-emerald-200/70",
      badge: "border-emerald-300/14 bg-emerald-300/10 text-emerald-100",
      button:
        "border-emerald-300/16 bg-emerald-300/12 text-emerald-100 hover:bg-emerald-300/18",
    },
  }[accent];

  return (
    <section
      className={`relative overflow-hidden rounded-4xl border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.96),rgba(2,6,23,0.98))] p-6 transition-all duration-300 ${accents.wrapper}`}
    >
      <div aria-hidden="true" className={`absolute inset-x-0 top-0 h-28 ${accents.halo} opacity-90`} />
      <div className="relative">
        <div className="mb-5 flex items-center gap-3">
          <div
            className={`flex h-11 w-11 items-center justify-center rounded-3xl border ${accents.iconBox}`}
          >
            {icon}
          </div>
          <div>
            <p
              className={`text-xs font-semibold uppercase tracking-[0.24em] ${accents.eyebrow}`}
            >
              {eyebrow}
            </p>
            <h2 className="text-2xl font-semibold tracking-[-0.04em] text-stone-50">
              {title}
            </h2>
          </div>
        </div>

        {items.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-white/10 bg-white/4 px-5 py-12 text-center">
            <div className="text-5xl">{emptyIcon}</div>
            <h3 className="mt-4 text-xl font-semibold text-stone-50">
              {emptyTitle}
            </h3>
            <p className="mt-3 text-sm leading-7 text-stone-400">
              {emptyCopy}
            </p>
            {footerLink && (
              <Button
                asChild
                variant="outline"
                className="mt-6 rounded-full border-white/12 bg-white/5 text-stone-100 hover:bg-white/10"
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
                className="rounded-3xl border border-white/8 bg-white/4 p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div
                      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.18em] ${accents.badge}`}
                    >
                      <span>{item.badgeIcon}</span>
                      {item.badge}
                    </div>
                    <h3 className="mt-3 text-xl font-semibold text-stone-50">
                      {item.title}
                    </h3>
                    <p className="mt-1 text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-stone-500">
                      {item.meta}
                    </p>
                    <p className="mt-3 text-sm leading-7 text-stone-300">
                      {item.description}
                    </p>
                  </div>
                  <Button
                    disabled={pending}
                    onClick={() => onAction(item.id, item.title)}
                    className={`h-10 rounded-full border px-4 text-xs font-semibold uppercase tracking-[0.18em] ${accents.button}`}
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
                className="w-full rounded-full border-white/12 bg-white/5 text-stone-100 hover:bg-white/10"
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
