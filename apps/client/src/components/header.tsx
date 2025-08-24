import { UserButton } from "@clerk/clerk-react";
import { Link } from "@tanstack/react-router";
import { ModeToggle } from "./mode-toggle";

export default function Header() {
  return (
    <div>
      <div className="flex flex-row items-center justify-between px-2 py-1">
        <div className="flex gap-4 text-lg">
          <Link
            to="/"
            activeProps={{
              className: "font-bold",
            }}
            activeOptions={{ exact: true }}
          >
            Home
          </Link>
          <Link
            to="/characters"
            activeProps={{
              className: "font-bold",
            }}
          >
            Characters
          </Link>
          <Link
            to="/spells"
            activeProps={{
              className: "font-bold",
            }}
          >
            Spells
          </Link>
          <Link
            to="/dungeons"
            activeProps={{
              className: "font-bold",
            }}
            activeOptions={{ exact: true }}
          >
            Dungeons
          </Link>
        </div>
        <div className="flex flex-row items-center gap-2">
          <ModeToggle />
          <UserButton />
        </div>
      </div>
      <hr />
    </div>
  );
}
