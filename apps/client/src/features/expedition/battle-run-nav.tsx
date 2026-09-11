import { trpc } from "@/utils/trpc";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import "./expedition.css";
export function BattleRunNav({ battleId }: { battleId: string }) {
  const { data } = useQuery(
    trpc.dungeon.getBattleContext.queryOptions({ battleId }),
  );
  if (!data) return null;
  return (
    <nav className="expedition-battle-nav" aria-label="Current expedition">
      <Link to="/dungeons/$id" params={{ id: data.run.id }}>
        ← {data.run.name}
      </Link>
      <span>
        Wave {data.attempt.round + 1} / {data.run.actualEnemies.length} ·{" "}
        {data.attempt.round} cleared
      </span>
    </nav>
  );
}
