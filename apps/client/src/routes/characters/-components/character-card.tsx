import { Button } from "@/components/ui/button";
import { RpgBadge, RpgInset, RpgMeter, RpgPanel } from "@/components/rpg-ui";
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

export type CharacterDetailTab = "stats" | "spells" | "equipment";

export const CharacterCard = ({
  character,
  tab = "stats",
}: {
  character: Character;
  tab?: CharacterDetailTab;
}) => {
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
  const remainingPoints = character.statPointsAvailable - statToAdd.length;
  const showStats = tab === "stats";
  const showSpells = tab === "spells";
  const showEquipment = tab === "equipment";

  return (
    <RpgPanel className="p-6">
      <div className="rpg-panel-content">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="rpg-icon-frame h-16 w-16">
              <Shield className="h-7 w-7" />
            </div>
            <div>
              <p className="rpg-title text-[0.58rem] text-[#cfbf97]/70">
                Active adventurer
              </p>
              <div className="mt-1 flex items-center gap-3">
                <h2 className="rpg-heading text-4xl leading-none font-semibold uppercase tracking-[0.05em]">
                  {character.name}
                </h2>
                <RenameDialog character={character} />
              </div>
            </div>
          </div>

          <RpgBadge>
            Level {character.level}
          </RpgBadge>
        </div>

        <RpgInset variant="parchment" className="mt-6 p-5">
          <RpgMeter
            label="Experience"
            value={character.xp ?? 0}
            max={xpNeeded}
            tone="xp"
          />
        </RpgInset>

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

        {showStats && (
          <>
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
                    className="rpg-parchment p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-[#ac9f85]">
                          {formatLabel(attr)}
                        </p>
                        <p className="mt-1 text-2xl font-semibold text-[#f1e8d4]">
                          {character.baseAttributes[attr as keyof EntityAttributes]}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        {queuedPoints > 0 && (
                          <span className="rounded-full border border-[#5c8f3a]/35 bg-[#5c8f3a]/12 px-2 py-1 text-xs font-semibold text-[#b2d58e]">
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
                              ? "border-[#8a7753]/35 bg-[#8a7753]/12 text-[#ead7aa] hover:bg-[#8a7753]/20"
                              : "cursor-not-allowed border-[#5d503b]/40 bg-[#2a241c] text-[#7d725d]",
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
                variant="relic"
                className="mt-4 w-full"
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
                      className="rpg-parchment p-4"
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
                      className="rpg-parchment p-4"
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
          </>
        )}

        {showEquipment && (
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
                    className="rpg-parchment p-4"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xl">{icon}</span>
                      {equipped && (
                        <Button
                          size="icon"
                          variant="ghostRelic"
                          className="h-7 w-7 border-[#8f342a]/30 bg-[#8f342a]/10 text-[#f0c8be] hover:bg-[#8f342a]/16 hover:text-[#f4dbd4]"
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
        )}

        {showSpells && (
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
        )}
      </div>
    </RpgPanel>
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
    <div className="rpg-stat-tile">
      <div className={`flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] ${accent}`}>
        {icon}
        {label}
      </div>
      <p className="mt-3 text-3xl font-semibold text-[#f1e8d4]">{value}</p>
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
      <div className="rpg-icon-frame h-10 w-10 text-[#ead7aa]">
        {icon}
      </div>
      <h3 className="rpg-heading text-2xl font-semibold uppercase tracking-[0.05em]">
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
    <div className="rpg-parchment flex items-center justify-between gap-4 p-4">
      <div className="flex min-w-0 items-center gap-3">
        <span className="text-lg">{icon}</span>
        <p className="truncate text-sm font-semibold text-[#f1e8d4]">{title}</p>
      </div>

      {locked ? (
        <span className="rounded-full border border-[#8a7753]/28 bg-[#2b241b]/85 px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-[#b8aa89]">
          Locked
        </span>
      ) : (
        <Button
          size="icon"
          variant="ghostRelic"
          className="h-8 w-8 border-[#8f342a]/30 bg-[#8f342a]/10 text-[#f0c8be] hover:bg-[#8f342a]/16 hover:text-[#f4dbd4]"
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
    <div className="rpg-empty-state px-4 py-10 text-sm text-[#b6ab92]">
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
