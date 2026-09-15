import { Button } from "@/components/ui/button";
import {
  RpgEmptyState,
  RpgPage,
  RpgPanel,
  RpgSectionHeading,
} from "@/components/rpg-ui";
import { trpc } from "@/utils/trpc";
import { parseLibrarySearch } from "@/features/library/library-search";
import {
  SignInButton,
  SignUpButton,
  SignedIn,
  SignedOut,
} from "@clerk/clerk-react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, BookOpen, Map, Shield, Swords } from "lucide-react";
import "@/styles/home.css";

export const Route = createFileRoute("/")({ component: HomePage });

function HomePage() {
  const battles = useQuery(
    trpc.activeBattles.queryOptions(undefined, { refetchInterval: 60_000 }),
  );
  return (
    <RpgPage>
      <header className="sanctum-page-heading">
        <p className="rpg-title">The next chapter awaits</p>
        <h1>Welcome to the Sanctum.</h1>
        <p className="rpg-copy">
          Gather your party. Hone your craft. Venture into the unknown.
        </p>
      </header>
      <div className="sanctum-home-layout">
        <section className="sanctum-welcome">
          <div className="sanctum-welcome-content">
            <p className="rpg-title">Shards of Affinity</p>
            <h2>
              Every build
              <br />
              tells a story.
            </h2>
            <p>
              Combine collected spells, equip your characters, and lead your
              party through turn-based dungeon battles.
            </p>
            <div className="sanctum-welcome-actions">
              <SignedOut>
                <SignUpButton mode="modal">
                  <Button size="lg">
                    Create account <ArrowRight />
                  </Button>
                </SignUpButton>
                <SignInButton mode="modal">
                  <Button variant="outline" size="lg">
                    Sign in
                  </Button>
                </SignInButton>
              </SignedOut>
              <SignedIn>
                <Button asChild size="lg">
                  <Link to="/dungeons">
                    Explore dungeons <ArrowRight />
                  </Link>
                </Button>
                <Button asChild variant="outline">
                  <Link to="/characters">Your characters</Link>
                </Button>
              </SignedIn>
            </div>
          </div>
          <p className="sanctum-welcome-footer">
            <Swords size={16} aria-hidden="true" /> Spells, equipment, and the
            choices that shape your journey.
          </p>
        </section>
        <aside className="space-y-6">
          <RpgPanel contentClassName="p-6">
            <RpgSectionHeading
              icon={<Swords />}
              eyebrow="Return to the fray"
              title="Active battles"
            />
            <div className="mt-5 space-y-3">
              {battles.isPending ? (
                <p role="status" className="rpg-copy">
                  Loading active battles…
                </p>
              ) : battles.isError ? (
                <div role="alert" className="rpg-feedback">
                  <p>Active battles could not be loaded.</p>
                  <Button
                    variant="outline"
                    className="mt-3"
                    onClick={() => void battles.refetch()}
                  >
                    Try again
                  </Button>
                </div>
              ) : battles.data?.length ? (
                battles.data.map((battle) => (
                  <Link
                    key={battle.battleId}
                    to="/battle/$id"
                    params={{ id: battle.battleId }}
                    className="sanctum-battle-link"
                  >
                    <span>
                      Resume battle <small>{battle.battleId.slice(0, 8)}</small>
                    </span>
                    <ArrowRight size={18} />
                  </Link>
                ))
              ) : (
                <RpgEmptyState
                  icon={<Shield size={28} />}
                  title="No active battles"
                  copy="Your unfinished battles will appear here."
                  className="border-0 px-0 py-6"
                />
              )}
            </div>
          </RpgPanel>
          <RpgPanel contentClassName="p-6">
            <p className="rpg-title text-xs">A little preparation goes far</p>
            <p className="rpg-copy mt-3 leading-7">
              Health and mana carry through an expedition. Prepare your party's
              spells and equipment before entering the next encounter.
            </p>
            <Link
              to="/library"
              search={parseLibrarySearch({})}
              className="rpg-link mt-3"
            >
              Explore the Library <ArrowRight size={16} />
            </Link>
          </RpgPanel>
        </aside>
      </div>
      <div className="sanctum-destinations">
        {[
          {
            to: "/characters",
            icon: Shield,
            title: "Your characters",
            copy: "Shape attributes, spells, and equipment into a build of your own.",
          },
          {
            to: "/dungeons",
            icon: Map,
            title: "Dungeons",
            copy: "Prepare a party and choose the next expedition.",
          },
          {
            to: "/library",
            icon: BookOpen,
            title: "The Library",
            copy: "Study spells, items, passive skills, and the enemies ahead.",
          },
        ].map(({ to, icon: Icon, title, copy }) => (
          <Link key={to} to={to} className="sanctum-destination">
            <Icon aria-hidden="true" />
            <h2>{title}</h2>
            <p>{copy}</p>
            <ArrowRight
              className="sanctum-destination-arrow"
              aria-hidden="true"
            />
          </Link>
        ))}
      </div>
    </RpgPage>
  );
}
