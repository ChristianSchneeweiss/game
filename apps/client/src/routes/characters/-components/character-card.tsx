import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { trpc } from "@/utils/trpc";
import type { Character } from "@loot-game/game/base-entity";
import type { EntityAttributes } from "@loot-game/game/entity-types";
import { xpNeededForLevelUp } from "@loot-game/game/utils/xp-curve";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Heart, PlusIcon, Shield, Sparkles, XIcon, Zap } from "lucide-react";
import { useState } from "react";
import { RenameDialog } from "./rename-dialog";

export const CharacterCard = ({ character }: { character: Character }) => {
  const { mutateAsync: unequipSpell } = useMutation(
    trpc.character.unequipSpell.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries(
          trpc.character.getCharacter.queryOptions({ id: character.id }),
        );
      },
    }),
  );

  const { mutateAsync: applyStatIncrease } = useMutation(
    trpc.character.applyStatIncrease.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries(
          trpc.character.getCharacter.queryOptions({ id: character.id }),
        );
      },
    }),
  );

  const { mutateAsync: unequipPassiveSkill } = useMutation(
    trpc.character.unequipPassiveSkill.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries(
          trpc.character.getCharacter.queryOptions({ id: character.id }),
        );
        queryClient.invalidateQueries(trpc.getMyPassiveSkills.queryOptions());
      },
    }),
  );

  const { mutateAsync: unequipEquipment } = useMutation(
    trpc.character.unequipEquipment.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries(
          trpc.character.getCharacter.queryOptions({ id: character.id }),
        );
        queryClient.invalidateQueries(trpc.getMyEquipment.queryOptions());
      },
    }),
  );

  const queryClient = useQueryClient();
  const xpNeeded = xpNeededForLevelUp(character.level);
  const [statToAdd, setStatToAdd] = useState<(keyof EntityAttributes)[]>([]);

  return (
    <div className="relative w-[480px] rounded-xl border-2 bg-gradient-to-br from-slate-800/90 to-slate-900/90 p-4 shadow-2xl backdrop-blur-sm transition-all duration-300">
      {/* Character Header */}
      <div className="mb-4">
        <div className="mb-4 flex items-center gap-3">
          <span className="text-3xl">🧙‍♂️</span>
          <div className="flex-1">
            <div className="flex items-baseline gap-2">
              <h2 className="text-2xl font-bold text-white">
                {character.name}
              </h2>
              <RenameDialog character={character} />
            </div>
            <div className="flex items-center gap-3">
              <span className="rounded-full bg-gradient-to-r from-yellow-400 to-orange-500 px-3 py-1 text-sm font-bold text-black">
                Level {character.level}
              </span>
            </div>
          </div>
        </div>

        {/* XP Bar */}
        <div className="mb-2">
          <div className="mb-2 flex justify-between text-sm">
            <span className="flex items-center gap-1 text-yellow-300">
              <Sparkles className="h-4 w-4" />
              Experience
            </span>
            <span className="font-mono text-white">
              {character.xp ?? 0}/{xpNeeded}
            </span>
          </div>
          <div className="h-3 w-full overflow-hidden rounded-full border border-slate-600 bg-slate-700">
            <div
              className="h-full bg-gradient-to-r from-yellow-500 to-orange-400 transition-all duration-500 ease-out"
              style={{
                width: `${Math.min(100, ((character.xp ?? 0) / xpNeeded) * 100)}%`,
              }}
            />
          </div>
        </div>
      </div>
      {/* Attributes Section */}
      <div className="mb-4">
        <h3 className="mb-3 flex items-center gap-2 text-lg font-bold text-blue-300">
          <Shield className="h-5 w-5" />
          ATTRIBUTES
        </h3>

        {/* Health, Mana & Stat Points */}
        <div className="mb-4 grid grid-cols-3 gap-2">
          <div className="rounded-lg border border-slate-600 bg-slate-800/50 p-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <Heart className="h-3 w-3 text-red-300" />
                <span className="text-xs text-red-300">Health</span>
              </div>
              <div className="text-sm font-bold text-white">
                {character.health}
              </div>
            </div>
          </div>
          <div className="rounded-lg border border-slate-600 bg-slate-800/50 p-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <Zap className="h-3 w-3 text-blue-300" />
                <span className="text-xs text-blue-300">Mana</span>
              </div>
              <div className="text-sm font-bold text-white">
                {character.mana}
              </div>
            </div>
          </div>
          <div className="rounded-lg border border-slate-600 bg-slate-800/50 p-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <Sparkles className="h-3 w-3 text-yellow-300" />
                <span className="text-xs text-yellow-300">Points</span>
              </div>
              <div className="text-sm font-bold text-white">
                {character.statPointsAvailable - statToAdd.length}
              </div>
            </div>
          </div>
        </div>

        {/* Core Stats */}
        <div className="grid grid-cols-2 gap-2">
          {["intelligence", "vitality", "agility", "strength"].map((attr) => (
            <div
              className="rounded-lg border border-slate-600 bg-slate-800/50 p-2"
              key={attr}
            >
              <div className="mt-1 flex items-center gap-2">
                <span className="text-xs font-medium text-gray-300">
                  {attr.charAt(0).toUpperCase() + attr.slice(1)}
                </span>
                <span className="text-sm font-bold text-white">
                  {character.baseAttributes[attr as keyof EntityAttributes]}
                </span>
                {statToAdd.filter((s) => s === attr).length > 0 && (
                  <span className="rounded-full bg-green-600/20 px-1 py-0.5 text-xs font-bold text-green-300">
                    +{statToAdd.filter((s) => s === attr).length}
                  </span>
                )}
                {character.statPointsAvailable > 0 && (
                  <button
                    className={cn(
                      "rounded-full p-1 transition-all duration-200",
                      character.statPointsAvailable - statToAdd.length > 0
                        ? "bg-yellow-500 text-black hover:bg-yellow-400"
                        : "cursor-not-allowed bg-slate-600 text-slate-400",
                    )}
                    onClick={() => {
                      if (
                        character.statPointsAvailable - statToAdd.length >
                        0
                      ) {
                        // @ts-ignore
                        setStatToAdd((prev) => [...prev, attr]);
                      }
                    }}
                    type="button"
                    disabled={
                      character.statPointsAvailable - statToAdd.length <= 0
                    }
                  >
                    <PlusIcon className="h-2 w-2" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {statToAdd.length > 0 && (
          <Button
            size="sm"
            className="mt-4 w-full bg-gradient-to-r from-green-600 to-green-500 text-white hover:from-green-500 hover:to-green-400"
            onClick={async () => {
              await applyStatIncrease({
                characterId: character.id,
                stats: statToAdd,
              });
              setStatToAdd([]);
            }}
          >
            Apply Stat Changes
          </Button>
        )}
      </div>

      {/* Affinities Section */}
      <div className="mb-4">
        <h3 className="mb-3 flex items-center gap-2 text-lg font-bold text-orange-300">
          <Sparkles className="h-5 w-5" />
          AFFINITIES
        </h3>
        <div className="grid grid-cols-2 gap-3">
          {[
            { key: "fire", label: "Fire", icon: "🔥", color: "text-red-300" },
            {
              key: "lightning",
              label: "Lightning",
              icon: "⚡",
              color: "text-yellow-300",
            },
            {
              key: "earth",
              label: "Earth",
              icon: "🌍",
              color: "text-green-300",
            },
            {
              key: "water",
              label: "Water",
              icon: "💧",
              color: "text-blue-300",
            },
            {
              key: "dark",
              label: "Dark",
              icon: "🌑",
              color: "text-purple-300",
            },
          ].map(({ key, label, icon, color }) => (
            <div
              className="rounded-lg border border-slate-600 bg-slate-800/50 p-3"
              key={key}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{icon}</span>
                  <span className={`text-sm font-medium ${color}`}>
                    {label}
                  </span>
                </div>
                <div className="text-lg font-bold text-white">
                  {
                    character.baseAffinities[
                      key as keyof typeof character.baseAffinities
                    ]
                  }
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Special Attributes Section */}
      <div className="mb-4">
        <h3 className="mb-3 flex items-center gap-2 text-lg font-bold text-cyan-300">
          <Shield className="h-5 w-5" />
          SPECIAL ATTRIBUTES
        </h3>
        <div className="grid grid-cols-3 gap-2">
          {[
            {
              key: "lifesteal",
              label: "Lifesteal",
              icon: "🩸",
              color: "text-red-300",
            },
            {
              key: "omnivamp",
              label: "Omnivamp",
              icon: "🔄",
              color: "text-purple-300",
            },
            {
              key: "armor",
              label: "Armor",
              icon: "🛡️",
              color: "text-gray-300",
            },
            {
              key: "magicResistance",
              label: "Magic Resist",
              icon: "✨",
              color: "text-blue-300",
            },
            {
              key: "armorPenetration",
              label: "Armor Pen",
              icon: "⚔️",
              color: "text-orange-300",
            },
            {
              key: "magicPenetration",
              label: "Magic Pen",
              icon: "🔮",
              color: "text-pink-300",
            },
            {
              key: "healthRegen",
              label: "Health Regen",
              icon: "💚",
              color: "text-green-300",
            },
            {
              key: "manaRegen",
              label: "Mana Regen",
              icon: "💙",
              color: "text-cyan-300",
            },
            {
              key: "blessed",
              label: "Blessed",
              icon: "🙏",
              color: "text-yellow-300",
            },
            {
              key: "critChance",
              label: "Crit Chance",
              icon: "💥",
              color: "text-red-400",
            },
            {
              key: "critDamage",
              label: "Crit Damage",
              icon: "💢",
              color: "text-red-500",
            },
          ].map(({ key, label, icon, color }) => (
            <div
              className="rounded-lg border border-slate-600 bg-slate-800/50 p-2"
              key={key}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <span className="text-sm">{icon}</span>
                  <span className={`text-xs font-medium ${color}`}>
                    {label}
                  </span>
                </div>
                <div className="text-sm font-bold text-white">
                  {
                    character.baseSpecialAttributes[
                      key as keyof typeof character.baseSpecialAttributes
                    ]
                  }
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Passive Skills Section */}
      <div className="mb-4">
        <h3 className="mb-3 flex items-center gap-2 text-lg font-bold text-green-300">
          <Sparkles className="h-5 w-5" />
          PASSIVE SKILLS
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {character.passiveSkills.length > 0 ? (
            character.passiveSkills.map((passive) => (
              <div
                className="flex items-center justify-between rounded-lg border border-slate-600 bg-slate-800/50 p-2 transition-all duration-200"
                key={passive.id}
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm">🌟</span>
                  <span className="text-sm font-medium text-white capitalize">
                    {passive.passiveType}
                  </span>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6 rounded-full bg-red-600/20 text-red-300 hover:bg-red-600/30 hover:text-red-200"
                  onClick={() =>
                    unequipPassiveSkill({ passiveSkillId: passive.id })
                  }
                >
                  <XIcon className="h-2 w-2" />
                </Button>
              </div>
            ))
          ) : (
            <div className="col-span-2 rounded-lg border border-slate-600 bg-slate-800/50 p-2 text-center text-xs text-gray-400">
              No passive skills equipped
            </div>
          )}
        </div>
      </div>

      {/* Equipment Section */}
      <div className="mb-4">
        <h3 className="mb-3 flex items-center gap-2 text-lg font-bold text-amber-300">
          <Shield className="h-5 w-5" />
          EQUIPMENT
        </h3>
        <div className="grid grid-cols-3 gap-2">
          {[
            { slot: "WEAPON", icon: "⚔️", label: "Weapon" },
            { slot: "ARMOR", icon: "🛡️", label: "Armor" },
            { slot: "RING", icon: "💍", label: "Ring" },
            { slot: "AMULET", icon: "🔮", label: "Amulet" },
            { slot: "BOOTS", icon: "👢", label: "Boots" },
            { slot: "GLOVES", icon: "🧤", label: "Gloves" },
            { slot: "HELMET", icon: "⛑️", label: "Helmet" },
            { slot: "CLOAK", icon: "🧥", label: "Cloak" },
            { slot: "BELT", icon: "🪢", label: "Belt" },
          ].map(({ slot, icon, label }) => {
            const equipment =
              character.equipped[slot as keyof typeof character.equipped];
            return (
              <div
                className="rounded-lg border border-slate-600 bg-slate-800/50 p-2 transition-all duration-200"
                key={slot}
              >
                <div className="flex flex-col items-center gap-1">
                  <span className="text-2xl">{icon}</span>
                  <span className="text-xs font-medium text-gray-300">
                    {label}
                  </span>
                  {equipment ? (
                    <div className="flex items-center justify-center gap-2">
                      <p className="text-sm font-bold text-white">
                        {equipment.name}
                      </p>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="mt-1 h-5 w-5 rounded-full bg-red-600/20 text-red-300 hover:bg-red-600/30 hover:text-red-200"
                        onClick={() =>
                          unequipEquipment({ equipmentId: equipment.id })
                        }
                      >
                        <XIcon className="h-2 w-2" />
                      </Button>
                    </div>
                  ) : (
                    <div className="text-xs text-gray-500">Empty</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Spells Section */}
      <div>
        <h3 className="mb-3 flex items-center gap-2 text-lg font-bold text-purple-300">
          <Sparkles className="h-5 w-5" />
          EQUIPPED SPELLS
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {character.spells.map((spell) => (
            <div
              className="flex items-center justify-between rounded-lg border border-slate-600 bg-slate-800/50 p-2 transition-all duration-200"
              key={spell.config.id}
            >
              <div className="flex items-center gap-2">
                <span className="text-sm">⚡</span>
                <span className="text-sm font-medium text-white capitalize">
                  {spell.config.name}
                </span>
              </div>
              {spell.config.type !== "basic-attack" && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6 rounded-full bg-red-600/20 text-red-300 hover:bg-red-600/30 hover:text-red-200"
                  onClick={() => unequipSpell({ spellId: spell.config.id })}
                >
                  <XIcon className="h-2 w-2" />
                </Button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
