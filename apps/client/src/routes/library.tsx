import { createFileRoute } from "@tanstack/react-router";
import { LibraryPage } from "@/features/library/library-page";
import { parseLibrarySearch } from "@/features/library/library-search";

export const Route = createFileRoute("/library")({
  validateSearch: parseLibrarySearch,
  component: LibraryRoute,
});

function LibraryRoute() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  return (
    <LibraryPage
      search={search}
      onSearchChange={(next) => {
        void navigate({ search: next, replace: true });
      }}
    />
  );
}
