import { Button } from "@/components/ui/button";
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
  { to: "/characters", label: "Characters", icon: Users },
  { to: "/spells", label: "Spells", icon: Sparkles },
  { to: "/items", label: "Items", icon: Package },
  { to: "/dungeons", label: "Dungeons", icon: MapPin, exact: true },
] as const;

const navLinkClass =
  "group flex items-center gap-2.5 rounded-2xl border border-transparent px-3.5 py-2.5 text-sm font-medium text-stone-300 transition-all duration-300 hover:border-white/10 hover:bg-white/6 hover:text-stone-50";

const activeNavLinkClass =
  "border-amber-300/25 bg-amber-300/12 text-amber-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_10px_30px_rgba(251,191,36,0.08)]";

export default function Header() {
  const { data: loot } = useQuery(
    trpc.getMyLoot.queryOptions(undefined, {
      staleTime: 60_000,
      refetchInterval: 60_000,
    }),
  );

  const lootCount = loot?.length ?? 0;

  return (
    <header className="sticky top-0 z-50 border-b border-white/8 bg-[linear-gradient(180deg,rgba(2,6,23,0.92),rgba(2,6,23,0.72))] backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-[1.75rem] border border-white/10 bg-[radial-gradient(circle_at_top,rgba(251,191,36,0.08),transparent_30%),linear-gradient(135deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] shadow-[0_18px_70px_rgba(0,0,0,0.4)]">
          <div className="flex flex-wrap items-center gap-4 px-4 py-4 sm:px-5 lg:flex-nowrap lg:justify-between">
            <Link
              to="/"
              activeOptions={{ exact: true }}
              className="group flex min-w-0 items-center gap-3 rounded-3xl border border-white/8 bg-black/20 px-3 py-2.5 transition-all duration-300 hover:border-amber-300/20 hover:bg-black/30"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-amber-300/20 bg-amber-300/12 text-amber-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                <Shield className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-[0.65rem] font-semibold tracking-[0.28em] text-amber-100/75 uppercase">
                  Pixelated MMORPG
                </p>
                <p className="truncate font-['Iowan_Old_Style','Palatino_Linotype','Book_Antiqua',Palatino,Georgia,serif] text-xl leading-none text-stone-50">
                  Loot Game
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
                    <Icon className="h-4 w-4 transition-transform duration-300 group-hover:-translate-y-0.5" />
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
                    className="h-10 rounded-full border border-amber-300/25 bg-amber-300/12 px-4 text-xs font-semibold tracking-[0.22em] text-amber-100 uppercase shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition-all duration-300 hover:border-amber-200/40 hover:bg-amber-300/18 hover:text-white"
                  >
                    <Link to="/loot">
                      <Crown className="h-4 w-4" />
                      {lootCount} Loot
                    </Link>
                  </Button>
                )}
                <div className="rounded-full border border-white/10 bg-black/25 p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
                  <UserButton
                    appearance={{
                      elements: {
                        avatarBox:
                          "h-9 w-9 ring-1 ring-amber-300/20 ring-offset-0",
                      },
                    }}
                  />
                </div>
              </SignedIn>

              <SignedOut>
                <SignInButton mode="modal">
                  <Button
                    variant="outline"
                    className="h-10 rounded-full border-white/12 bg-white/5 px-4 text-xs font-semibold tracking-[0.2em] text-stone-100 uppercase backdrop-blur-sm transition-all duration-300 hover:border-white/25 hover:bg-white/10"
                  >
                    Sign in
                  </Button>
                </SignInButton>
                <SignUpButton mode="modal">
                  <Button className="h-10 rounded-full border border-amber-300/25 bg-amber-300 px-4 text-xs font-semibold tracking-[0.2em] text-slate-950 uppercase shadow-[0_10px_30px_rgba(251,191,36,0.22)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-amber-200">
                    Start run
                  </Button>
                </SignUpButton>
              </SignedOut>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
