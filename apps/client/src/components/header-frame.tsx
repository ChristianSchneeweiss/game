import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link, useRouter } from "@tanstack/react-router";
import {
  BookOpen,
  Home,
  MapPin,
  Package,
  Shield,
  Sparkles,
  Users,
  UserRoundPlus,
} from "lucide-react";
import "./header.css";

const navItems = [
  { to: "/", label: "Home", icon: Home, exact: true },
  { to: "/characters", label: "Characters", icon: Users },
  { to: "/spells", label: "Spells", icon: Sparkles },
  { to: "/items", label: "Items", icon: Package },
  { to: "/dungeons", label: "Dungeons", icon: MapPin, exact: true },
  { to: "/library", label: "Library", icon: BookOpen },
  { to: "/friends", label: "Friends", icon: UserRoundPlus },
] as const;

export function HeaderFrame({ children }: { children: ReactNode }) {
  const headerRef = useRef<HTMLElement>(null);
  const [hidden, setHidden] = useState(false);
  const router = useRouter();

  useEffect(() => {
    let previous = Math.max(0, window.scrollY);
    let travel = 0;
    let frame = 0;
    const update = () => {
      frame = 0;
      const top = Math.max(0, window.scrollY);
      const delta = top - previous;
      previous = top;
      if (!delta) return;
      // Accumulate deliberate travel; small trackpad reversals should not flicker.
      travel = Math.sign(delta) === Math.sign(travel) ? travel + delta : delta;
      const interacting =
        headerRef.current?.matches(":focus-within") ||
        headerRef.current?.querySelector(
          '[aria-expanded="true"], [data-state="open"]',
        );
      if (top <= 32 || interacting || travel <= -8) {
        setHidden(false);
      } else if (top > 80 && travel >= 12) {
        setHidden(true);
      }
    };
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    const unsubscribe = router.subscribe("onBeforeNavigate", () => {
      setHidden(false);
      travel = 0;
    });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.cancelAnimationFrame(frame);
      unsubscribe();
    };
  }, [router]);

  return (
    <header
      ref={headerRef}
      data-game-header
      data-hidden={hidden}
      className="game-header"
    >
      <div className="game-header-inner">
        <Link
          to="/"
          activeOptions={{ exact: true }}
          className="game-header-brand"
          aria-label="Shards of Affinity home"
        >
          <Shield size={24} aria-hidden="true" />
          <span>
            Shards <span className="game-header-brand-rest">of Affinity</span>
          </span>
        </Link>
        <nav className="game-header-nav" aria-label="Main navigation">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeOptions={{ exact: "exact" in item && item.exact }}
              activeProps={{ className: "is-active" }}
              className="game-header-link"
            >
              <item.icon size={16} aria-hidden="true" />
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
        <div className="game-header-actions">{children}</div>
      </div>
    </header>
  );
}
