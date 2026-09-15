import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { CollectionHeader } from "@/components/collection-ui";
import { RpgPage } from "@/components/rpg-ui";
import {
  OwnedSpellbook,
  type OwnedSkill,
} from "@/features/spellbook/owned-spellbook";
import { createPassiveLibrary } from "@loot-game/game/library/catalog";
import { createSpellFromType } from "@loot-game/game/spells/base/spell-from-type";
import { describeTargeting } from "@loot-game/game/tactical/queries";
import { SPELL_TARGETING } from "@loot-game/game/tactical/catalogue";
import { queryClient, trpc } from "@/utils/trpc";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { PlusIcon } from "lucide-react";

export const Route = createFileRoute("/spells/")({ component: RouteComponent });
const passiveDefinitions = new Map(
  createPassiveLibrary().map((entry) => [entry.type, entry]),
);

function RouteComponent() {
  const { data: spells, isLoading: isLoadingSpells } = useQuery(
    trpc.getMySpells.queryOptions(undefined, { throwOnError: true }),
  );
  const { data: passiveSkills, isLoading: isLoadingPassives } = useQuery(
    trpc.getMyPassiveSkills.queryOptions(undefined, { throwOnError: true }),
  );
  const spellEntries = useMemo<OwnedSkill[]>(
    () =>
      Array.from(spells?.grouped.entries() ?? []).map(
        ([type, { spell, ids }]) => ({
          type,
          name: createSpellFromType(spell.id, type).config.name,
          description: spell.description.text,
          count: ids.length,
          category: "spells",
          mana: spell.description.manaCost,
          cooldown: spell.description.cooldown,
          targeting: describeTargeting(
            spell.description.targeting ?? SPELL_TARGETING[type],
          ),
        }),
      ),
    [spells],
  );
  const passiveEntries = useMemo<OwnedSkill[]>(
    () =>
      Array.from(passiveSkills?.grouped.entries() ?? []).map(
        ([type, { ids }]) => ({
          type,
          name: passiveDefinitions.get(type)?.name ?? type,
          description:
            passiveDefinitions.get(type)?.description ?? "Passive skill",
          count: ids.length,
          category: "passives",
        }),
      ),
    [passiveSkills],
  );

  return (
    <RpgPage>
      <div className="space-y-5">
        <CollectionHeader
          eyebrow="Your arcane inventory"
          title="The spellbook"
          description="A growing collection of spells and passive skills. Choose an inscription to read its effects."
          summary={[
            {
              label: "Spell copies",
              value: isLoadingSpells
                ? "—"
                : spellEntries.reduce((total, entry) => total + entry.count, 0),
            },
            {
              label: "Passive copies",
              value: isLoadingPassives
                ? "—"
                : passiveEntries.reduce(
                    (total, entry) => total + entry.count,
                    0,
                  ),
            },
          ]}
        />
        <OwnedSpellbook
          spells={spellEntries}
          passives={passiveEntries}
          loadingSpells={isLoadingSpells}
          loadingPassives={isLoadingPassives}
        />
        {import.meta.env.DEV && (
          <details className="inventory-development">
            <summary>Development tools</summary>
            <DevelopmentSpellGrant />
          </details>
        )}
      </div>
    </RpgPage>
  );
}

/** Compiled out of production; the server independently enforces the environment. */
function DevelopmentSpellGrant() {
  const {
    mutate: createSpell,
    isPending,
    error,
  } = useMutation(
    trpc.createSpell.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(trpc.getMySpells.queryOptions());
      },
    }),
  );
  return (
    <>
      <Button
        disabled={isPending}
        variant="outline"
        onClick={() => createSpell()}
      >
        <PlusIcon className="size-4" />
        {isPending ? "Inscribing..." : "Create test spells"}
      </Button>
      {error && (
        <p role="alert" className="expedition-error">
          {error.message}
        </p>
      )}
    </>
  );
}
