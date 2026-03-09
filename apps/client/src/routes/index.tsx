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
import {
  SignInButton,
  SignUpButton,
  SignedIn,
  SignedOut,
} from "@clerk/clerk-react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Axe,
  Castle,
  ScrollText,
  Shield,
  Swords,
} from "lucide-react";

export const Route = createFileRoute("/")({
  component: RouteComponent,
});

function RouteComponent() {
  const { data: battles } = useQuery(
    trpc.activeBattles.queryOptions(undefined, {
      refetchInterval: 60_000,
    }),
  );

  const activeBattles = battles ?? [];
  const featuredSystems = [
    {
      icon: Swords,
      label: "Battle ledger",
      copy: "Turn-based arena states rendered like a tactical codex instead of a dashboard.",
    },
    {
      icon: ScrollText,
      label: "Spell archive",
      copy: "Build grimoires, passives, and gear sets that read like actual dungeon prep.",
    },
    {
      icon: Castle,
      label: "Expedition board",
      copy: "Track active descents, unfinished chambers, and the runs still asking to be finished.",
    },
  ];

  return (
    <RpgPage className="pt-10">
      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1.15fr)_420px]">
        <div className="space-y-8">
          <RpgHero
            eyebrow="Ancient dungeon interface"
            title={
              <>
                Build the party.
                <br />
                Break the dungeon.
              </>
            }
            description="Shards of Affinity is a dark-fantasy tactics loop of spellcraft, attrition, and momentum swings. Draft a roster, stack the right relics, and push into fights that feel authored instead of procedural."
          >
            <div className="flex flex-col gap-4 sm:flex-row">
              <SignedOut>
                <SignUpButton mode="modal">
                  <Button variant="relic" size="lg">
                    Start your run
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </SignUpButton>
                <SignInButton mode="modal">
                  <Button variant="outline" size="lg">
                    Return to camp
                  </Button>
                </SignInButton>
              </SignedOut>

              <SignedIn>
                <Button asChild variant="relic" size="lg">
                  <Link to="/dungeons">
                    Enter the dungeon
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg">
                  <Link to="/characters">Tune your roster</Link>
                </Button>
              </SignedIn>
            </div>
          </RpgHero>

          <RpgPanel className="px-6 py-6">
            <RpgSectionHeading
              icon={<Shield className="h-5 w-5" />}
              eyebrow="Core systems"
              title="Dungeon toolkit"
            />
            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              {featuredSystems.map(({ icon: Icon, label, copy }) => (
                <RpgInset key={label} variant="parchment" className="p-5">
                  <div className="rpg-icon-frame h-11 w-11">
                    <Icon className="h-5 w-5" />
                  </div>
                  <p className="rpg-title mt-4 text-[0.62rem] text-[#cfbf97]/75">
                    {label}
                  </p>
                  <p className="rpg-copy mt-3 text-sm leading-6">{copy}</p>
                </RpgInset>
              ))}
            </div>
          </RpgPanel>
        </div>

        <aside className="space-y-6">
          <RpgPanel className="px-6 py-6">
            <RpgSectionHeading
              icon={<Castle className="h-5 w-5" />}
              eyebrow="Session pulse"
              title="The dungeon is awake"
            />
            <div className="mt-5 grid grid-cols-2 gap-3">
              <RpgStatTile label="Combat mode" value="Tactical attrition" />
              <RpgStatTile label="Loot pressure" value="High-risk scaling" />
            </div>
            <RpgInset variant="parchment" className="mt-5 p-5">
              <p className="rpg-title text-[0.62rem] text-[#cfbf97]/75">
                Why sign up
              </p>
              <div className="rpg-copy mt-3 space-y-3 text-sm leading-6">
                <p>Persist characters, builds, and dungeon progress across sessions.</p>
                <p>Jump straight into the roster, spellbook, vault, and expedition board.</p>
                <p>Resume unfinished battles without losing track of the arena state.</p>
              </div>
            </RpgInset>
          </RpgPanel>

          {activeBattles.length > 0 ? (
            <RpgPanel className="px-6 py-6">
              <RpgSectionHeading
                icon={<Axe className="h-5 w-5" />}
                eyebrow="Resume combat"
                title="Active battles"
              />
              <div className="mt-5 space-y-3">
                {activeBattles.map((battle) => (
                  <Link
                    key={battle.battleId}
                    to="/battle/$id"
                    params={{ id: battle.battleId }}
                    className="group block"
                  >
                    <RpgInset
                      variant="stone"
                      className="flex items-center justify-between gap-3 p-4 transition-all duration-200 hover:border-[#b89656]/50 hover:bg-[#362d22]"
                    >
                      <div>
                        <RpgBadge>Battle ID</RpgBadge>
                        <p className="mt-3 font-mono text-sm text-[#9bd0ff]">
                          {battle.battleId.slice(0, 8)}...
                        </p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-[#d8c79f] transition-transform duration-200 group-hover:translate-x-1" />
                    </RpgInset>
                  </Link>
                ))}
              </div>
            </RpgPanel>
          ) : (
            <RpgEmptyState
              icon={<Axe className="h-8 w-8" />}
              title="No active battles"
              copy="When a live fight is still running, the return path will appear here."
            />
          )}
        </aside>
      </div>
    </RpgPage>
  );
}
