import { Button } from "@/components/ui/button";
import { RpgBadge } from "@/components/rpg-ui";
import { trpc } from "@/utils/trpc";
import {
  SignInButton,
  SignUpButton,
  SignedIn,
  SignedOut,
  UserButton,
} from "@clerk/clerk-react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  Crown,
  Home,
  MapPin,
  Package,
  Shield,
  Sparkles,
  Users,
} from "lucide-react";

const navItems = [
  { to: "/", label: "Home", icon: Home, exact: true },
  { to: "/characters", label: "Characters", icon: Users, exact: false },
  { to: "/spells", label: "Spells", icon: Sparkles, exact: false },
  { to: "/items", label: "Items", icon: Package, exact: false },
  { to: "/dungeons", label: "Dungeons", icon: MapPin, exact: true },
] as const;

const navLinkClass =
  "group relative flex items-center gap-2 rounded-[0.95rem] border border-[#7f6c49]/35 bg-[linear-gradient(180deg,rgba(49,41,30,0.9),rgba(28,24,18,0.96))] px-3.5 py-2.5 text-[0.72rem] font-semibold tracking-[0.14em] text-[#d7c8a3] uppercase shadow-[inset_0_1px_0_rgba(255,239,201,0.04)] transition-all duration-200 before:pointer-events-none before:absolute before:inset-[3px] before:rounded-[0.7rem] before:border before:border-[#c6ad79]/10 before:content-[''] hover:border-[#b89656]/45 hover:bg-[linear-gradient(180deg,rgba(61,51,37,0.96),rgba(34,29,22,0.98))] hover:text-[#f3e2b9]";

const activeNavLinkClass =
  "border-[#b89656]/60 bg-[linear-gradient(180deg,rgba(111,79,38,0.96),rgba(61,42,20,0.98))] text-[#f9ebc7] shadow-[inset_0_1px_0_rgba(255,239,201,0.18),0_10px_24px_rgba(0,0,0,0.24)]";

export default function Header() {
  const { data: loot } = useQuery(
    trpc.getMyLoot.queryOptions(undefined, {
      staleTime: 60_000,
      refetchInterval: 60_000,
    }),
  );

  const lootCount = loot?.length ?? 0;

  return (
    <header className="sticky top-0 z-50 px-4 pt-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="rpg-panel">
          <div className="rpg-panel-content px-4 py-4 sm:px-5">
            <div className="flex flex-wrap items-center gap-4 lg:flex-nowrap lg:justify-between">
            <Link
              to="/"
              activeOptions={{ exact: true }}
              className="group flex min-w-0 items-center gap-3 rounded-[1.1rem] border border-[#846d46]/35 bg-[linear-gradient(180deg,rgba(48,40,30,0.94),rgba(29,24,18,0.98))] px-3 py-2.5 shadow-[inset_0_1px_0_rgba(255,238,204,0.04)] transition-all duration-200 hover:border-[#b89656]/45 hover:bg-[linear-gradient(180deg,rgba(58,48,35,0.96),rgba(34,28,21,0.98))]"
            >
              <div className="rpg-icon-frame h-11 w-11 text-[#ead7aa]">
                <Shield className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="rpg-title text-[0.58rem] text-[#d2c097]/70">
                  Ancient battle ledger
                </p>
                <p className="truncate font-(--rpg-font-display) text-xl leading-none tracking-[0.08em] text-[#f2e5c8] uppercase">
                  Shards of Affinity
                </p>
              </div>
            </Link>

            <nav className="order-3 w-full lg:order-2 lg:w-auto">
              <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center sm:justify-center">
                {navItems.map(({ to, label, icon: Icon, exact }) => (
                  <Link
                    key={to}
                    to={to}
                    activeOptions={exact ? { exact: true } : undefined}
                    activeProps={{ className: activeNavLinkClass }}
                    className={navLinkClass}
                  >
                    <Icon className="h-4 w-4 text-[#bfa880] transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:text-[#efd9a9]" />
                    <span>{label}</span>
                  </Link>
                ))}
              </div>
            </nav>

            <div className="order-2 ml-auto flex items-center gap-2.5 lg:order-3">
              <SignedIn>
                {lootCount > 0 && (
                  <Button
                    asChild
                    variant="outline"
                    className="h-10 px-4 text-[0.68rem]"
                  >
                    <Link to="/loot">
                      <Crown className="h-4 w-4" />
                      {lootCount} Loot
                    </Link>
                  </Button>
                )}
                <div className="rounded-full border border-[#8a7753]/35 bg-[#2a241b]/92 p-1.5 shadow-[inset_0_1px_0_rgba(255,239,201,0.05)]">
                  <UserButton
                    appearance={{
                      elements: {
                        avatarBox:
                          "h-9 w-9 ring-1 ring-[#b89656]/35 ring-offset-0",
                      },
                    }}
                  />
                </div>
              </SignedIn>

              <SignedOut>
                <SignInButton mode="modal">
                  <Button
                    variant="outline"
                    className="h-10 px-4 text-[0.68rem]"
                  >
                    Sign in
                  </Button>
                </SignInButton>
                <SignUpButton mode="modal">
                  <Button variant="relic" className="h-10 px-4 text-[0.68rem]">
                    Start run
                  </Button>
                </SignUpButton>
              </SignedOut>
            </div>
            </div>
            <div className="rpg-section-divider mt-4" />
            <div className="mt-3 flex flex-wrap items-center gap-2 text-[0.68rem] text-[#cdbc98]">
              <RpgBadge>Dungeon ledger active</RpgBadge>
              <RpgBadge>
                <Sparkles className="h-3.5 w-3.5" />
                Affinity archive
              </RpgBadge>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
