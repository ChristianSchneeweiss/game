import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { trpc } from "@/utils/trpc";
import type { Character } from "@loot-game/game/base-entity";
import type { EntityAttributes } from "@loot-game/game/entity-types";
import { xpNeededForLevelUp } from "@loot-game/game/utils/xp-curve";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Heart,
  PlusIcon,
  Shield,
  Sparkles,
  Sword,
  XIcon,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { RenameDialog } from "./rename-dialog";

const coreAttributes = [
  "intelligence",
  "vitality",
  "agility",
  "strength",
] as const;

const affinityItems = [
  { key: "fire", label: "Fire", icon: "🔥", accent: "text-red-300" },
  {
    key: "lightning",
    label: "Lightning",
    icon: "⚡",
    accent: "text-yellow-300",
  },
  { key: "earth", label: "Earth", icon: "🌍", accent: "text-green-300" },
  { key: "water", label: "Water", icon: "💧", accent: "text-blue-300" },
  { key: "dark", label: "Dark", icon: "🌑", accent: "text-purple-300" },
] as const;

const specialAttributeItems = [
  { key: "lifesteal", label: "Lifesteal", icon: "🩸", accent: "text-red-300" },
  { key: "omnivamp", label: "Omnivamp", icon: "🔄", accent: "text-purple-300" },
  { key: "armor", label: "Armor", icon: "🛡️", accent: "text-stone-300" },
  {
    key: "magicResistance",
    label: "Magic Resist",
    icon: "✨",
    accent: "text-blue-300",
  },
  {
    key: "armorPenetration",
    label: "Armor Pen",
    icon: "⚔️",
    accent: "text-orange-300",
  },
  {
    key: "magicPenetration",
    label: "Magic Pen",
    icon: "🔮",
    accent: "text-pink-300",
  },
  {
    key: "healthRegen",
    label: "Health Regen",
    icon: "💚",
    accent: "text-green-300",
  },
  {
    key: "manaRegen",
    label: "Mana Regen",
    icon: "💙",
    accent: "text-cyan-300",
  },
  { key: "blessed", label: "Blessed", icon: "🙏", accent: "text-yellow-300" },
  {
    key: "critChance",
    label: "Crit Chance",
    icon: "💥",
    accent: "text-red-400",
  },
  {
    key: "critDamage",
    label: "Crit Damage",
    icon: "💢",
    accent: "text-red-500",
  },
] as const;

const equipmentSlots = [
  { slot: "WEAPON", icon: "⚔️", label: "Weapon" },
  { slot: "ARMOR", icon: "🛡️", label: "Armor" },
  { slot: "RING", icon: "💍", label: "Ring" },
  { slot: "AMULET", icon: "🔮", label: "Amulet" },
  { slot: "BOOTS", icon: "👢", label: "Boots" },
  { slot: "GLOVES", icon: "🧤", label: "Gloves" },
  { slot: "HELMET", icon: "⛑️", label: "Helmet" },
  { slot: "CLOAK", icon: "🧥", label: "Cloak" },
  { slot: "BELT", icon: "🪢", label: "Belt" },
] as const;

export const CharacterCard = ({ character }: { character: Character }) => {
  const queryClient = useQueryClient();
  const { mutateAsync: unequipSpell } = useMutation(
    trpc.character.unequipSpell.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(
          trpc.character.getCharacter.queryOptions({ id: character.id }),
        );
      },
    }),
  );

  const { mutateAsync: applyStatIncrease } = useMutation(
    trpc.character.applyStatIncrease.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(
          trpc.character.getCharacter.queryOptions({ id: character.id }),
        );
      },
    }),
  );

  const { mutateAsync: unequipPassiveSkill } = useMutation(
    trpc.character.unequipPassiveSkill.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(
          trpc.character.getCharacter.queryOptions({ id: character.id }),
        );
        await queryClient.invalidateQueries(trpc.getMyPassiveSkills.queryOptions());
      },
    }),
  );

  const { mutateAsync: unequipEquipment } = useMutation(
    trpc.character.unequipEquipment.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(
          trpc.character.getCharacter.queryOptions({ id: character.id }),
        );
        await queryClient.invalidateQueries(trpc.getMyEquipment.queryOptions());
      },
    }),
  );

  const xpNeeded = xpNeededForLevelUp(character.level);
  const [statToAdd, setStatToAdd] = useState<(keyof EntityAttributes)[]>([]);
  const xpProgress = Math.min(100, ((character.xp ?? 0) / xpNeeded) * 100);
  const remainingPoints = character.statPointsAvailable - statToAdd.length;

  return (
    <article className="relative overflow-hidden rounded-4xl border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.96),rgba(2,6,23,0.98))] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-32 bg-[radial-gradient(circle_at_top,rgba(251,191,36,0.16),transparent_70%)] opacity-90"
      />

      <div className="relative">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-3xl border border-amber-300/15 bg-amber-300/10 text-3xl shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
              🧙‍♂️
            </div>
            <div>
              <p className="text-[0.7rem] font-semibold uppercase tracking-[0.24em] text-amber-100/70">
                Active adventurer
              </p>
              <div className="mt-1 flex items-center gap-3">
                <h2 className="font-['Iowan_Old_Style','Palatino_Linotype','Book_Antiqua',Palatino,Georgia,serif] text-4xl leading-none text-stone-50">
                  {character.name}
                </h2>
                <RenameDialog character={character} />
              </div>
            </div>
          </div>

          <div className="rounded-full border border-amber-300/20 bg-amber-300/12 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.22em] text-amber-100">
            Level {character.level}
          </div>
        </div>

        <div className="mt-6 rounded-3xl border border-white/8 bg-white/4 p-5">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-yellow-200/80">
              <Sparkles className="h-4 w-4" />
              Experience
            </div>
            <p className="font-mono text-sm text-stone-100">
              {character.xp ?? 0}/{xpNeeded}
            </p>
          </div>
          <div className="mt-3 h-3 overflow-hidden rounded-full border border-white/8 bg-black/20">
            <div
              className="h-full rounded-full bg-[linear-gradient(90deg,#facc15_0%,#fb923c_100%)] transition-all duration-500"
              style={{ width: `${xpProgress}%` }}
            />
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <OverviewStat
            icon={<Heart className="h-4 w-4" />}
            label="Health"
            value={character.health}
            accent="text-red-200/80"
          />
          <OverviewStat
            icon={<Zap className="h-4 w-4" />}
            label="Mana"
            value={character.mana}
            accent="text-blue-200/80"
          />
          <OverviewStat
            icon={<Sparkles className="h-4 w-4" />}
            label="Points"
            value={remainingPoints}
            accent="text-yellow-200/80"
          />
        </div>

        <SectionTitle
          className="mt-8"
          icon={<Shield className="h-5 w-5" />}
          title="Core attributes"
        />
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {coreAttributes.map((attr) => {
            const queuedPoints = statToAdd.filter((entry) => entry === attr).length;

            return (
              <div
                key={attr}
                className="rounded-3xl border border-white/8 bg-white/4 p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-stone-500">
                      {formatLabel(attr)}
                    </p>
                    <p className="mt-1 text-2xl font-semibold text-stone-50">
                      {character.baseAttributes[attr as keyof EntityAttributes]}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {queuedPoints > 0 && (
                      <span className="rounded-full border border-emerald-300/14 bg-emerald-300/10 px-2 py-1 text-xs font-semibold text-emerald-100">
                        +{queuedPoints}
                      </span>
                    )}
                    <button
                      type="button"
                      disabled={remainingPoints <= 0}
                      onClick={() => {
                        if (remainingPoints > 0) {
                          setStatToAdd((prev) => [...prev, attr]);
                        }
                      }}
                      className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-full border transition-all duration-200",
                        remainingPoints > 0
                          ? "border-amber-300/20 bg-amber-300/12 text-amber-100 hover:bg-amber-300/20"
                          : "cursor-not-allowed border-white/8 bg-white/4 text-stone-500",
                      )}
                    >
                      <PlusIcon className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {statToAdd.length > 0 && (
          <Button
            className="mt-4 h-11 w-full rounded-full border border-emerald-300/20 bg-emerald-300 px-6 text-sm font-semibold tracking-[0.18em] text-slate-950 uppercase shadow-[0_12px_40px_rgba(74,222,128,0.24)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-emerald-200"
            onClick={async () => {
              try {
                await applyStatIncrease({
                  characterId: character.id,
                  stats: statToAdd,
                });
                setStatToAdd([]);
                toast.success("Applied stat changes.");
              } catch (error) {
                toast.error(getErrorMessage(error, "Failed to apply stat changes."));
              }
            }}
          >
            Apply stat changes
          </Button>
        )}

        <div className="mt-8 grid gap-8 lg:grid-cols-2">
          <div>
            <SectionTitle
              icon={<Sparkles className="h-5 w-5" />}
              title="Affinities"
            />
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {affinityItems.map(({ key, label, icon, accent }) => (
                <div
                  key={key}
                  className="rounded-3xl border border-white/8 bg-white/4 p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{icon}</span>
                      <p className={`text-sm font-semibold ${accent}`}>{label}</p>
                    </div>
                    <p className="text-xl font-semibold text-stone-50">
                      {
                        character.baseAffinities[
                          key as keyof typeof character.baseAffinities
                        ]
                      }
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <SectionTitle
              icon={<Shield className="h-5 w-5" />}
              title="Special attributes"
            />
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {specialAttributeItems.map(({ key, label, icon, accent }) => (
                <div
                  key={key}
                  className="rounded-3xl border border-white/8 bg-white/4 p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span>{icon}</span>
                      <p className={`text-xs font-semibold uppercase tracking-[0.14em] ${accent}`}>
                        {label}
                      </p>
                    </div>
                    <p className="text-sm font-semibold text-stone-50">
                      {
                        character.baseSpecialAttributes[
                          key as keyof typeof character.baseSpecialAttributes
                        ]
                      }
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-8">
          <SectionTitle
            icon={<Shield className="h-5 w-5" />}
            title="Equipped gear"
          />
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {equipmentSlots.map(({ slot, icon, label }) => {
              const equipped =
                character.equipped[slot as keyof typeof character.equipped];

              return (
                <div
                  key={slot}
                  className="rounded-3xl border border-white/8 bg-white/4 p-4"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xl">{icon}</span>
                    {equipped && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 rounded-full bg-red-500/12 text-red-200 hover:bg-red-500/18 hover:text-red-100"
                        onClick={async () => {
                          try {
                            await unequipEquipment({ equipmentId: equipped.id });
                            toast.success(`Unequipped ${equipped.name}.`);
                          } catch (error) {
                            toast.error(
                              getErrorMessage(error, `Failed to unequip ${equipped.name}.`),
                            );
                          }
                        }}
                      >
                        <XIcon className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                  <p className="mt-3 text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-stone-500">
                    {label}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-stone-100">
                    {equipped?.name ?? "Empty"}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-2">
          <div>
            <SectionTitle
              icon={<Sparkles className="h-5 w-5" />}
              title="Passive skills"
            />
            <div className="mt-4 space-y-3">
              {character.passiveSkills.length > 0 ? (
                character.passiveSkills.map((passive) => (
                  <ActionRow
                    key={passive.id}
                    icon="🌟"
                    title={formatLabel(passive.passiveType)}
                    onRemove={async () => {
                      try {
                        await unequipPassiveSkill({ passiveSkillId: passive.id });
                        toast.success(
                          `Unequipped ${formatLabel(passive.passiveType)}.`,
                        );
                      } catch (error) {
                        toast.error(
                          getErrorMessage(
                            error,
                            `Failed to unequip ${formatLabel(passive.passiveType)}.`,
                          ),
                        );
                      }
                    }}
                  />
                ))
              ) : (
                <EmptyInline copy="No passive skills equipped." />
              )}
            </div>
          </div>

          <div>
            <SectionTitle
              icon={<Sword className="h-5 w-5" />}
              title="Equipped spells"
            />
            <div className="mt-4 space-y-3">
              {character.spells.length > 0 ? (
                character.spells.map((spell) => (
                  <ActionRow
                    key={spell.config.id}
                    icon="⚡"
                    title={spell.config.name}
                    locked={spell.config.type === "basic-attack"}
                    onRemove={async () => {
                      try {
                        await unequipSpell({ spellId: spell.config.id });
                        toast.success(`Unequipped ${spell.config.name}.`);
                      } catch (error) {
                        toast.error(
                          getErrorMessage(
                            error,
                            `Failed to unequip ${spell.config.name}.`,
                          ),
                        );
                      }
                    }}
                  />
                ))
              ) : (
                <EmptyInline copy="No spells equipped." />
              )}
            </div>
          </div>
        </div>
      </div>
    </article>
  );
};

function OverviewStat({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  accent: string;
}) {
  return (
    <div className="rounded-3xl border border-white/8 bg-white/4 p-4">
      <div className={`flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] ${accent}`}>
        {icon}
        {label}
      </div>
      <p className="mt-3 text-3xl font-semibold text-stone-50">{value}</p>
    </div>
  );
}

function SectionTitle({
  icon,
  title,
  className,
}: {
  icon: React.ReactNode;
  title: string;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className="flex h-10 w-10 items-center justify-center rounded-3xl border border-white/8 bg-white/4 text-blue-100">
        {icon}
      </div>
      <h3 className="text-2xl font-semibold tracking-[-0.04em] text-stone-50">
        {title}
      </h3>
    </div>
  );
}

function ActionRow({
  icon,
  title,
  onRemove,
  locked = false,
}: {
  icon: string;
  title: string;
  onRemove: () => Promise<void>;
  locked?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-3xl border border-white/8 bg-white/4 p-4">
      <div className="flex min-w-0 items-center gap-3">
        <span className="text-lg">{icon}</span>
        <p className="truncate text-sm font-semibold text-stone-100">{title}</p>
      </div>

      {locked ? (
        <span className="rounded-full border border-white/8 bg-black/20 px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-stone-400">
          Locked
        </span>
      ) : (
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8 rounded-full bg-red-500/12 text-red-200 hover:bg-red-500/18 hover:text-red-100"
          onClick={() => {
            void onRemove();
          }}
        >
          <XIcon className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );
}

function EmptyInline({ copy }: { copy: string }) {
  return (
    <div className="rounded-3xl border border-dashed border-white/10 bg-white/4 px-4 py-10 text-center text-sm text-stone-400">
      {copy}
    </div>
  );
}

function formatLabel(value: string) {
  return value.replaceAll("-", " ").replaceAll("_", " ");
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
}
