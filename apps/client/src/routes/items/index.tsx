import { Button } from "@/components/ui/button";
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
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(251,191,36,0.14),transparent_20%),radial-gradient(circle_at_82%_16%,rgba(56,189,248,0.1),transparent_18%),linear-gradient(180deg,#030712_0%,#111827_46%,#020617_100%)] px-6 py-8 text-stone-100">
      <div className="mx-auto max-w-7xl">
        <section className="relative overflow-hidden rounded-4xl border border-white/10 bg-black/25 p-8 shadow-[0_30px_120px_rgba(0,0,0,0.45)] backdrop-blur-xl sm:p-10">
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-[linear-gradient(rgba(248,250,252,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(248,250,252,0.04)_1px,transparent_1px)] bg-size-[64px_64px] opacity-15"
          />
          <div
            aria-hidden="true"
            className="absolute top-0 right-0 h-56 w-56 rounded-full bg-amber-300/10 blur-3xl"
          />

          <div className="relative grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-end">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-3 rounded-full border border-amber-300/18 bg-amber-300/10 px-4 py-2 text-[0.7rem] font-semibold tracking-[0.28em] text-amber-100/85 uppercase">
                <Crown className="h-3.5 w-3.5" />
                Equipment vault
              </div>
              <h1 className="mt-5 font-['Iowan_Old_Style','Palatino_Linotype','Book_Antiqua',Palatino,Georgia,serif] text-5xl leading-[0.92] font-semibold tracking-[-0.05em] text-stone-50 sm:text-6xl">
                Hoard the gear.
                <br />
                Load the roster.
              </h1>
              <p className="mt-5 max-w-2xl font-['Avenir_Next','Segoe_UI',sans-serif] text-base leading-8 text-stone-300 sm:text-lg">
                This is the inventory layer that turns good characters into
                dangerous ones. Track what is equipped, what is idle, and which
                pieces are waiting for the right build.
              </p>
            </div>

            <div className="rounded-[1.75rem] border border-white/10 bg-white/5 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
              <p className="text-xs font-semibold tracking-[0.24em] text-stone-400 uppercase">
                Vault pulse
              </p>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-3xl border border-white/8 bg-black/20 p-4">
                  <p className="text-xs tracking-[0.2em] text-stone-500 uppercase">
                    Total gear
                  </p>
                  <p className="mt-2 text-3xl font-semibold text-stone-50">
                    {sortedEquipment.length}
                  </p>
                </div>
                <div className="rounded-3xl border border-white/8 bg-black/20 p-4">
                  <p className="text-xs tracking-[0.2em] text-stone-500 uppercase">
                    Equipped
                  </p>
                  <p className="mt-2 text-3xl font-semibold text-stone-50">
                    {equippedCount}
                  </p>
                </div>
              </div>

              <Button
                asChild
                className="mt-5 h-12 w-full rounded-full border border-blue-300/20 bg-blue-300 px-6 text-sm font-semibold tracking-[0.18em] text-slate-950 uppercase shadow-[0_12px_40px_rgba(96,165,250,0.28)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-blue-200"
              >
                <Link to="/dungeons">
                  Find more gear
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </section>

        <section className="mt-8">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-3xl border border-amber-300/15 bg-amber-300/10 text-amber-100">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold tracking-[0.24em] text-amber-200/70 uppercase">
                Owned equipment
              </p>
              <h2 className="text-2xl font-semibold tracking-[-0.04em] text-stone-50">
                My Items
              </h2>
            </div>
          </div>

          {isLoading && (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={index}
                  className="rounded-[1.75rem] border border-white/10 bg-white/4 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.35)]"
                >
                  <div className="h-6 w-40 rounded-full bg-white/8" />
                  <div className="mt-5 h-24 rounded-3xl bg-white/6" />
                  <div className="mt-5 grid grid-cols-2 gap-3">
                    <div className="h-16 rounded-3xl bg-white/6" />
                    <div className="h-16 rounded-3xl bg-white/6" />
                  </div>
                  <div className="mt-5 h-12 rounded-full bg-white/8" />
                </div>
              ))}
            </div>
          )}

          {!isLoading && sortedEquipment.length > 0 ? (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
              {sortedEquipment.map((item) => (
                <article
                  key={item.id}
                  className="group relative overflow-hidden rounded-[1.75rem] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.96),rgba(2,6,23,0.98))] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.45)] transition-all duration-300 hover:-translate-y-1 hover:border-amber-300/18"
                >
                  <div
                    aria-hidden="true"
                    className="absolute inset-x-0 top-0 h-28 bg-[radial-gradient(circle_at_top,rgba(251,191,36,0.16),transparent_72%)] opacity-90"
                  />

                  <div className="relative">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <div className="flex h-14 w-14 items-center justify-center rounded-3xl border border-amber-300/15 bg-amber-300/10 text-2xl shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                          {getEquipmentIcon(item.type)}
                        </div>
                        <div>
                          <p className="text-[0.7rem] font-semibold tracking-[0.24em] text-amber-100/70 uppercase">
                            Vault piece
                          </p>
                          <h3 className="mt-1 font-['Iowan_Old_Style','Palatino_Linotype','Book_Antiqua',Palatino,Georgia,serif] text-3xl leading-none text-stone-50">
                            {formatEquipmentName(item.type)}
                          </h3>
                        </div>
                      </div>

                      <div className="rounded-full border border-amber-300/20 bg-amber-300/12 px-3 py-1 text-xs font-semibold tracking-[0.22em] text-amber-100 uppercase">
                        T{item.item.tier}
                      </div>
                    </div>

                    <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-blue-300/14 bg-blue-300/10 px-3 py-1.5 text-xs font-semibold tracking-[0.18em] text-blue-100 uppercase">
                      <Star className="h-3.5 w-3.5" />
                      {formatSlotLabel(item.item.equipmentSlot)}
                    </div>

                    <div className="mt-5 rounded-3xl border border-white/8 bg-white/4 p-4">
                      <div className="mb-3 flex items-center gap-2 text-xs font-semibold tracking-[0.22em] text-blue-200/80 uppercase">
                        <BookOpen className="h-4 w-4" />
                        Description
                      </div>
                      <p className="text-sm leading-7 text-stone-300">
                        {item.item.description}
                      </p>
                    </div>

                    <div className="mt-5 grid grid-cols-2 gap-3">
                      <div className="rounded-3xl border border-blue-300/10 bg-blue-400/6 p-4 text-center">
                        <p className="text-[0.65rem] font-semibold tracking-[0.18em] text-blue-200/70 uppercase">
                          Slot
                        </p>
                        <p className="mt-2 text-sm font-semibold tracking-[0.14em] text-stone-50 uppercase">
                          {formatSlotLabel(item.item.equipmentSlot)}
                        </p>
                      </div>
                      <div className="rounded-3xl border border-amber-300/10 bg-amber-300/6 p-4 text-center">
                        <p className="text-[0.65rem] font-semibold tracking-[0.18em] text-amber-100/70 uppercase">
                          Tier
                        </p>
                        <p className="mt-2 text-2xl font-semibold text-stone-50">
                          {item.item.tier}
                        </p>
                      </div>
                    </div>

                    {item.equippedBy !== null ? (
                      <div className="mt-5 rounded-3xl border border-emerald-300/12 bg-emerald-300/8 p-4">
                        <div className="flex items-center gap-2 text-xs font-semibold tracking-[0.18em] text-emerald-100/80 uppercase">
                          <Sparkles className="h-4 w-4" />
                          Equipped
                        </div>
                        <Link
                          to="/characters/$character-id"
                          params={{ "character-id": item.equippedBy }}
                          className="mt-3 inline-flex items-center gap-2 text-sm text-emerald-100 transition-colors duration-300 hover:text-white"
                        >
                          Holder: {item.equippedBy.slice(0, 8)}...
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                      </div>
                    ) : (
                      <div className="mt-5 rounded-3xl border border-white/8 bg-black/20 p-4">
                        <div className="flex items-center gap-2 text-xs font-semibold tracking-[0.18em] text-stone-400 uppercase">
                          <Swords className="h-4 w-4" />
                          Inventory
                        </div>
                        <p className="mt-3 text-sm text-stone-300">
                          Idle in the vault and ready to be assigned from a
                          character loadout.
                        </p>
                      </div>
                    )}
                  </div>
                </article>
              ))}
            </div>
          ) : null}

          {!isLoading && sortedEquipment.length === 0 && (
            <div className="rounded-4xl border border-dashed border-white/12 bg-white/4 px-6 py-16 text-center shadow-[0_20px_80px_rgba(0,0,0,0.28)]">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-amber-300/20 bg-amber-300/10 text-4xl shadow-[0_12px_40px_rgba(251,191,36,0.16)]">
                ⚔️
              </div>
              <h3 className="mt-6 font-['Iowan_Old_Style','Palatino_Linotype','Book_Antiqua',Palatino,Georgia,serif] text-4xl leading-none text-stone-50">
                The vault is empty.
              </h3>
              <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-stone-400">
                Push deeper into dungeons and battles to start collecting the
                gear that defines your strongest builds.
              </p>
              <Button
                asChild
                className="mt-8 h-12 rounded-full border border-blue-300/20 bg-blue-300 px-6 text-sm font-semibold tracking-[0.18em] text-slate-950 uppercase shadow-[0_12px_40px_rgba(96,165,250,0.28)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-blue-200"
              >
                <Link to="/dungeons">
                  Explore dungeons
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          )}
        </section>
      </div>
    </main>
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
