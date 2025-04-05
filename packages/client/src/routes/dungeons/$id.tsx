import { Button } from "@/components/ui/button";
import { queryClient, trpc } from "@/utils/trpc";
import type { Entity, Spell } from "@loot-game/game/types";
import { useMutation, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useMemo } from "react";

export const Route = createFileRoute("/dungeons/$id")({
  component: RouteComponent,
  beforeLoad: async ({ params }) => {
    await queryClient.prefetchQuery(
      trpc.getDungeon.queryOptions({ id: params.id }),
    );
  },
});

type SpellWithCaster = {
  caster: Entity;
  spell: Spell;
};

function RouteComponent() {
  const { id } = Route.useParams();
  const router = useRouter();
  const { mutate: fightDungeon, data: fightDungeonData } = useMutation(
    trpc.fightDungeon.mutationOptions({
      onSuccess: (id) => {
        queryClient.invalidateQueries({
          queryKey: trpc.getDungeon.queryKey({ id }),
        });
        router.navigate({ to: "/battle/$id", params: { id } });
      },
    }),
  );
  const { data: dungeon } = useSuspenseQuery(
    trpc.getDungeon.queryOptions({ id }),
  );

  const playerSpells = useMemo(() => {
    const spells = new Map<string, SpellWithCaster>();
    for (const player of dungeon.playerTeam) {
      for (const spell of player.spells) {
        spells.set(spell.config.id, { caster: player, spell });
      }
    }
    return spells;
  }, [dungeon.playerTeam]);

  const enemySpells = useMemo(() => {
    const spells = new Map<string, SpellWithCaster>();
    for (const enemy of dungeon.actualEnemies[dungeon.round]) {
      for (const spell of enemy.spells) {
        spells.set(spell.config.id, { caster: enemy, spell });
      }
    }
    return spells;
  }, [dungeon.actualEnemies]);

  const allSpells = useMemo(
    () => new Map<string, SpellWithCaster>([...playerSpells, ...enemySpells]),
    [playerSpells, enemySpells],
  );

  return (
    <div className="container flex flex-col justify-center space-y-3 p-6">
      <h1 className="text-2xl font-bold">
        Dungeon {dungeon.key} round {dungeon.round + 1}
      </h1>
      <div className="overflow-auto rounded-md bg-slate-100 p-4 dark:bg-slate-800">
        <div className="mb-4">
          <h3 className="mb-2 text-lg font-semibold">Your Team</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
            {dungeon.playerTeam.map((player) => (
              <div
                key={player.id}
                className="rounded-md bg-blue-100 p-3 dark:bg-blue-900"
              >
                <p className="font-medium">{player.name}</p>
                <p>
                  HP: {player.health}/{player.maxHealth}
                </p>
                <p>
                  Mana: {player.mana}/{player.maxMana}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3 className="mb-2 text-lg font-semibold">Current Enemies</h3>
          {dungeon.actualEnemies[dungeon.round] ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
              {dungeon.actualEnemies[dungeon.round].map((enemy) => (
                <div
                  key={enemy.id}
                  className="rounded-md bg-red-100 p-3 dark:bg-red-900"
                >
                  <p className="font-medium">{enemy.name}</p>
                  <p>
                    HP: {enemy.health}/{enemy.maxHealth}
                  </p>
                  <p>
                    Mana: {enemy.mana}/{enemy.maxMana}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p>No enemies in this round</p>
          )}
        </div>
      </div>
      <Button onClick={() => fightDungeon({ id })} className="w-40">
        Fight Dungeon 1
      </Button>
    </div>
  );
}
