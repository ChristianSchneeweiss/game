import { Button } from "@/components/ui/button";
import { queryClient, trpc } from "@/utils/trpc";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import {
  ArrowRight,
  Crown,
  Gift,
  ScrollText,
  Shield,
  Sparkles,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

dayjs.extend(relativeTime);

export const Route = createFileRoute("/loot")({
  component: RouteComponent,
});

function RouteComponent() {
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const { data: loot, isLoading } = useQuery(trpc.getMyLoot.queryOptions());
  const { mutateAsync: claimLoot } = useMutation(
    trpc.claimLoot.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(trpc.getMyLoot.queryOptions());
      },
    }),
  );

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(251,191,36,0.14),transparent_22%),radial-gradient(circle_at_82%_16%,rgba(96,165,250,0.08),transparent_18%),linear-gradient(180deg,#030712_0%,#111827_46%,#020617_100%)] px-6 py-8 text-stone-100">
      <div className="mx-auto max-w-7xl">
        <section className="relative overflow-hidden rounded-4xl border border-white/10 bg-black/25 p-8 shadow-[0_30px_120px_rgba(0,0,0,0.45)] backdrop-blur-xl sm:p-10">
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-[linear-gradient(rgba(248,250,252,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(248,250,252,0.04)_1px,transparent_1px)] bg-size-[64px_64px] opacity-15"
          />
          <div
            aria-hidden="true"
            className="absolute right-0 top-0 h-56 w-56 rounded-full bg-amber-300/10 blur-3xl"
          />

          <div className="relative grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-end">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-3 rounded-full border border-amber-300/18 bg-amber-300/10 px-4 py-2 text-[0.7rem] font-semibold uppercase tracking-[0.28em] text-amber-100/85">
                <Crown className="h-3.5 w-3.5" />
                Reward archive
              </div>
              <h1 className="mt-5 font-['Iowan_Old_Style','Palatino_Linotype','Book_Antiqua',Palatino,Georgia,serif] text-5xl leading-[0.92] font-semibold tracking-[-0.05em] text-stone-50 sm:text-6xl">
                Claim the haul.
                <br />
                Feed the build.
              </h1>
              <p className="mt-5 max-w-2xl font-['Avenir_Next','Segoe_UI',sans-serif] text-base leading-8 text-stone-300 sm:text-lg">
                Every drop here pushes the roster forward. Review the archive,
                crack open each reward bundle, and move the good stuff into your
                shared pool.
              </p>
            </div>

            <div className="rounded-[1.75rem] border border-white/10 bg-white/5 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-400">
                Archive pulse
              </p>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <SummaryPill label="Drops" value={loot?.length ?? 0} />
                <SummaryPill
                  label="Items"
                  value={loot?.reduce((total, entry) => total + entry.items.length, 0) ?? 0}
                />
              </div>
            </div>
          </div>
        </section>

        {isLoading && (
          <section className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
            {Array.from({ length: 2 }).map((_, index) => (
              <div
                key={index}
                className="rounded-4xl border border-white/10 bg-white/4 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.35)]"
              >
                <div className="h-6 w-40 rounded-full bg-white/8" />
                <div className="mt-5 h-16 rounded-3xl bg-white/6" />
                <div className="mt-5 h-28 rounded-3xl bg-white/6" />
                <div className="mt-5 h-12 rounded-full bg-white/8" />
              </div>
            ))}
          </section>
        )}

        {!isLoading && loot && loot.length === 0 && (
          <section className="mt-8 rounded-4xl border border-dashed border-white/12 bg-white/4 px-6 py-16 text-center shadow-[0_20px_80px_rgba(0,0,0,0.28)]">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-amber-300/20 bg-amber-300/10 text-4xl shadow-[0_12px_40px_rgba(251,191,36,0.16)]">
              🎁
            </div>
            <h2 className="mt-6 font-['Iowan_Old_Style','Palatino_Linotype','Book_Antiqua',Palatino,Georgia,serif] text-4xl text-stone-50">
              No loot waiting.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-stone-400">
              Finish battles and dungeons to start filling this reward archive.
            </p>
          </section>
        )}

        {!isLoading && loot && loot.length > 0 && (
          <section className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
            {loot.map((entry) => (
              <article
                key={entry.id}
                className="relative overflow-hidden rounded-4xl border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.96),rgba(2,6,23,0.98))] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.45)]"
              >
                <div
                  aria-hidden="true"
                  className="absolute inset-x-0 top-0 h-28 bg-[radial-gradient(circle_at_top,rgba(251,191,36,0.18),transparent_72%)] opacity-90"
                />

                <div className="relative">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="flex h-14 w-14 items-center justify-center rounded-3xl border border-amber-300/15 bg-amber-300/10 text-2xl">
                        🎁
                      </div>
                      <div>
                        <p className="text-[0.7rem] font-semibold uppercase tracking-[0.24em] text-amber-100/70">
                          Loot drop
                        </p>
                        <h2 className="mt-1 font-['Iowan_Old_Style','Palatino_Linotype','Book_Antiqua',Palatino,Georgia,serif] text-3xl leading-none text-stone-50">
                          Reward Bundle
                        </h2>
                      </div>
                    </div>

                    <div className="rounded-full border border-white/8 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-stone-300">
                      {entry.items.length} entries
                    </div>
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-3">
                    <InfoTile
                      label="Dropped"
                      value={dayjs(entry.createdAt).fromNow()}
                      icon={<ScrollText className="h-4 w-4" />}
                    />
                    <InfoTile
                      label="Gold"
                      value={
                        typeof entry.gold === "number" ? entry.gold.toString() : "None"
                      }
                      icon={<Crown className="h-4 w-4" />}
                    />
                  </div>

                  <div className="mt-5 rounded-3xl border border-white/8 bg-white/4 p-4">
                    <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-blue-200/80">
                      <Gift className="h-4 w-4" />
                      Contents
                    </div>
                    <div className="space-y-3">
                      {entry.items.map((item, index) => (
                        <div
                          key={`${entry.id}-${index}`}
                          className="flex items-start justify-between gap-4 rounded-3xl border border-white/8 bg-black/20 px-4 py-3"
                        >
                          <div>
                            <div className="inline-flex items-center gap-2 rounded-full border border-white/8 bg-white/5 px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-stone-300">
                              <span>{getLootIcon(item.type)}</span>
                              {item.type}
                            </div>
                            <p className="mt-3 text-sm font-semibold text-stone-100">
                              {getLootLabel(item)}
                            </p>
                          </div>
                          <div className="text-right text-xs uppercase tracking-[0.18em] text-stone-500">
                            Reward
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Button
                    disabled={claimingId === entry.id}
                    onClick={async () => {
                      try {
                        setClaimingId(entry.id);
                        await claimLoot(entry.id);
                        toast.success("Loot claimed.");
                      } catch (error) {
                        const message =
                          error instanceof Error
                            ? error.message
                            : "Failed to claim loot.";
                        toast.error(message);
                      } finally {
                        setClaimingId(null);
                      }
                    }}
                    className="mt-5 h-12 w-full rounded-full border border-amber-300/20 bg-amber-300 px-6 text-sm font-semibold tracking-[0.18em] text-slate-950 uppercase shadow-[0_12px_40px_rgba(251,191,36,0.24)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-amber-200 disabled:translate-y-0 disabled:opacity-60"
                  >
                    {claimingId === entry.id ? "Claiming..." : "Claim loot"}
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </article>
            ))}
          </section>
        )}
      </div>
    </main>
  );
}

function SummaryPill({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-3xl border border-white/8 bg-black/20 p-4 text-center">
      <p className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-stone-500">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold text-stone-50">{value}</p>
    </div>
  );
}

function InfoTile({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-white/8 bg-white/4 p-4">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
        {icon}
        {label}
      </div>
      <p className="mt-2 text-sm font-semibold text-stone-100">{value}</p>
    </div>
  );
}

function getLootLabel(item: {
  type: "SPELL" | "ITEM" | "PASSIVE";
  data: Record<string, string>;
}) {
  if (item.type === "SPELL") {
    return item.data.spellType.replaceAll("-", " ");
  }
  if (item.type === "ITEM") {
    return item.data.itemType.replaceAll("-", " ");
  }
  return item.data.passiveType.replaceAll("-", " ");
}

function getLootIcon(type: "SPELL" | "ITEM" | "PASSIVE") {
  if (type === "SPELL") return "🔮";
  if (type === "ITEM") return "🛡️";
  return "✨";
}
