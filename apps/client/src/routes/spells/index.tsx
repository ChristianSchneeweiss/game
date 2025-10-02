import { Button } from "@/components/ui/button";
import { queryClient, trpc } from "@/utils/trpc";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Shield, Star, Zap } from "lucide-react";

export const Route = createFileRoute("/spells/")({
  component: RouteComponent,
});

function RouteComponent() {
  const { data: _spells } = useQuery(trpc.getMySpells.queryOptions());
  const spells = _spells?.grouped;

  const { data: _passiveSkills } = useQuery(
    trpc.getMyPassiveSkills.queryOptions(),
  );
  const passiveSkills = _passiveSkills?.grouped;

  const { mutateAsync: createSpell } = useMutation(
    trpc.createSpell.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries(trpc.getMySpells.queryOptions());
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
        <Button onClick={() => createSpell()}>Create Spells</Button>
      </div>

      <div className="mx-auto max-w-6xl">
        {/* My Spells Section */}
        <div className="mb-6">
          <h2 className="mb-6 flex items-center gap-2 text-2xl font-bold text-purple-300">
            <Zap className="h-6 w-6" />
            MY SPELLS
          </h2>
          {spells && spells.size > 0 ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {spells.entries().map(([type, { spell, ids }]) => (
                <div
                  key={type}
                  className="group relative rounded-xl border-2 bg-gradient-to-br from-slate-800/90 to-slate-900/90 p-6 shadow-2xl backdrop-blur-sm transition-all duration-300 hover:scale-105"
                >
                  {/* Spell Header */}
                  <div className="mb-4 flex items-center gap-3">
                    <span className="text-3xl">🔮</span>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-white capitalize">
                        {type.replace("-", " ")}{" "}
                        <span className="text-xs text-gray-400">
                          ({ids.length})
                        </span>
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
                    </div>
                  </div>
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

        {/* Passive Skills Section */}
        <div className="mb-6">
          <h2 className="mb-6 flex items-center gap-2 text-2xl font-bold text-purple-300">
            <Shield className="h-6 w-6" />
            PASSIVE SKILLS
          </h2>
          {passiveSkills && passiveSkills.size > 0 ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {passiveSkills.entries().map(([type, { passiveSkill, ids }]) => (
                <div
                  key={type}
                  className="group relative rounded-xl border-2 bg-gradient-to-br from-slate-800/90 to-slate-900/90 p-6 shadow-2xl backdrop-blur-sm transition-all duration-300 hover:scale-105"
                >
                  {/* Passive Header */}
                  <div className="mb-4 flex items-center gap-3">
                    <span className="text-3xl">🛡️</span>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-white capitalize">
                        {type.replace("-", " ")}{" "}
                        <span className="text-xs text-gray-400">
                          ({ids.length})
                        </span>
                      </h3>
                      <div className="flex items-center gap-2">
                        <Star className="h-4 w-4 text-yellow-400" />
                        <span className="text-sm font-bold text-yellow-400">
                          PASSIVE SKILL
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Passive Info */}
                  <div className="mb-4">
                    <div className="rounded-lg p-4">
                      {/* Description */}
                      <div className="mb-4">
                        <div className="mb-2 flex items-center gap-2 text-sm">
                          <span className="text-green-300">📖</span>
                          <span className="font-bold text-green-300">
                            DESCRIPTION
                          </span>
                        </div>
                        <div className="text-sm text-green-200">MISSING</div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center">
              <div className="mx-auto mb-6 flex h-32 w-32 items-center justify-center rounded-full bg-gradient-to-br from-slate-800 to-slate-900">
                <span className="text-6xl">🛡️</span>
              </div>
              <h3 className="mb-2 text-2xl font-bold text-white">
                No Passive Skills Yet
              </h3>
              <p className="mb-6 text-gray-400">
                Discover your first passive skill to enhance your abilities!
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Helper function to get passive skill descriptions
function getPassiveDescription(type: string): string {
  const descriptions: Record<string, string> = {
    "armor-up": "Increases armor by 20%",
    "thorn-carapace": "Reflects damage back to attackers",
    "blessed-fortune": "Increases blessed by 5",
    bloodfang: "Gains life steal on attacks",
    soulleech: "Drains mana from enemies",
    "mystic-flow": "Increases mana regeneration",
    "vital-wellspring": "Increases health regeneration",
    "stoneform-resolve": "Gains damage reduction",
    "titans-resurgence": "Increases strength and vitality",
    "keen-instincts": "Increases critical hit chance",
  };
  return descriptions[type] || "A powerful passive ability";
}
