import { Button } from "@/components/ui/button";
import { trpc } from "@/utils/trpc";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Shield, Star } from "lucide-react";

export const Route = createFileRoute("/items/")({
  component: RouteComponent,
});

function RouteComponent() {
  const { data: equipment } = useQuery(trpc.getMyEquipment.queryOptions());

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
      {/* Header Section */}
      <div className="mb-8 text-center">
        <h1 className="mb-2 bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-4xl font-bold text-transparent">
          ⚔️ EQUIPMENT VAULT ⚔️
        </h1>
        <div className="mx-auto h-1 w-32 rounded-full bg-gradient-to-r from-yellow-400 to-orange-500"></div>
      </div>

      <div className="mx-auto max-w-6xl">
        {/* Equipment Section */}
        <div className="mb-6">
          <h2 className="mb-6 flex items-center gap-2 text-2xl font-bold text-purple-300">
            <Shield className="h-6 w-6" />
            MY EQUIPMENT
          </h2>
          {equipment && equipment.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {equipment
                .sort((a, b) => a.type.localeCompare(b.type))
                .map((item) => (
                  <div
                    key={item.id}
                    className="group relative rounded-xl border-2 bg-gradient-to-br from-slate-800/90 to-slate-900/90 p-6 shadow-2xl backdrop-blur-sm transition-all duration-300 hover:scale-105"
                  >
                    {/* Equipment Header */}
                    <div className="mb-4 flex items-center gap-3">
                      <span className="text-3xl">
                        {getEquipmentIcon(item.type)}
                      </span>
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-white capitalize">
                          {item.type.replace("-", " ")}
                        </h3>
                        <div className="flex items-center gap-2">
                          <Star className="h-4 w-4 text-yellow-400" />
                          <span className="text-sm font-bold text-yellow-400">
                            EQUIPMENT | {item.item.equipmentSlot}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Equipment Info */}
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
                            {item.item.description}
                          </div>
                        </div>

                        {/* Stats Grid */}
                        <div className="mb-4 grid grid-cols-2 gap-3 text-xs">
                          <div className="rounded bg-blue-900/40 p-2 text-center">
                            <div className="text-blue-300">Slot</div>
                            <div className="font-bold text-blue-100">
                              {item.item.equipmentSlot}
                            </div>
                          </div>
                          <div className="rounded bg-blue-900/40 p-2 text-center">
                            <div className="text-blue-300">Tier</div>
                            <div className="font-bold text-blue-100">
                              {item.item.tier}
                            </div>
                          </div>
                        </div>

                        {/* Status */}
                        {item.equippedBy !== null ? (
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
                                params={{ "character-id": item.equippedBy }}
                                className="hover:text-green-100 hover:underline"
                              >
                                Character ID: {item.equippedBy.slice(0, 8)}...
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

                    {/* Action Buttons */}
                    <div className="mt-4 flex gap-2">
                      {item.equippedBy !== null ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 border-red-500 text-red-300 hover:bg-red-500 hover:text-white"
                        >
                          Unequip
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 border-green-500 text-green-300 hover:bg-green-500 hover:text-white"
                        >
                          Equip
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-blue-500 text-blue-300 hover:bg-blue-500 hover:text-white"
                      >
                        Info
                      </Button>
                    </div>
                  </div>
                ))}
            </div>
          ) : (
            <div className="text-center">
              <div className="mx-auto mb-6 flex h-32 w-32 items-center justify-center rounded-full bg-gradient-to-br from-slate-800 to-slate-900">
                <span className="text-6xl">⚔️</span>
              </div>
              <h3 className="mb-2 text-2xl font-bold text-white">
                No Equipment Yet
              </h3>
              <p className="mb-6 text-gray-400">
                Complete dungeons and battles to discover powerful equipment!
              </p>
              <Button className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700">
                Explore Dungeons
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Helper function to get equipment icons
function getEquipmentIcon(type: string): string {
  const icons: Record<string, string> = {
    "int-armor": "🛡️",
  };
  return icons[type] || "⚔️";
}
