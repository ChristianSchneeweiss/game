import { Button } from "@/components/ui/button";
import {
  RpgBadge,
  RpgEmptyState,
  RpgHero,
  RpgInset,
  RpgPage,
  RpgPanel,
  RpgSectionHeading,
  RpgStatTile,
} from "@/components/rpg-ui";
import { trpc } from "@/utils/trpc";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BookOpen,
  Crown,
  Shield,
  Sparkles,
  Star,
  Swords,
} from "lucide-react";

export const Route = createFileRoute("/items/")({
  component: RouteComponent,
});

function RouteComponent() {
  const { data: equipment, isLoading } = useQuery(
    trpc.getMyEquipment.queryOptions(),
  );
  const sortedEquipment = [...(equipment ?? [])].sort((a, b) =>
    a.type.localeCompare(b.type),
  );
  const equippedCount = sortedEquipment.filter(
    (item) => item.equippedBy !== null,
  ).length;

  return (
    <RpgPage>
      <div className="space-y-8">
        <RpgHero
          eyebrow="Equipment vault"
          title={
            <>
              Hoard the gear
              <br />
              load the roster
            </>
          }
          description="This vault turns good characters into dangerous ones. Track what is equipped, what is idle, and which relics are waiting for the right build."
          aside={
            <RpgInset variant="parchment" className="p-5">
              <p className="rpg-title text-[0.62rem] text-[#cfbf97]/75">Vault pulse</p>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <RpgStatTile label="Total gear" value={sortedEquipment.length} />
                <RpgStatTile label="Equipped" value={equippedCount} />
              </div>
              <Button asChild variant="outline" size="lg" className="mt-5 w-full border-[#3ca6ff]/30 bg-[#3ca6ff]/10 text-[#9bd0ff] hover:bg-[#3ca6ff]/18">
                <Link to="/dungeons">
                  Find more gear
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </RpgInset>
          }
        />

        <section>
          <RpgSectionHeading
            icon={<Shield className="h-5 w-5" />}
            eyebrow="Owned equipment"
            title="My items"
          />

          {isLoading && (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <RpgPanel key={index} className="p-6">
                  <div className="h-6 w-40 rounded-full bg-white/8" />
                  <div className="mt-5 h-24 rounded-3xl bg-white/6" />
                  <div className="mt-5 grid grid-cols-2 gap-3">
                    <div className="h-16 rounded-3xl bg-white/6" />
                    <div className="h-16 rounded-3xl bg-white/6" />
                  </div>
                  <div className="mt-5 h-12 rounded-full bg-white/8" />
                </RpgPanel>
              ))}
            </div>
          )}

          {!isLoading && sortedEquipment.length > 0 ? (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
              {sortedEquipment.map((item) => (
                <RpgPanel
                  key={item.id}
                  className="group p-6 transition-all duration-200 hover:border-[#b89656]/50"
                >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <div className="rpg-icon-frame h-14 w-14 text-[#ead7aa] text-2xl">
                          {getEquipmentIcon(item.type)}
                        </div>
                        <div>
                          <p className="rpg-title text-[0.58rem] text-[#cfbf97]/70">
                            Vault piece
                          </p>
                          <h3 className="rpg-heading mt-2 text-3xl leading-none font-semibold uppercase tracking-[0.05em]">
                            {formatEquipmentName(item.type)}
                          </h3>
                        </div>
                      </div>

                      <RpgBadge>
                        T{item.item.tier}
                      </RpgBadge>
                    </div>

                    <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-[#3ca6ff]/30 bg-[#3ca6ff]/10 px-3 py-1.5 text-xs font-semibold tracking-[0.18em] text-[#9bd0ff] uppercase">
                      <Star className="h-3.5 w-3.5" />
                      {formatSlotLabel(item.item.equipmentSlot)}
                    </div>

                    <RpgInset variant="parchment" className="mt-5 p-4">
                      <div className="mb-3 flex items-center gap-2 text-xs font-semibold tracking-[0.22em] text-[#b6ab92] uppercase">
                        <BookOpen className="h-4 w-4" />
                        Description
                      </div>
                      <p className="rpg-copy text-sm leading-7">
                        {item.item.description}
                      </p>
                    </RpgInset>

                    <div className="mt-5 grid grid-cols-2 gap-3">
                      <div className="rpg-stat-tile text-center">
                        <p className="text-[0.65rem] font-semibold tracking-[0.18em] text-[#9bd0ff] uppercase">
                          Slot
                        </p>
                        <p className="mt-2 text-sm font-semibold tracking-[0.14em] text-[#f1e8d4] uppercase">
                          {formatSlotLabel(item.item.equipmentSlot)}
                        </p>
                      </div>
                      <div className="rpg-stat-tile text-center">
                        <p className="text-[0.65rem] font-semibold tracking-[0.18em] text-[#ead7aa] uppercase">
                          Tier
                        </p>
                        <p className="mt-2 text-2xl font-semibold text-[#f1e8d4]">
                          {item.item.tier}
                        </p>
                      </div>
                    </div>

                    {item.equippedBy !== null ? (
                      <RpgInset variant="stone" className="mt-5 p-4">
                        <div className="flex items-center gap-2 text-xs font-semibold tracking-[0.18em] text-[#b2d58e] uppercase">
                          <Sparkles className="h-4 w-4" />
                          Equipped
                        </div>
                        <Link
                          to="/characters/$character-id"
                          params={{ "character-id": item.equippedBy }}
                          className="mt-3 inline-flex items-center gap-2 text-sm text-[#b2d58e] transition-colors duration-200 hover:text-[#d6efbf]"
                        >
                          Holder: {item.equippedBy.slice(0, 8)}...
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                      </RpgInset>
                    ) : (
                      <RpgInset variant="stone" className="mt-5 p-4">
                        <div className="flex items-center gap-2 text-xs font-semibold tracking-[0.18em] text-[#b6ab92] uppercase">
                          <Swords className="h-4 w-4" />
                          Inventory
                        </div>
                        <p className="rpg-copy mt-3 text-sm">
                          Idle in the vault and ready to be assigned from a
                          character loadout.
                        </p>
                      </RpgInset>
                    )}
                </RpgPanel>
              ))}
            </div>
          ) : null}

          {!isLoading && sortedEquipment.length === 0 && (
            <RpgEmptyState
              icon={<Shield className="h-8 w-8" />}
              title="The vault is empty"
              copy="Push deeper into dungeons and battles to start collecting the gear that defines your strongest builds."
              action={
                <Button asChild variant="outline" size="lg" className="border-[#3ca6ff]/30 bg-[#3ca6ff]/10 text-[#9bd0ff] hover:bg-[#3ca6ff]/18">
                  <Link to="/dungeons">
                    Explore dungeons
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              }
            />
          )}
        </section>
      </div>
    </RpgPage>
  );
}

// Helper function to get equipment icons
function getEquipmentIcon(type: string): string {
  const icons: Record<string, string> = {
    "int-armor": "🛡️",
    "int-weapon": "🪄",
    "str-weapon": "🪓",
    "dex-weapon": "🏹",
    helmet: "⛑️",
    cloak: "🧥",
    boots: "👢",
    gloves: "🧤",
    ring: "💍",
    amulet: "🔮",
    belt: "🪢",
  };
  return icons[type] || "⚔️";
}

function formatEquipmentName(type: string): string {
  return type.replaceAll("-", " ");
}

function formatSlotLabel(slot: string): string {
  return slot.replaceAll("_", " ");
}
