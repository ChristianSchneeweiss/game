import type { ReactNode } from "react";
import type { Character } from "@loot-game/game/base-entity";
import { useMutation } from "@tanstack/react-query";
import {
  Circle,
  Crown,
  Footprints,
  Gem,
  Hand,
  LockKeyhole,
  Shield,
  Shirt,
  Swords,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { SkillIcon } from "@/components/skill-icon";
import { Button } from "@/components/ui/button";
import { trpc } from "@/utils/trpc";
import { CharacterAttributes } from "./character-attributes";
import {
  CharacterSectionHeading,
  characterActionError,
  formatCharacterLabel,
} from "./character-ui";

const equipmentSlots = [
  { slot: "WEAPON", Icon: Swords, label: "Weapon" },
  { slot: "ARMOR", Icon: Shield, label: "Armor" },
  { slot: "HELMET", Icon: Crown, label: "Helmet" },
  { slot: "CLOAK", Icon: Shirt, label: "Cloak" },
  { slot: "GLOVES", Icon: Hand, label: "Gloves" },
  { slot: "BOOTS", Icon: Footprints, label: "Boots" },
  { slot: "BELT", Icon: Circle, label: "Belt" },
  { slot: "RING", Icon: Circle, label: "Ring" },
  { slot: "AMULET", Icon: Gem, label: "Amulet" },
] as const;
export type CharacterDetailTab = "stats" | "spells" | "equipment";

export function CharacterCard({
  character,
  tab = "stats",
  onBuildChanged,
}: {
  character: Character;
  tab?: CharacterDetailTab;
  onBuildChanged: () => Promise<void>;
}) {
  const spellRemoval = useMutation(
    trpc.character.unequipSpell.mutationOptions({ onSuccess: onBuildChanged }),
  );
  const passiveRemoval = useMutation(
    trpc.character.unequipPassiveSkill.mutationOptions({
      onSuccess: onBuildChanged,
    }),
  );
  const equipmentRemoval = useMutation(
    trpc.character.unequipEquipment.mutationOptions({
      onSuccess: onBuildChanged,
    }),
  );
  const remove = async (action: () => Promise<unknown>, name: string) => {
    try {
      await action();
      toast.success(`Unequipped ${name}.`);
    } catch (error) {
      toast.error(characterActionError(error, `Failed to unequip ${name}.`));
    }
  };
  return (
    <div className="character-equipped">
      <CharacterAttributes
        character={character}
        hidden={tab !== "stats"}
        onSaved={onBuildChanged}
      />
      {tab === "equipment" && (
        <section className="character-build-panel">
          <CharacterSectionHeading title="Equipped gear">
            Your current equipment, slot by slot.
          </CharacterSectionHeading>
          <div className="character-equipment-slots">
            {equipmentSlots.map(({ slot, label, Icon }) => {
              const item = character.equipped[slot];
              return (
                <div
                  className="character-equipment-slot"
                  key={slot}
                  data-filled={Boolean(item)}
                >
                  <Icon size={22} strokeWidth={1.4} aria-hidden="true" />
                  <div>
                    <span className="character-eyebrow">{label}</span>
                    <h3>{item?.name ?? "Empty slot"}</h3>
                  </div>
                  {item && (
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Unequip ${item.name}`}
                      disabled={equipmentRemoval.isPending}
                      onClick={() =>
                        void remove(
                          () =>
                            equipmentRemoval.mutateAsync({
                              equipmentId: item.id,
                            }),
                          item.name,
                        )
                      }
                    >
                      <X size={16} />
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}
      {tab === "spells" && (
        <>
          <section className="character-build-panel">
            <CharacterSectionHeading
              title="Equipped spells"
              aside={
                <span className="character-section-count">
                  {character.spells.length}
                </span>
              }
            >
              The abilities this adventurer takes into battle.
            </CharacterSectionHeading>
            <div className="character-equipped-list">
              {character.spells.length === 0 ? (
                <p className="character-inline-empty">No spells equipped.</p>
              ) : (
                character.spells.map((spell) => (
                  <EquippedSkill
                    key={spell.config.id}
                    icon={<SkillIcon type={spell.config.type} size={40} />}
                    title={spell.config.name}
                    locked={spell.config.type === "basic-attack"}
                    pending={spellRemoval.isPending}
                    onRemove={() =>
                      remove(
                        () =>
                          spellRemoval.mutateAsync({
                            spellId: spell.config.id,
                          }),
                        spell.config.name,
                      )
                    }
                  />
                ))
              )}
            </div>
          </section>
          <section className="character-build-panel">
            <CharacterSectionHeading
              title="Passive skills"
              aside={
                <span className="character-section-count">
                  {character.passiveSkills.length}
                </span>
              }
            >
              Lasting effects that complement your spells.
            </CharacterSectionHeading>
            <div className="character-equipped-list">
              {character.passiveSkills.length === 0 ? (
                <p className="character-inline-empty">
                  No passive skills equipped.
                </p>
              ) : (
                character.passiveSkills.map((passive) => (
                  <EquippedSkill
                    key={passive.id}
                    icon={<SkillIcon type={passive.passiveType} size={40} />}
                    title={formatCharacterLabel(passive.passiveType)}
                    pending={passiveRemoval.isPending}
                    onRemove={() =>
                      remove(
                        () =>
                          passiveRemoval.mutateAsync({
                            passiveSkillId: passive.id,
                          }),
                        formatCharacterLabel(passive.passiveType),
                      )
                    }
                  />
                ))
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function EquippedSkill({
  icon,
  title,
  locked,
  pending,
  onRemove,
}: {
  icon: ReactNode;
  title: string;
  locked?: boolean;
  pending: boolean;
  onRemove: () => Promise<void>;
}) {
  return (
    <div className="character-equipped-skill">
      {icon}
      <div>
        <h3>{title}</h3>
        <p>{locked ? "Always equipped" : "Equipped"}</p>
      </div>
      {locked ? (
        <span
          className="character-locked"
          title="Basic Attack is always equipped"
        >
          <LockKeyhole size={15} aria-hidden="true" />
          <span className="sr-only">Locked</span>
        </span>
      ) : (
        <Button
          size="icon"
          variant="ghost"
          disabled={pending}
          aria-label={`Unequip ${title}`}
          onClick={() => void onRemove()}
        >
          <X size={16} />
        </Button>
      )}
    </div>
  );
}
