import { Button } from "@/components/ui/button";
import {
  RpgEmptyState,
  RpgHero,
  RpgInset,
  RpgPage,
  RpgPanel,
  RpgSectionHeading,
  RpgStatTile,
} from "@/components/rpg-ui";
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
    <RpgPage>
      <div className="space-y-8">
        <RpgHero
          eyebrow="Reward archive"
          title={
            <>
              Claim the haul
              <br />
              feed the build
            </>
          }
          description="Every drop pushes the roster forward. Review the archive, crack each bundle open, and move the good stuff into the shared pool."
          aside={
            <RpgInset variant="parchment" className="p-5">
              <p className="rpg-title text-[0.62rem] text-[#cfbf97]/75">
                Archive pulse
              </p>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <RpgStatTile label="Drops" value={loot?.length ?? 0} />
                <RpgStatTile
                  label="Items"
                  value={loot?.reduce((total, entry) => total + entry.items.length, 0) ?? 0}
                />
              </div>
            </RpgInset>
          }
        />

        {isLoading && (
          <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {Array.from({ length: 2 }).map((_, index) => (
              <RpgPanel key={index} className="p-6">
                <div className="h-6 w-40 rounded-full bg-white/8" />
                <div className="mt-5 h-16 rounded-3xl bg-white/6" />
                <div className="mt-5 h-28 rounded-3xl bg-white/6" />
                <div className="mt-5 h-12 rounded-full bg-white/8" />
              </RpgPanel>
            ))}
          </section>
        )}

        {!isLoading && loot && loot.length === 0 && (
          <RpgEmptyState
            icon={<Gift className="h-8 w-8" />}
            title="No loot waiting"
            copy="Finish battles and dungeons to start filling this reward archive."
          />
        )}

        {!isLoading && loot && loot.length > 0 && (
          <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {loot.map((entry) => (
              <RpgPanel key={entry.id} className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="rpg-icon-frame h-14 w-14 text-[#ead7aa]">
                        <Gift className="h-6 w-6" />
                      </div>
                      <div>
                        <p className="rpg-title text-[0.58rem] text-[#cfbf97]/70">
                          Loot drop
                        </p>
                        <h2 className="rpg-heading mt-2 text-3xl leading-none font-semibold uppercase tracking-[0.05em]">
                          Reward Bundle
                        </h2>
                      </div>
                    </div>

                    <div className="rpg-badge">
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

                  <RpgInset variant="parchment" className="mt-5 p-4">
                    <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-[#b6ab92]">
                      <Gift className="h-4 w-4" />
                      Contents
                    </div>
                    <div className="space-y-3">
                      {entry.items.map((item, index) => (
                        <div
                          key={`${entry.id}-${index}`}
                          className="rpg-stone flex items-start justify-between gap-4 px-4 py-3"
                        >
                          <div>
                            <div className="inline-flex items-center gap-2 rounded-full border border-[#8a7753]/28 bg-[#2b241b]/90 px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-[#d8c8a3]">
                              <span>{getLootIcon(item.type)}</span>
                              {item.type}
                            </div>
                            <p className="mt-3 text-sm font-semibold text-[#f1e8d4]">
                              {getLootLabel(item)}
                            </p>
                          </div>
                          <div className="text-right text-xs uppercase tracking-[0.18em] text-[#a89b7f]">
                            Reward
                          </div>
                        </div>
                      ))}
                    </div>
                  </RpgInset>

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
                    variant="relic"
                    size="lg"
                    className="mt-5 w-full disabled:opacity-60"
                  >
                    {claimingId === entry.id ? "Claiming..." : "Claim loot"}
                    <ArrowRight className="h-4 w-4" />
                  </Button>
              </RpgPanel>
            ))}
          </section>
        )}
      </div>
    </RpgPage>
  );
}

function SummaryPill({ label, value }: { label: string; value: number }) {
  return (
    <div className="rpg-stat-tile text-center">
      <p className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-[#b6ab92]">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold text-[#f1e8d4]">{value}</p>
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
    <div className="rpg-stat-tile">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#b6ab92]">
        {icon}
        {label}
      </div>
      <p className="mt-2 text-sm font-semibold text-[#f1e8d4]">{value}</p>
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
