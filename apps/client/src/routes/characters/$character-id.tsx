import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
  ChartNoAxesColumnIncreasing,
  Shield,
  Sparkles,
  Swords,
} from "lucide-react";
import { toast } from "sonner";
import { passiveSkillFactory } from "@loot-game/game/passive-skills/base/passive-skill.factory";
import Loader from "@/components/loader";
import { RpgBackLink, RpgEmptyState, RpgPage } from "@/components/rpg-ui";
import { SkillIcon } from "@/components/skill-icon";
import { Button } from "@/components/ui/button";
import { Feedback } from "@/components/ui/status";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { queryClient, trpc } from "@/utils/trpc";
import {
  CharacterCard,
  type CharacterDetailTab,
} from "./-components/character-card";
import { CharacterReserve } from "./-components/character-reserve";
import { CharacterSummary } from "./-components/character-summary";
import {
  characterActionError,
  formatCharacterLabel,
} from "./-components/character-ui";
import { RenameDialog } from "./-components/rename-dialog";
import "./characters.css";

export const Route = createFileRoute("/characters/$character-id")({
  component: RouteComponent,
});
const tabs = [
  { value: "stats", label: "Stats", Icon: ChartNoAxesColumnIncreasing },
  { value: "spells", label: "Spells", Icon: Sparkles },
  { value: "equipment", label: "Equipment", Icon: Shield },
] as const;

function RouteComponent() {
  const { "character-id": characterId } = Route.useParams();
  const [activeTab, setActiveTab] = useState<CharacterDetailTab>("stats");
  const characterQuery = useQuery(
    trpc.character.getCharacter.queryOptions(
      { id: characterId },
      { staleTime: 60_000 },
    ),
  );
  const spells = useQuery(
    trpc.getMySpells.queryOptions(undefined, { staleTime: 60_000 }),
  );
  const equipment = useQuery(
    trpc.getMyEquipment.queryOptions(undefined, { staleTime: 60_000 }),
  );
  const passives = useQuery(
    trpc.getMyPassiveSkills.queryOptions(undefined, { staleTime: 60_000 }),
  );
  const onBuildChanged = async () => {
    await Promise.all([
      queryClient.invalidateQueries(
        trpc.character.getCharacter.queryOptions({ id: characterId }),
      ),
      queryClient.invalidateQueries(
        trpc.character.getCharacters.queryOptions(),
      ),
      queryClient.invalidateQueries(trpc.getMySpells.queryOptions()),
      queryClient.invalidateQueries(trpc.getMyEquipment.queryOptions()),
      queryClient.invalidateQueries(trpc.getMyPassiveSkills.queryOptions()),
    ]);
  };
  const spellEquip = useMutation(
    trpc.character.equipSpell.mutationOptions({ onSuccess: onBuildChanged }),
  );
  const equipmentEquip = useMutation(
    trpc.character.equipEquipment.mutationOptions({
      onSuccess: onBuildChanged,
    }),
  );
  const passiveEquip = useMutation(
    trpc.character.equipPassiveSkill.mutationOptions({
      onSuccess: onBuildChanged,
    }),
  );
  const equip = async (action: () => Promise<unknown>, title: string) => {
    try {
      await action();
      toast.success(`Equipped ${title}.`);
    } catch (error) {
      toast.error(characterActionError(error, `Failed to equip ${title}.`));
    }
  };
  const character = characterQuery.data;

  if (characterQuery.isLoading)
    return (
      <RpgPage>
        <Loader />
      </RpgPage>
    );
  if (characterQuery.error)
    return (
      <RpgPage>
        <RpgBackLink to="/characters">Back to roster</RpgBackLink>
        <Feedback error>
          Could not load this character.{" "}
          <Button
            variant="outline"
            onClick={() => void characterQuery.refetch()}
          >
            Try again
          </Button>
        </Feedback>
      </RpgPage>
    );
  if (!character)
    return (
      <RpgPage>
        <RpgBackLink to="/characters">Back to roster</RpgBackLink>
        <RpgEmptyState
          icon={<Shield size={32} />}
          title="Character not found"
          copy="Head back to the roster and pick another build."
        />
      </RpgPage>
    );

  return (
    <RpgPage className="character-page">
      <RpgBackLink to="/characters">Back to roster</RpgBackLink>
      <header className="character-page-heading character-detail-heading">
        <div>
          <p className="character-eyebrow">
            Character sheet <span aria-hidden="true">/</span> Level{" "}
            {character.level}
          </p>
          <div className="character-name-heading">
            <h1>{character.name}</h1>
            <RenameDialog character={character} />
          </div>
        </div>
        <span className="character-detail-caption">
          Every build tells a story.
        </span>
      </header>
      <div className="character-detail-layout">
        <CharacterSummary character={character} />
        <Tabs
          className="character-workspace"
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as CharacterDetailTab)}
        >
          <TabsList
            aria-label="Character build"
            className="character-build-tabs"
          >
            {tabs.map(({ value, label, Icon }) => (
              <TabsTrigger key={value} value={value}>
                <Icon size={17} aria-hidden="true" />
                <span>{label}</span>
              </TabsTrigger>
            ))}
          </TabsList>
          <TabsContent value={activeTab}>
            <div
              className="character-build-columns"
              data-loadout={activeTab !== "stats"}
            >
              <CharacterCard
                key={character.id}
                character={character}
                tab={activeTab}
                onBuildChanged={onBuildChanged}
              />
              {activeTab === "spells" && (
                <div className="character-reserves">
                  <CharacterReserve
                    title="Available spells"
                    loading={spells.isLoading}
                    error={spells.error}
                    onRetry={() => void spells.refetch()}
                    pending={spellEquip.isPending}
                    emptyCopy="No unequipped spells. Find more in dungeon rewards."
                    items={(spells.data?.all ?? [])
                      .filter((spell) => spell.equippedBy === null)
                      .map((spell) => ({
                        id: spell.id,
                        title: formatCharacterLabel(spell.type),
                        meta: `${spell.description.manaCost} mana · ${spell.description.cooldown} cooldown`,
                        description: spell.description.text,
                        icon: <SkillIcon type={spell.type} size={40} />,
                      }))}
                    onEquip={(id, title) =>
                      equip(
                        () =>
                          spellEquip.mutateAsync({ characterId, spellId: id }),
                        title,
                      )
                    }
                    link={{ to: "/spells", label: "Open spellbook" }}
                  />
                  <CharacterReserve
                    title="Available passive skills"
                    loading={passives.isLoading}
                    error={passives.error}
                    onRetry={() => void passives.refetch()}
                    pending={passiveEquip.isPending}
                    emptyCopy="No unequipped passive skills. Your next rewards may hold something new."
                    items={(passives.data?.all ?? [])
                      .filter((passive) => passive.equippedBy === null)
                      .map((passive) => ({
                        id: passive.id,
                        title: formatCharacterLabel(passive.type),
                        meta: "Passive skill",
                        description: passiveSkillFactory(
                          passive.type,
                          passive.id,
                          character,
                        ).getDescription(),
                        icon: <SkillIcon type={passive.type} size={40} />,
                      }))}
                    onEquip={(id, title) =>
                      equip(
                        () =>
                          passiveEquip.mutateAsync({
                            characterId,
                            passiveSkillId: id,
                          }),
                        title,
                      )
                    }
                    link={{ to: "/loot", label: "Open rewards" }}
                  />
                </div>
              )}
              {activeTab === "equipment" && (
                <CharacterReserve
                  title="Available equipment"
                  loading={equipment.isLoading}
                  error={equipment.error}
                  onRetry={() => void equipment.refetch()}
                  pending={equipmentEquip.isPending}
                  emptyCopy="No unequipped gear. Your equipment collection is available in the vault."
                  items={(equipment.data ?? [])
                    .filter((item) => item.equippedBy === null)
                    .map((item) => ({
                      id: item.id,
                      title: item.item.name,
                      meta: `${formatCharacterLabel(item.item.equipmentSlot)} · Tier ${item.item.tier}`,
                      description: item.item.description,
                      icon: (
                        <span className="character-reserve-gear-icon">
                          {item.item.equipmentSlot === "WEAPON" ? (
                            <Swords
                              size={24}
                              strokeWidth={1.4}
                              aria-hidden="true"
                            />
                          ) : (
                            <Shield
                              size={24}
                              strokeWidth={1.4}
                              aria-hidden="true"
                            />
                          )}
                        </span>
                      ),
                    }))}
                  onEquip={(id, title) =>
                    equip(
                      () =>
                        equipmentEquip.mutateAsync({
                          characterId,
                          equipmentId: id,
                        }),
                      title,
                    )
                  }
                  link={{ to: "/items", label: "Open vault" }}
                />
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </RpgPage>
  );
}
