import { useState } from "react";
import { createRoot } from "react-dom/client";
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
  Link,
} from "@tanstack/react-router";
import { Crown, Mail, UserCircle } from "lucide-react";
import { HeaderFrame } from "../src/components/header-frame";
import { Button } from "../src/components/ui/button";
import { LibraryPage } from "../src/features/library/library-page";
import { parseLibrarySearch } from "../src/features/library/library-search";
import "../src/index.css";

function Preview() {
  const [search, setSearch] = useState(() => parseLibrarySearch({}));
  return (
    <div data-game-shell>
      <HeaderFrame>
        <Button asChild variant="outline" className="game-header-action">
          <Link to="/invitations" aria-label="Dungeon invitations">
            <Mail size={16} />
            <span className="hidden xl:inline">Inbox</span>
          </Link>
        </Button>
        <Button asChild variant="outline" className="game-header-action">
          <Link to="/loot">
            <Crown size={16} />
            23 Loot
          </Link>
        </Button>
        <button type="button" aria-label="Preview account">
          <UserCircle size={28} />
        </button>
      </HeaderFrame>
      <LibraryPage search={search} onSearchChange={setSearch} />
      <p className="p-8 text-center text-sm text-[#b6ac99]">
        Development preview · sample account controls
      </p>
    </div>
  );
}

if (import.meta.env.DEV) {
  const rootRoute = createRootRoute({ component: Preview });
  const router = createRouter({
    routeTree: rootRoute.addChildren([
      createRoute({ getParentRoute: () => rootRoute, path: "$" }),
    ]),
    history: createMemoryHistory({ initialEntries: ["/library"] }),
  });
  const root = createRoot(document.getElementById("root")!);
  root.render(<RouterProvider router={router} />);
  import.meta.hot?.dispose(() => root.unmount());
}
