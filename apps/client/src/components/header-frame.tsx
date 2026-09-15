import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import {
  BookOpen,
  Compass,
  Map,
  Package,
  Sparkles,
  Users,
  UserRoundPlus,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from "./ui/sidebar";
import "./header.css";

const navItems = [
  { to: "/", label: "Home", icon: Compass },
  { to: "/characters", label: "Characters", icon: Users },
  { to: "/spells", label: "Spells", icon: Sparkles },
  { to: "/items", label: "Items", icon: Package },
  { to: "/dungeons", label: "Dungeons", icon: Map },
  { to: "/library", label: "Library", icon: BookOpen },
  { to: "/friends", label: "Friends", icon: UserRoundPlus },
] as const;

export function SanctumCrest() {
  return (
    <svg
      className="sanctum-crest"
      viewBox="0 0 64 80"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M32 3 58 18v36L32 77 6 54V18Z M32 12 50 23v27L32 67 14 50V23Z M32 18 43 40 32 62 21 40Z M3 39h58 M32 18v44"
        stroke="currentColor"
        strokeWidth="1"
      />
    </svg>
  );
}

export function HeaderFrame({ children }: { children: ReactNode }) {
  const { setOpenMobile } = useSidebar();
  return (
    <>
      <a className="rpg-skip-link" href="#main-content">
        Skip to content
      </a>
      <Sidebar collapsible="icon" className="game-sidebar">
        <SidebarHeader>
          <Link
            to="/"
            activeOptions={{ exact: true }}
            className="game-header-brand"
            aria-label="Shards of Affinity home"
          >
            <SanctumCrest />
            <span>
              Shards <em>of</em>
              <strong>Affinity</strong>
            </span>
          </Link>
          <div className="game-header-divider" aria-hidden="true">
            <span>◇</span>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Your journey</SidebarGroupLabel>
            <nav aria-label="Main navigation">
              <SidebarMenu>
                {navItems.map(({ to, label, icon: Icon }) => (
                  <SidebarMenuItem key={to}>
                    <SidebarMenuButton asChild tooltip={label}>
                      <Link
                        to={to}
                        activeOptions={{ exact: to === "/" }}
                        onClick={() => setOpenMobile(false)}
                        activeProps={{
                          className: "is-active",
                          "aria-current": "page",
                        }}
                        className="game-header-link"
                        aria-label={label}
                      >
                        <Icon size={17} aria-hidden="true" />
                        <span>{label}</span>
                        <span className="game-nav-arrow" aria-hidden="true">
                          ›
                        </span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </nav>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          <div className="game-header-actions">{children}</div>
          <p className="game-header-motto">Every build tells a story.</p>
        </SidebarFooter>
      </Sidebar>
    </>
  );
}

export function GameToolbar() {
  return (
    <header data-game-header className="game-toolbar">
      <SidebarTrigger />
      <span>Shards of Affinity</span>
      <span className="game-toolbar-ornament" aria-hidden="true">
        ◇
      </span>
    </header>
  );
}
