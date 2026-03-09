import {
  RpgEmptyState,
  RpgHero,
  RpgInset,
  RpgPage,
  RpgSectionHeading,
} from "@/components/rpg-ui";
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
import { cn } from "@/lib/utils";
import { queryClient, trpc } from "@/utils/trpc";
import type { DungeonKey } from "@loot-game/game/dungeons/dungeon-keys";
import { useMutation, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import {
  ArrowRight,
  CheckCircle,
  ChevronDown,
  Clock,
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
  recommendedMinLevel: number;
  recommendedMaxLevel: number;
  threat: string;
}[] = [
  {
    key: "dungeon1",
    title: "Avalanche Lair",
    flavor: "Avalanche Lair is a dungeon that is home to the avalanche lizard. It is a dangerous place to explore, and the lizards are known to be aggressive.",
    accent: "from-red-500/20 via-red-400/10 to-transparent",
    recommendedMinLevel: 1,
    recommendedMaxLevel: 2,
    threat: "Foundational",
  },
  {
    key: "crypt-of-forgotten-echoes",
    title: "Crypt of Forgotten Echoes",
    flavor: "A hushed tomb of attrition, shadows, and lingering pressure.",
    accent: "from-purple-500/20 via-purple-400/10 to-transparent",
    recommendedMinLevel: 2,
    recommendedMaxLevel: 3,
    threat: "Measured",
  },
  {
    key: "trial-of-the-ashen",
    title: "Trial of the Ashen",
    flavor: "A punishing gauntlet built around ruin, endurance, and control.",
    accent: "from-slate-400/20 via-orange-300/10 to-transparent",
    recommendedMinLevel: 4,
    recommendedMaxLevel: 5,
    threat: "Harsh",
  },
  {
    key: "trial-of-the-nature",
    title: "Trial of the Nature",
    flavor: "Roots, regeneration, and survival pressure force slower decisions.",
    accent: "from-emerald-500/20 via-green-400/10 to-transparent",
    recommendedMinLevel: 5,
    recommendedMaxLevel: 6,
    threat: "Sustained",
  },
  {
    key: "trial-of-the-storm",
    title: "Trial of the Storm",
    flavor: "Fast turns and sharp burst windows punish bad target priorities.",
    accent: "from-yellow-400/20 via-red-400/10 to-transparent",
    recommendedMinLevel: 6,
    recommendedMaxLevel: 7,
    threat: "Volatile",
  },
  {
    key: "trial-of-the-tides",
    title: "Trial of the Tides",
    flavor: "Fluid tempo shifts and layered pressure define each encounter.",
    accent: "from-cyan-500/20 via-blue-400/10 to-transparent",
    recommendedMinLevel: 7,
    recommendedMaxLevel: 9,
    threat: "Advanced",
  },
] as const;

export const Route = createFileRoute("/dungeons/")({
  component: RouteComponent,
});

function RouteComponent() {
  const [selectedDungeon, setSelectedDungeon] = useState<DungeonKey | null>(null);
  const [removeDungeonId, setRemoveDungeonId] = useState<string | null>(null);
  const [entryTab, setEntryTab] = useState<"recommended" | "others">("recommended");
  const [expandedClearedId, setExpandedClearedId] = useState<string | null>(null);

  const { data: dungeons } = useSuspenseQuery(
    trpc.dungeon.allDungeons.queryOptions(),
  );
  const { data: characters } = useSuspenseQuery(
    trpc.character.getCharacters.queryOptions(),
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

  const rosterLevel = useMemo(() => {
    if (characters.length === 0) return 1;

    const topLevels = [...characters]
      .map((character) => character.level)
      .sort((a, b) => b - a)
      .slice(0, 3);

    return Math.max(
      1,
      Math.round(topLevels.reduce((sum, level) => sum + level, 0) / topLevels.length),
    );
  }, [characters]);

  const recommendedDungeonKeys = useMemo(() => {
    const exactMatches = dungeonCatalog.filter(
      (dungeon) =>
        rosterLevel >= dungeon.recommendedMinLevel &&
        rosterLevel <= dungeon.recommendedMaxLevel,
    );

    if (exactMatches.length > 0) {
      return new Set(exactMatches.map((dungeon) => dungeon.key));
    }

    const nearbyMatches = dungeonCatalog
      .filter((dungeon) => rosterLevel >= dungeon.recommendedMinLevel - 1)
      .slice(0, 3);

    return new Set(nearbyMatches.map((dungeon) => dungeon.key));
  }, [rosterLevel]);

  const recommendedDungeons = dungeonCatalog.filter((dungeon) =>
    recommendedDungeonKeys.has(dungeon.key),
  );
  const otherDungeons = dungeonCatalog.filter(
    (dungeon) => !recommendedDungeonKeys.has(dungeon.key),
  );
  const visibleEntryDungeons =
    entryTab === "recommended" ? recommendedDungeons : otherDungeons;

  return (
    <RpgPage>
      <div className="space-y-8">
        <RpgHero
          eyebrow="Expedition board"
          title={
            <>
              Choose the descent
              <br />
              manage the run
            </>
          }
          description="Start a new expedition, track active pushes, and keep every unfinished dungeon moving without losing the shape of the run."
          aside={
            <RpgInset variant="parchment" className="p-5">
              <p className="rpg-title text-[0.62rem] text-[#cfbf97]/75">
                Realm pulse
              </p>
              <div className="mt-4 grid grid-cols-3 gap-3">
                <SummaryPill label="Battle" value={inBattleDungeons.length} />
                <SummaryPill label="Active" value={activeDungeons.length} />
                <SummaryPill label="Cleared" value={clearedDungeons.length} />
              </div>
            </RpgInset>
          }
        />

        {inBattleDungeons.length > 0 && (
          <section>
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

        <section>
          <SectionHeader
            icon={<Play className="h-5 w-5" />}
            eyebrow="Fresh descent"
            title="Enter New Dungeons"
          />
          <RpgInset variant="stone" className="mt-6 p-2">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {dungeonEntryTabs.map((tab) => (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => setEntryTab(tab.value)}
                  className={cn(
                    "rounded-[1.1rem] border px-4 py-3 text-left transition-all duration-200",
                    entryTab === tab.value
                      ? "border-[#b89656]/45 bg-[#3a3023]/95 text-[#f1e8d4] shadow-[inset_0_1px_0_rgba(255,239,201,0.06)]"
                      : "border-[#8a7753]/20 bg-[#241d15]/78 text-[#b8aa89] hover:border-[#8a7753]/38 hover:bg-[#2c241b]/92 hover:text-[#e6d6b0]",
                  )}
                >
                  <p className="rpg-title text-[0.58rem] text-current/70">{tab.eyebrow}</p>
                  <p className="mt-1 text-lg font-semibold uppercase tracking-[0.05em]">
                    {tab.label}
                  </p>
                </button>
              ))}
            </div>
          </RpgInset>

          {entryTab === "recommended" ? (
            <div className="mt-4">
              <RpgInset variant="parchment" className="p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="rpg-title text-[0.58rem] text-[#cfbf97]/70">
                      Roster read
                    </p>
                    <p className="mt-1 text-sm text-[#d9ccb0]">
                      Recommendations are tuned around a roster level of{" "}
                      <span className="font-semibold text-[#f1e8d4]">{rosterLevel}</span>.
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-2 rounded-full border border-[#8a7753]/35 bg-[#8a7753]/12 px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-[#ead7aa]">
                    Best fit
                  </span>
                </div>
              </RpgInset>
            </div>
          ) : null}

          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {visibleEntryDungeons.map((dungeon) => (
              <DungeonEntryCard
                key={dungeon.key}
                dungeon={dungeon}
                recommended={recommendedDungeonKeys.has(dungeon.key)}
                onSelect={() => setSelectedDungeon(dungeon.key)}
              />
            ))}
          </div>
        </section>

        <section>
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

        <section>
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
            <div className="mt-6 space-y-4">
              {clearedDungeons.map((dungeon) => (
                <ClearedDungeonRow
                  key={dungeon.id}
                  dungeon={dungeon}
                  expanded={expandedClearedId === dungeon.id}
                  onToggle={() =>
                    setExpandedClearedId((current) =>
                      current === dungeon.id ? null : dungeon.id,
                    )
                  }
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
    </RpgPage>
  );
}

const dungeonEntryTabs = [
  { value: "recommended" as const, label: "Recommended", eyebrow: "Fitting now" },
  { value: "others" as const, label: "Others", eyebrow: "All remaining" },
];

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
    <RpgSectionHeading icon={icon} eyebrow={eyebrow} title={title} />
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
    <div className="mt-6">
      <RpgEmptyState icon={icon} title={title} copy={copy} />
    </div>
  );
}

function DungeonEntryCard({
  dungeon,
  recommended,
  onSelect,
}: {
  dungeon: (typeof dungeonCatalog)[number];
  recommended: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="rpg-panel group relative p-6 text-left transition-all duration-200 hover:border-[#b89656]/50"
    >
      <div
        aria-hidden="true"
        className={`absolute inset-x-0 top-0 h-28 bg-linear-to-r ${dungeon.accent} opacity-90`}
      />
      <div className="relative">
        <div className="flex items-center justify-between gap-3">
          <div className="rpg-icon-frame h-12 w-12 text-[#ead7aa]">
            <MapPin className="h-5 w-5" />
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            {recommended ? (
              <span className="inline-flex items-center gap-2 rounded-full border border-[#5c8f3a]/35 bg-[#5c8f3a]/12 px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-[#b2d58e]">
                Recommended
              </span>
            ) : null}
            <span className="inline-flex items-center gap-2 rounded-full border border-[#8a7753]/35 bg-[#8a7753]/12 px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-[#ead7aa]">
              Begin
            </span>
          </div>
        </div>
        <h3 className="rpg-heading mt-5 text-3xl leading-none font-semibold uppercase tracking-[0.05em]">
          {dungeon.title}
        </h3>
        <p className="mt-3 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-[#cfbf97]/72">
          Suggested level {dungeon.recommendedMinLevel}
          {dungeon.recommendedMinLevel !== dungeon.recommendedMaxLevel
            ? `-${dungeon.recommendedMaxLevel}`
            : "+"}
          {" · "}
          {dungeon.threat} pressure
        </p>
        <p className="rpg-copy mt-4 text-sm leading-7">
          {dungeon.flavor}
        </p>
        <div className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-[#ead7aa] transition-transform duration-300 group-hover:translate-x-1">
          Select party
          <ArrowRight className="h-4 w-4" />
        </div>
      </div>
    </button>
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
      className="rpg-panel group relative p-6 transition-all duration-200 hover:border-[#b89656]/50"
    >
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-28 bg-[radial-gradient(circle_at_top,rgba(251,191,36,0.16),transparent_72%)] opacity-90"
      />

      <div className="relative">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="rpg-icon-frame h-14 w-14 text-[#ead7aa]">
              <MapPin className="h-5 w-5" />
            </div>
            <div>
              <p className="rpg-title text-[0.58rem] text-[#cfbf97]/70">
                Expedition
              </p>
              <h3 className="rpg-heading mt-2 text-3xl leading-none font-semibold uppercase tracking-[0.05em]">
                {dungeon.key.replaceAll("-", " ")}
              </h3>
            </div>
          </div>

          <Button
            size="icon"
            variant="ghostRelic"
            className="h-9 w-9 border-[#8f342a]/30 bg-[#8f342a]/10 text-[#f0c8be] hover:bg-[#8f342a]/16 hover:text-[#f4dbd4]"
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
          <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-[#3ca6ff]/30 bg-[#3ca6ff]/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-[#9bd0ff]">
            Guest run
          </div>
        )}

        <p className="rpg-copy mt-4 text-sm leading-7">{status.copy}</p>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="rpg-stat-tile">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#b6ab92]">
              <Clock className="h-3.5 w-3.5" />
              Started
            </div>
            <p className="mt-2 text-sm font-semibold text-[#f1e8d4]">
              {dayjs(dungeon.createdAt).fromNow()}
            </p>
          </div>
          <div className="rpg-stat-tile">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#b6ab92]">
              <MapPin className="h-3.5 w-3.5" />
              Round
            </div>
            <p className="mt-2 text-sm font-semibold text-[#f1e8d4]">
              {dungeon.round + 1}
            </p>
          </div>
        </div>

        <div className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-[#ead7aa] transition-transform duration-300 group-hover:translate-x-1">
          Open dungeon
          <ArrowRight className="h-4 w-4" />
        </div>
      </div>
    </Link>
  );
}

function ClearedDungeonRow({
  dungeon,
  expanded,
  onToggle,
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
  expanded: boolean;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const metadata =
    dungeonCatalog.find((entry) => entry.key === dungeon.key)?.flavor ??
    "A completed descent archived in the guild ledger.";

  return (
    <div className="rpg-panel overflow-hidden p-0">
      <button
        type="button"
        onClick={onToggle}
        className="group relative w-full px-5 py-5 text-left transition-all duration-200 hover:bg-[#2f271d]/42"
      >
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-24 bg-[radial-gradient(circle_at_top,rgba(251,191,36,0.14),transparent_72%)] opacity-90"
        />
        <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <p className="rpg-title text-[0.58rem] text-[#cfbf97]/70">Cleared archive</p>
            <h3 className="rpg-heading mt-2 text-2xl leading-none font-semibold uppercase tracking-[0.05em]">
              {formatDungeonName(dungeon.key)}
            </h3>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-[#d3c5a1]">
              <span>{dayjs(dungeon.createdAt).format("MMM D, YYYY")}</span>
              <span className="text-[#8d8064]">/</span>
              <span>{dayjs(dungeon.createdAt).fromNow()}</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 md:justify-end">
            <span className="inline-flex items-center gap-2 rounded-full border border-yellow-300/18 bg-yellow-300/10 px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-yellow-100">
              Cleared
            </span>
            {dungeon.guest ? (
              <span className="inline-flex items-center gap-2 rounded-full border border-[#3ca6ff]/30 bg-[#3ca6ff]/10 px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-[#9bd0ff]">
                Guest run
              </span>
            ) : null}
            <span className="inline-flex items-center gap-2 rounded-full border border-[#8a7753]/28 bg-[#2b241b]/85 px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-[#b8aa89]">
              Round {dungeon.round + 1}
            </span>
            <span className="rpg-icon-frame h-10 w-10 text-[#ead7aa] transition-transform duration-200 group-hover:scale-[1.02]">
              <ChevronDown
                className={cn(
                  "h-4 w-4 transition-transform duration-200",
                  expanded && "rotate-180",
                )}
              />
            </span>
          </div>
        </div>
      </button>

      {expanded ? (
        <div className="border-t border-[#8a7753]/18 px-5 py-5">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
            <div>
              <p className="rpg-copy text-sm leading-7">{metadata}</p>
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rpg-stat-tile">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#b6ab92]">
                    <Clock className="h-3.5 w-3.5" />
                    Cleared entry
                  </div>
                  <p className="mt-2 text-sm font-semibold text-[#f1e8d4]">
                    {dayjs(dungeon.createdAt).format("MMM D, YYYY")}
                  </p>
                </div>
                <div className="rpg-stat-tile">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#b6ab92]">
                    <MapPin className="h-3.5 w-3.5" />
                    Final round
                  </div>
                  <p className="mt-2 text-sm font-semibold text-[#f1e8d4]">
                    {dungeon.round + 1}
                  </p>
                </div>
                <div className="rpg-stat-tile">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#b6ab92]">
                    <CheckCircle className="h-3.5 w-3.5" />
                    Ownership
                  </div>
                  <p className="mt-2 text-sm font-semibold text-[#f1e8d4]">
                    {dungeon.guest ? "Guest" : "Owned"}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button asChild variant="outline">
                <Link to="/dungeons/$id" params={{ id: dungeon.id }}>
                  Open archive
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button
                size="icon"
                variant="ghostRelic"
                className="h-10 w-10 border-[#8f342a]/30 bg-[#8f342a]/10 text-[#f0c8be] hover:bg-[#8f342a]/16 hover:text-[#f4dbd4]"
                onClick={onDelete}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function formatDungeonName(value: string) {
  return value.replaceAll("-", " ");
}
