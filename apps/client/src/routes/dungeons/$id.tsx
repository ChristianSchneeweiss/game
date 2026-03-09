import { Button } from "@/components/ui/button";
import { queryClient, trpc } from "@/utils/trpc";
import { useMutation, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  Shield,
  Sword,
  Users,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/dungeons/$id")({
  component: RouteComponent,
  beforeLoad: async ({ params }) => {
    await queryClient.ensureQueryData(
      trpc.dungeon.getDungeon.queryOptions({ id: params.id }),
    );
  },
});

function RouteComponent() {
  const { id } = Route.useParams();
  const router = useRouter();
  const { mutateAsync: fightDungeon, isPending } = useMutation(
    trpc.dungeon.fightDungeon.mutationOptions({
      onSuccess: async (id) => {
        await queryClient.invalidateQueries({
          queryKey: trpc.dungeon.getDungeon.queryKey({ id }),
        });
        router.navigate({ to: "/battle/$id", params: { id } });
      },
    }),
  );
  const { data: dungeon } = useSuspenseQuery(
    trpc.dungeon.getDungeon.queryOptions({ id }),
  );
  const { data: battles } = useSuspenseQuery(
    trpc.dungeon.getDungeonBattles.queryOptions({ id }),
  );
  const roundEnemies = dungeon.actualEnemies[dungeon.round] ?? [];
  const currentBattle = battles[battles.length - 1];

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(251,191,36,0.12),transparent_20%),radial-gradient(circle_at_82%_16%,rgba(96,165,250,0.1),transparent_18%),linear-gradient(180deg,#030712_0%,#111827_46%,#020617_100%)] px-6 py-8 text-stone-100">
      <div className="mx-auto max-w-7xl">
        <Link
          to="/dungeons"
          className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-stone-300 transition-all duration-300 hover:border-white/20 hover:bg-white/8 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to dungeons
        </Link>

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
                <Shield className="h-3.5 w-3.5" />
                Dungeon run
              </div>
              <h1 className="mt-5 font-['Iowan_Old_Style','Palatino_Linotype','Book_Antiqua',Palatino,Georgia,serif] text-5xl leading-[0.92] font-semibold tracking-[-0.05em] text-stone-50 sm:text-6xl">
                {dungeon.key.replaceAll("-", " ")}
              </h1>
              <p className="mt-5 max-w-2xl font-['Avenir_Next','Segoe_UI',sans-serif] text-base leading-8 text-stone-300 sm:text-lg">
                Round {dungeon.round + 1} is live. Review the party, inspect the
                current enemy pack, and either continue the run or resume the
                active battle.
              </p>
            </div>

            <div className="rounded-[1.75rem] border border-white/10 bg-white/5 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-400">
                Run pulse
              </p>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <SummaryPill label="Round" value={(dungeon.round + 1).toString()} />
                <SummaryPill
                  label="State"
                  value={
                    dungeon.cleared
                      ? "Cleared"
                      : dungeon.activeBattle
                        ? "Battle"
                        : "Ready"
                  }
                />
              </div>

              {dungeon.cleared ? (
                <div className="mt-5 rounded-3xl border border-emerald-300/14 bg-emerald-300/8 p-4 text-sm leading-7 text-emerald-100">
                  This expedition is complete. You can review the battle history
                  below.
                </div>
              ) : dungeon.activeBattle && currentBattle ? (
                <Button
                  asChild
                  className="mt-5 h-12 w-full rounded-full border border-red-300/20 bg-red-400 px-6 text-sm font-semibold tracking-[0.18em] text-slate-950 uppercase shadow-[0_12px_40px_rgba(248,113,113,0.24)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-red-300"
                >
                  <Link to="/battle/$id" params={{ id: currentBattle.battleId }}>
                    Resume battle
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              ) : (
                <Button
                  disabled={roundEnemies.length === 0 || isPending}
                  onClick={async () => {
                    try {
                      await fightDungeon({ id });
                    } catch (error) {
                      const message =
                        error instanceof Error
                          ? error.message
                          : "Failed to start dungeon battle.";
                      toast.error(message);
                    }
                  }}
                  className="mt-5 h-12 w-full rounded-full border border-amber-300/20 bg-amber-300 px-6 text-sm font-semibold tracking-[0.18em] text-slate-950 uppercase shadow-[0_12px_40px_rgba(251,191,36,0.24)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-amber-200 disabled:translate-y-0 disabled:opacity-60"
                >
                  {isPending ? "Starting..." : "Start battle"}
                </Button>
              )}
            </div>
          </div>
        </section>

        {!dungeon.cleared && (
          <div className="mt-8 grid gap-8 xl:grid-cols-2">
            <section className="rounded-4xl border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.96),rgba(2,6,23,0.98))] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
              <SectionHeader
                icon={<Users className="h-5 w-5" />}
                eyebrow="Party side"
                title="Your Team"
              />
              <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
                {dungeon.playerTeam.map((player) => (
                  <EntityCard
                    key={player.id}
                    name={player.name}
                    health={`${player.health}/${player.maxHealth}`}
                    mana={`${player.mana}/${player.maxMana}`}
                    tone="blue"
                  />
                ))}
              </div>
            </section>

            <section className="rounded-4xl border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.96),rgba(2,6,23,0.98))] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
              <SectionHeader
                icon={<Sword className="h-5 w-5" />}
                eyebrow="Current round"
                title="Enemies"
              />
              {roundEnemies.length > 0 ? (
                <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {roundEnemies.map((enemy) => (
                    <EntityCard
                      key={enemy.id}
                      name={enemy.name}
                      health={`${enemy.health}/${enemy.maxHealth}`}
                      mana={`${enemy.mana}/${enemy.maxMana}`}
                      tone="red"
                    />
                  ))}
                </div>
              ) : (
                <EmptyPanel copy="No enemies remain in this round." />
              )}
            </section>
          </div>
        )}

        <section className="mt-8 rounded-4xl border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.96),rgba(2,6,23,0.98))] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
          <SectionHeader
            icon={<CheckCircle className="h-5 w-5" />}
            eyebrow="Timeline"
            title="Battle History"
          />
          {battles.length === 0 ? (
            <EmptyPanel copy="No battles have been recorded for this dungeon yet." />
          ) : (
            <div className="mt-6 space-y-3">
              {battles.map((battle, index) => (
                <Link
                  to="/battle/$id"
                  params={{ id: battle.battleId }}
                  key={battle.id}
                  className="group flex items-center justify-between rounded-3xl border border-white/8 bg-white/4 px-4 py-4 transition-all duration-300 hover:border-blue-300/16 hover:bg-white/6"
                >
                  <div>
                    <p className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-stone-500">
                      Battle {index + 1}
                    </p>
                    <p className="mt-1 font-mono text-sm text-stone-100">
                      {battle.battleId}
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-stone-500 transition-transform duration-300 group-hover:translate-x-1 group-hover:text-blue-200" />
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function SummaryPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-white/8 bg-black/20 p-4 text-center">
      <p className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-stone-500">
        {label}
      </p>
      <p className="mt-2 text-lg font-semibold text-stone-50">{value}</p>
    </div>
  );
}

function SectionHeader({
  icon,
  eyebrow,
  title,
}: {
  icon: React.ReactNode;
  eyebrow: string;
  title: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-11 w-11 items-center justify-center rounded-3xl border border-white/8 bg-white/4 text-amber-100">
        {icon}
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-200/70">
          {eyebrow}
        </p>
        <h2 className="text-2xl font-semibold tracking-[-0.04em] text-stone-50">
          {title}
        </h2>
      </div>
    </div>
  );
}

function EntityCard({
  name,
  health,
  mana,
  tone,
}: {
  name: string;
  health: string;
  mana: string;
  tone: "blue" | "red";
}) {
  const palette =
    tone === "blue"
      ? {
          border: "border-blue-300/10",
          bg: "bg-blue-400/6",
          hp: "text-red-200/80",
          mana: "text-blue-200/80",
          label: "text-blue-200/80",
          icon: "🛡️",
        }
      : {
          border: "border-red-300/10",
          bg: "bg-red-400/6",
          hp: "text-red-200/80",
          mana: "text-blue-200/80",
          label: "text-red-200/80",
          icon: "⚔️",
        };

  return (
    <div className={`rounded-3xl border p-4 ${palette.border} ${palette.bg}`}>
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-3xl border border-white/8 bg-black/20 text-xl">
          {palette.icon}
        </div>
        <div>
          <p className={`text-[0.65rem] font-semibold uppercase tracking-[0.18em] ${palette.label}`}>
            Combatant
          </p>
          <h3 className="text-xl font-semibold text-stone-50">{name}</h3>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-white/8 bg-black/20 p-3">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-red-200/80">
            <Shield className="h-3.5 w-3.5" />
            Health
          </div>
          <p className="mt-2 text-sm font-semibold text-stone-100">{health}</p>
        </div>
        <div className="rounded-2xl border border-white/8 bg-black/20 p-3">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-blue-200/80">
            <Zap className="h-3.5 w-3.5" />
            Mana
          </div>
          <p className="mt-2 text-sm font-semibold text-stone-100">{mana}</p>
        </div>
      </div>
    </div>
  );
}

function EmptyPanel({ copy }: { copy: string }) {
  return (
    <div className="mt-6 rounded-3xl border border-dashed border-white/10 bg-white/4 px-5 py-12 text-center text-sm leading-7 text-stone-400">
      {copy}
    </div>
  );
}
