import { useState } from "react";
import { createRoot } from "react-dom/client";
import { LibraryPage } from "../src/features/library/library-page";
import { parseLibrarySearch } from "../src/features/library/library-search";
import "../src/index.css";

function Preview() {
  const [search, setSearch] = useState(() => parseLibrarySearch({}));
  return <LibraryPage search={search} onSearchChange={setSearch} />;
}

if (import.meta.env.DEV) {
  const root = createRoot(document.getElementById("root")!);
  root.render(<Preview />);
  import.meta.hot?.dispose(() => root.unmount());
}
