import { Button } from "@/components/ui/button";
import { trpc } from "@/utils/trpc";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Zap } from "lucide-react";

export const Route = createFileRoute("/spells/")({
  component: RouteComponent,
});

function RouteComponent() {
  const { data: spells, refetch: refetchSpells } = useQuery(
    trpc.getMySpells.queryOptions(),
  );
  const { mutateAsync: unequipSpell } = useMutation(
    trpc.character.unequipSpell.mutationOptions({
      onSuccess: () => {
        refetchSpells();
      },
    }),
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
      {/* Header Section */}
      <div className="mb-8 text-center">
        <h1 className="mb-2 bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-4xl font-bold text-transparent">
          🔮 SPELL LIBRARY 🔮
        </h1>
        <div className="mx-auto h-1 w-32 rounded-full bg-gradient-to-r from-yellow-400 to-orange-500"></div>
      </div>

      <div className="mx-auto max-w-6xl">
        {/* My Spells Section */}
        <div className="mb-6">
          <h2 className="mb-6 flex items-center gap-2 text-2xl font-bold text-purple-300">
            <Zap className="h-6 w-6" />
            MY SPELLS
          </h2>
          {spells && spells.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {spells
                .sort((a, b) => a.type.localeCompare(b.type))
                .map((spell) => (
                  <div
                    key={spell.id}
                    className="group relative rounded-xl border-2 bg-gradient-to-br from-slate-800/90 to-slate-900/90 p-6 shadow-2xl backdrop-blur-sm transition-all duration-300 hover:scale-105"
                  >
                    {/* Spell Header */}
                    <div className="mb-4 flex items-center gap-3">
                      <span className="text-3xl">🔮</span>
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-white capitalize">
                          {spell.type.replace("-", " ")}
                        </h3>
                      </div>
                    </div>

                    {/* Spell Info */}
                    <div className="mb-4">
                      <div className="rounded-lg p-4">
                        {/* Description */}
                        <div className="mb-4">
                          <div className="mb-2 flex items-center gap-2 text-sm">
                            <span className="text-blue-300">📖</span>
                            <span className="font-bold text-blue-300">
                              DESCRIPTION
                            </span>
                          </div>
                          <div className="text-sm text-blue-200">
                            {spell.description.text}
                          </div>
                        </div>

                        {/* Stats Grid */}
                        <div className="mb-4 grid grid-cols-3 gap-3 text-xs">
                          <div className="rounded bg-blue-900/40 p-2 text-center">
                            <div className="text-blue-300">Mana</div>
                            <div className="font-bold text-blue-100">
                              {spell.description.manaCost}
                            </div>
                          </div>
                          <div className="rounded bg-blue-900/40 p-2 text-center">
                            <div className="text-blue-300">Cooldown</div>
                            <div className="font-bold text-blue-100">
                              {spell.description.cooldown}
                            </div>
                          </div>
                          <div className="rounded bg-blue-900/40 p-2 text-center">
                            <div className="text-blue-300">Targets</div>
                            <div className="font-bold text-blue-100">
                              {spell.description.targetType.enemies}E/
                              {spell.description.targetType.allies}A
                            </div>
                          </div>
                        </div>

                        {/* Status */}
                        {spell.equippedBy !== null ? (
                          <div className="rounded border border-green-600 bg-green-800/30 p-3">
                            <div className="flex items-center gap-2 text-sm">
                              <span className="text-green-300">⚡</span>
                              <span className="font-bold text-green-300">
                                EQUIPPED
                              </span>
                            </div>
                            <div className="text-sm text-green-200">
                              <Link
                                to="/characters/$character-id"
                                params={{ "character-id": spell.equippedBy }}
                                className="hover:text-green-100 hover:underline"
                              >
                                Character ID: {spell.equippedBy.slice(0, 8)}...
                              </Link>
                            </div>
                          </div>
                        ) : (
                          <div className="rounded border border-slate-600 bg-slate-800/50 p-3">
                            <div className="flex items-center gap-2 text-sm">
                              <span className="text-gray-400">📦</span>
                              <span className="font-bold text-gray-400">
                                INVENTORY
                              </span>
                            </div>
                            <div className="text-sm text-gray-300">
                              Ready to equip
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Unequip Button */}
                    {spell.equippedBy !== null && (
                      <div className="mt-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => unequipSpell({ spellId: spell.id })}
                          className="w-full border-red-500 text-red-300 hover:bg-red-500 hover:text-white"
                        >
                          Unequip Spell
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
            </div>
          ) : (
            <div className="text-center">
              <div className="mx-auto mb-6 flex h-32 w-32 items-center justify-center rounded-full bg-gradient-to-br from-slate-800 to-slate-900">
                <span className="text-6xl">🔮</span>
              </div>
              <h3 className="mb-2 text-2xl font-bold text-white">
                No Spells Yet
              </h3>
              <p className="mb-6 text-gray-400">
                Create your first spell to begin your magical journey!
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
