import { Button } from "@/components/ui/button";
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
      label: "Live battles",
      copy: "Durable Object fights with real-time turns and replayable combat logs.",
    },
    {
      icon: ScrollText,
      label: "Spell builds",
      copy: "Draft brutal loadouts from shared game logic instead of thin client-side fluff.",
    },
    {
      icon: Castle,
      label: "Dungeon runs",
      copy: "Push deeper through multi-round encounters where momentum actually matters.",
    },
  ];

  return (
    <main className="relative isolate overflow-hidden bg-[radial-gradient(circle_at_top,rgba(192,132,252,0.2),transparent_30%),radial-gradient(circle_at_80%_20%,rgba(251,191,36,0.14),transparent_24%),linear-gradient(180deg,#030712_0%,#0f172a_48%,#020617_100%)] text-stone-100">
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[linear-gradient(rgba(248,250,252,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(248,250,252,0.05)_1px,transparent_1px)] mask-[linear-gradient(to_bottom,white,transparent_75%)] bg-size-[72px_72px] opacity-15"
      />
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-40 bg-[radial-gradient(circle_at_center,rgba(251,191,36,0.22),transparent_65%)] blur-3xl"
      />

      <div className="relative mx-auto flex min-h-[calc(100vh-73px)] w-full max-w-7xl flex-col justify-center px-6 py-12 sm:px-10 lg:px-12">
        <div className="grid items-stretch gap-8 lg:grid-cols-[minmax(0,1.15fr)_420px]">
          <section className="relative overflow-hidden rounded-4xl border border-white/10 bg-black/25 p-8 shadow-[0_30px_120px_rgba(0,0,0,0.45)] backdrop-blur-xl sm:p-10 lg:p-12">
            <div
              aria-hidden="true"
              className="absolute inset-y-0 right-0 w-1/2 bg-[radial-gradient(circle_at_center,rgba(251,191,36,0.12),transparent_60%)]"
            />

            <div className="relative max-w-3xl">
              <div className="mb-6 inline-flex items-center gap-3 rounded-full border border-amber-300/25 bg-amber-300/10 px-4 py-2 text-[0.7rem] font-semibold tracking-[0.32em] text-amber-100/90 uppercase">
                <Shield className="h-3.5 w-3.5" />
                Pixelated MMORPG dungeon crawler with real-time teeth
              </div>

              <h1 className="max-w-4xl font-['Iowan_Old_Style','Palatino_Linotype','Book_Antiqua',Palatino,Georgia,serif] text-5xl leading-[0.9] font-semibold tracking-[-0.06em] text-balance text-stone-50 sm:text-6xl lg:text-7xl">
                Build a party.
                <br />
                Break the dungeon.
              </h1>

              <p className="mt-6 max-w-2xl font-['Avenir_Next','Segoe_UI',sans-serif] text-base leading-8 text-stone-300 sm:text-lg">
                Loot Game drops you into a dark tactical loop of spellcraft,
                attrition, and momentum swings. Draft characters, stack gear,
                and enter fights that feel authored instead of random.
              </p>

              <div className="mt-10 flex flex-col gap-4 sm:flex-row">
                <SignedOut>
                  <SignUpButton mode="modal">
                    <Button className="h-12 rounded-full border border-amber-200/40 bg-amber-300 px-7 text-sm font-semibold tracking-[0.18em] text-slate-950 uppercase shadow-[0_12px_40px_rgba(251,191,36,0.32)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-amber-200">
                      Start your run
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </SignUpButton>
                  <SignInButton mode="modal">
                    <Button
                      variant="outline"
                      className="h-12 rounded-full border-white/15 bg-white/5 px-7 text-sm font-semibold tracking-[0.18em] text-stone-100 uppercase backdrop-blur-sm transition-all duration-300 hover:border-white/30 hover:bg-white/10"
                    >
                      Return to camp
                    </Button>
                  </SignInButton>
                </SignedOut>

                <SignedIn>
                  <Button
                    asChild
                    className="h-12 rounded-full border border-amber-200/40 bg-amber-300 px-7 text-sm font-semibold tracking-[0.18em] text-slate-950 uppercase shadow-[0_12px_40px_rgba(251,191,36,0.32)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-amber-200"
                  >
                    <Link to="/dungeons">
                      Enter the dungeon
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Button
                    asChild
                    variant="outline"
                    className="h-12 rounded-full border-white/15 bg-white/5 px-7 text-sm font-semibold tracking-[0.18em] text-stone-100 uppercase backdrop-blur-sm transition-all duration-300 hover:border-white/30 hover:bg-white/10"
                  >
                    <Link to="/characters">Tune your roster</Link>
                  </Button>
                </SignedIn>
              </div>

              <div className="mt-12 grid gap-4 sm:grid-cols-3">
                {featuredSystems.map(({ icon: Icon, label, copy }) => (
                  <div
                    key={label}
                    className="group rounded-3xl border border-white/8 bg-white/4 p-5 transition-all duration-300 hover:border-amber-200/20 hover:bg-white/[0.07]"
                  >
                    <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl border border-amber-200/15 bg-amber-200/10 text-amber-200">
                      <Icon className="h-5 w-5" />
                    </div>
                    <p className="text-sm font-semibold tracking-[0.22em] text-stone-100 uppercase">
                      {label}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-stone-400">
                      {copy}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <aside className="flex flex-col gap-6">
            <section className="overflow-hidden rounded-4xl border border-amber-300/15 bg-[linear-gradient(180deg,rgba(251,191,36,0.12),rgba(255,255,255,0.03))] p-7 shadow-[0_24px_80px_rgba(0,0,0,0.4)] backdrop-blur-xl">
              <div>
                <p className="text-xs font-semibold tracking-[0.3em] text-amber-200/80 uppercase">
                  Session pulse
                </p>
                <h2 className="mt-2 font-['Iowan_Old_Style','Palatino_Linotype','Book_Antiqua',Palatino,Georgia,serif] text-2xl font-semibold tracking-[-0.04em] text-stone-50">
                  The dungeon is awake.
                </h2>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-4">
                <div className="rounded-3xl border border-white/10 bg-black/20 p-4">
                  <p className="text-xs tracking-[0.24em] text-stone-400 uppercase">
                    Combat mode
                  </p>
                  <p className="mt-3 text-lg font-semibold text-stone-100">
                    Tactical attrition
                  </p>
                </div>
                <div className="rounded-3xl border border-white/10 bg-black/20 p-4">
                  <p className="text-xs tracking-[0.24em] text-stone-400 uppercase">
                    Loot pressure
                  </p>
                  <p className="mt-3 text-lg font-semibold text-stone-100">
                    High-risk scaling
                  </p>
                </div>
              </div>

              <div className="mt-6 rounded-3xl border border-white/10 bg-black/25 p-5">
                <p className="text-xs font-semibold tracking-[0.28em] text-stone-400 uppercase">
                  Why sign up
                </p>
                <div className="mt-4 space-y-3 text-sm leading-6 text-stone-300">
                  <p>
                    Persist your characters, builds, and runs across sessions.
                  </p>
                  <p>
                    Jump straight into dungeons, spells, items, and active
                    fights.
                  </p>
                  <p>
                    Keep a live handle on unfinished battles from the home
                    screen.
                  </p>
                </div>
              </div>
            </section>

            {activeBattles.length > 0 && (
              <section className="rounded-4xl border border-blue-300/12 bg-slate-950/80 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.4)] backdrop-blur-xl">
                <div className="mb-5 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-blue-300/20 bg-blue-400/10 text-blue-200">
                    <Axe className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold tracking-[0.26em] text-blue-200/75 uppercase">
                      Resume combat
                    </p>
                    <h2 className="text-lg font-semibold text-stone-50">
                      Active Battles
                    </h2>
                  </div>
                </div>

                <ul className="space-y-3">
                  {activeBattles.map((battle) => (
                    <li key={battle.battleId}>
                      <Link
                        to="/battle/$id"
                        params={{ id: battle.battleId }}
                        className="group flex items-center justify-between rounded-[1.35rem] border border-white/8 bg-white/4 px-4 py-4 transition-all duration-300 hover:border-blue-300/25 hover:bg-blue-400/8"
                      >
                        <div>
                          <p className="text-[0.7rem] font-semibold tracking-[0.24em] text-stone-500 uppercase">
                            Battle ID
                          </p>
                          <p className="mt-1 font-mono text-sm text-blue-100">
                            {battle.battleId.slice(0, 8)}...
                          </p>
                        </div>
                        <ArrowRight className="h-4 w-4 text-stone-500 transition-transform duration-300 group-hover:translate-x-1 group-hover:text-blue-200" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </aside>
        </div>
      </div>
    </main>
  );
}
