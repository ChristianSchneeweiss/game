import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { queryClient, trpc } from "@/utils/trpc";
import type { DungeonKey } from "@loot-game/game/dungeons/dungeon-keys";
import { useMutation, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import {
  ArrowRight,
  CheckCircle,
  Clock,
  Crown,
  MapPin,
  Play,
  Sword,
  Trash2,
} from "lucide-react";
import { useMemo, useState } from "react";
import { DungeonEnterDialog } from "./-dungeon-enter.dialog";

dayjs.extend(relativeTime);

const dungeonCatalog: {
  key: DungeonKey;
  title: string;
  flavor: string;
  accent: string;
}[] = [
  {
    key: "dungeon1",
    title: "Dungeon 1",
    flavor: "A first descent for testing party rhythm and loadout cohesion.",
    accent: "from-red-500/20 via-red-400/10 to-transparent",
  },
  {
    key: "crypt-of-forgotten-echoes",
    title: "Crypt of Forgotten Echoes",
    flavor: "A hushed tomb of attrition, shadows, and lingering pressure.",
    accent: "from-purple-500/20 via-purple-400/10 to-transparent",
  },
  {
    key: "trial-of-the-ashen",
    title: "Trial of the Ashen",
    flavor: "A punishing gauntlet built around ruin, endurance, and control.",
    accent: "from-slate-400/20 via-orange-300/10 to-transparent",
  },
  {
    key: "trial-of-the-nature",
    title: "Trial of the Nature",
    flavor: "Roots, regeneration, and survival pressure force slower decisions.",
    accent: "from-emerald-500/20 via-green-400/10 to-transparent",
  },
  {
    key: "trial-of-the-storm",
    title: "Trial of the Storm",
    flavor: "Fast turns and sharp burst windows punish bad target priorities.",
    accent: "from-yellow-400/20 via-red-400/10 to-transparent",
  },
  {
    key: "trial-of-the-tides",
    title: "Trial of the Tides",
    flavor: "Fluid tempo shifts and layered pressure define each encounter.",
    accent: "from-cyan-500/20 via-blue-400/10 to-transparent",
  },
] as const;

export const Route = createFileRoute("/dungeons/")({
  component: RouteComponent,
});

function RouteComponent() {
  const [selectedDungeon, setSelectedDungeon] = useState<DungeonKey | null>(null);
  const [removeDungeonId, setRemoveDungeonId] = useState<string | null>(null);

  const { data: dungeons } = useSuspenseQuery(
    trpc.dungeon.allDungeons.queryOptions(),
  );

  const { mutate: removeDungeon } = useMutation(
    trpc.dungeon.removeDungeon.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: trpc.dungeon.allDungeons.queryKey(),
        });
      },
    }),
  );

  const inBattleDungeons = useMemo(() => {
    return dungeons.filter((dungeon) => dungeon.activeBattle === true);
  }, [dungeons]);

  const activeDungeons = useMemo(() => {
    return dungeons.filter(
      (dungeon) => dungeon.cleared === false && dungeon.activeBattle === false,
    );
  }, [dungeons]);

  const clearedDungeons = useMemo(() => {
    return dungeons.filter((dungeon) => dungeon.cleared === true);
  }, [dungeons]);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(251,191,36,0.12),transparent_22%),radial-gradient(circle_at_82%_16%,rgba(96,165,250,0.1),transparent_18%),linear-gradient(180deg,#030712_0%,#111827_46%,#020617_100%)] px-6 py-8 text-stone-100">
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
                Expedition board
              </div>
              <h1 className="mt-5 font-['Iowan_Old_Style','Palatino_Linotype','Book_Antiqua',Palatino,Georgia,serif] text-5xl leading-[0.92] font-semibold tracking-[-0.05em] text-stone-50 sm:text-6xl">
                Choose the descent.
                <br />
                Manage the run.
              </h1>
              <p className="mt-5 max-w-2xl font-['Avenir_Next','Segoe_UI',sans-serif] text-base leading-8 text-stone-300 sm:text-lg">
                Start a new expedition, track active pushes, and keep every
                unfinished dungeon moving without losing the shape of the run.
              </p>
            </div>

            <div className="rounded-[1.75rem] border border-white/10 bg-white/5 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-400">
                Realm pulse
              </p>
              <div className="mt-4 grid grid-cols-3 gap-3">
                <SummaryPill label="Battle" value={inBattleDungeons.length} />
                <SummaryPill label="Active" value={activeDungeons.length} />
                <SummaryPill label="Cleared" value={clearedDungeons.length} />
              </div>
            </div>
          </div>
        </section>

        {inBattleDungeons.length > 0 && (
          <section className="mt-8">
            <SectionHeader
              icon={<Sword className="h-5 w-5" />}
              eyebrow="Immediate pressure"
              title="In Battle Dungeons"
            />
            <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
              {inBattleDungeons.map((dungeon) => (
                <DungeonCard
                  key={dungeon.id}
                  dungeon={dungeon}
                  onDelete={() => setRemoveDungeonId(dungeon.id)}
                />
              ))}
            </div>
          </section>
        )}

        <section className="mt-8">
          <SectionHeader
            icon={<Play className="h-5 w-5" />}
            eyebrow="Fresh descent"
            title="Enter New Dungeons"
          />
          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {dungeonCatalog.map((dungeon) => (
              <button
                key={dungeon.key}
                type="button"
                onClick={() => setSelectedDungeon(dungeon.key)}
                className="group relative overflow-hidden rounded-4xl border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.96),rgba(2,6,23,0.98))] p-6 text-left shadow-[0_24px_80px_rgba(0,0,0,0.45)] transition-all duration-300 hover:-translate-y-1 hover:border-amber-300/18"
              >
                <div
                  aria-hidden="true"
                  className={`absolute inset-x-0 top-0 h-28 bg-linear-to-r ${dungeon.accent} opacity-90`}
                />
                <div className="relative">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-3xl border border-white/10 bg-white/5 text-2xl">
                      🏰
                    </div>
                    <span className="inline-flex items-center gap-2 rounded-full border border-amber-300/16 bg-amber-300/10 px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-amber-100">
                      Begin
                    </span>
                  </div>
                  <h3 className="mt-5 font-['Iowan_Old_Style','Palatino_Linotype','Book_Antiqua',Palatino,Georgia,serif] text-3xl leading-none text-stone-50">
                    {dungeon.title}
                  </h3>
                  <p className="mt-4 text-sm leading-7 text-stone-300">
                    {dungeon.flavor}
                  </p>
                  <div className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-stone-200 transition-transform duration-300 group-hover:translate-x-1">
                    Select party
                    <ArrowRight className="h-4 w-4" />
                  </div>
                </div>
              </button>
            ))}
          </div>
        </section>

        <section className="mt-10">
          <SectionHeader
            icon={<MapPin className="h-5 w-5" />}
            eyebrow="Still running"
            title="Active Dungeons"
          />
          {activeDungeons.length === 0 ? (
            <EmptyBlock
              icon="🗺️"
              title="No active dungeons."
              copy="Start a new run to see unfinished expeditions appear here."
            />
          ) : (
            <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
              {activeDungeons.map((dungeon) => (
                <DungeonCard
                  key={dungeon.id}
                  dungeon={dungeon}
                  onDelete={() => setRemoveDungeonId(dungeon.id)}
                />
              ))}
            </div>
          )}
        </section>

        <section className="mt-10">
          <SectionHeader
            icon={<CheckCircle className="h-5 w-5" />}
            eyebrow="Completed runs"
            title="Cleared Dungeons"
          />
          {clearedDungeons.length === 0 ? (
            <EmptyBlock
              icon="🏆"
              title="No cleared dungeons."
              copy="Finish a full expedition and it will be archived here."
            />
          ) : (
            <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
              {clearedDungeons.map((dungeon) => (
                <DungeonCard
                  key={dungeon.id}
                  dungeon={dungeon}
                  onDelete={() => setRemoveDungeonId(dungeon.id)}
                />
              ))}
            </div>
          )}
        </section>
      </div>

      {selectedDungeon && (
        <DungeonEnterDialog
          dungeonKey={selectedDungeon}
          isOpen={!!selectedDungeon}
          onOpenChange={(open) => !open && setSelectedDungeon(null)}
        />
      )}
      <AlertDialog
        open={!!removeDungeonId}
        onOpenChange={() => setRemoveDungeonId(null)}
      >
        <AlertDialogContent className="border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.98),rgba(2,6,23,1))] text-stone-100">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-stone-50">
              Delete dungeon?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-stone-400">
              This cannot be undone. The dungeon and all its data will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-white/10 bg-white/5 text-stone-200 hover:bg-white/10">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="border border-red-400/20 bg-red-500 text-white hover:bg-red-400"
              onClick={() => removeDungeon({ id: removeDungeonId! })}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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

function EmptyBlock({
  icon,
  title,
  copy,
}: {
  icon: string;
  title: string;
  copy: string;
}) {
  return (
    <div className="mt-6 rounded-4xl border border-dashed border-white/12 bg-white/4 px-6 py-16 text-center shadow-[0_20px_80px_rgba(0,0,0,0.28)]">
      <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-white/12 bg-black/20 text-4xl">
        {icon}
      </div>
      <h3 className="mt-6 font-['Iowan_Old_Style','Palatino_Linotype','Book_Antiqua',Palatino,Georgia,serif] text-4xl text-stone-50">
        {title}
      </h3>
      <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-stone-400">
        {copy}
      </p>
    </div>
  );
}

function DungeonCard({
  dungeon,
  onDelete,
}: {
  dungeon: {
    id: string;
    key: string;
    cleared: boolean;
    round: number;
    guest: boolean;
    createdAt: Date;
    activeBattle: boolean;
  };
  onDelete: () => void;
}) {
  const status = dungeon.cleared
    ? {
        label: "Cleared",
        copy: "Dungeon completed.",
        badge: "border-yellow-300/18 bg-yellow-300/10 text-yellow-100",
      }
    : dungeon.activeBattle
      ? {
          label: "In battle",
          copy: "An encounter is already underway.",
          badge: "border-red-300/18 bg-red-400/10 text-red-100",
        }
      : {
          label: "Active",
          copy: "The run is ready for the next round.",
          badge: "border-emerald-300/18 bg-emerald-300/10 text-emerald-100",
        };

  return (
    <Link
      to="/dungeons/$id"
      params={{ id: dungeon.id }}
      className="group relative overflow-hidden rounded-4xl border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.96),rgba(2,6,23,0.98))] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.45)] transition-all duration-300 hover:-translate-y-1 hover:border-amber-300/18"
    >
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-28 bg-[radial-gradient(circle_at_top,rgba(251,191,36,0.16),transparent_72%)] opacity-90"
      />

      <div className="relative">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-3xl border border-amber-300/15 bg-amber-300/10 text-2xl">
              🏰
            </div>
            <div>
              <p className="text-[0.7rem] font-semibold uppercase tracking-[0.24em] text-amber-100/70">
                Expedition
              </p>
              <h3 className="mt-1 font-['Iowan_Old_Style','Palatino_Linotype','Book_Antiqua',Palatino,Georgia,serif] text-3xl leading-none text-stone-50">
                {dungeon.key.replaceAll("-", " ")}
              </h3>
            </div>
          </div>

          <Button
            size="icon"
            variant="ghost"
            className="h-9 w-9 rounded-full border border-white/8 bg-white/5 text-stone-300 hover:bg-red-500/14 hover:text-red-100"
            onClick={(event) => {
              event.stopPropagation();
              event.preventDefault();
              onDelete();
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>

        <div
          className={`mt-5 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] ${status.badge}`}
        >
          {status.label}
        </div>

        {dungeon.guest && (
          <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-blue-300/18 bg-blue-300/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-blue-100">
            Guest run
          </div>
        )}

        <p className="mt-4 text-sm leading-7 text-stone-300">{status.copy}</p>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-3xl border border-white/8 bg-white/4 p-4">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
              <Clock className="h-3.5 w-3.5" />
              Started
            </div>
            <p className="mt-2 text-sm font-semibold text-stone-100">
              {dayjs(dungeon.createdAt).fromNow()}
            </p>
          </div>
          <div className="rounded-3xl border border-white/8 bg-white/4 p-4">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
              <MapPin className="h-3.5 w-3.5" />
              Round
            </div>
            <p className="mt-2 text-sm font-semibold text-stone-100">
              {dungeon.round + 1}
            </p>
          </div>
        </div>

        <div className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-stone-200 transition-transform duration-300 group-hover:translate-x-1">
          Open dungeon
          <ArrowRight className="h-4 w-4" />
        </div>
      </div>
    </Link>
  );
}
