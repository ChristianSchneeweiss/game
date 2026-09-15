import { Link } from "@tanstack/react-router";
import { runPhase, type DungeonRunData } from "@/features/expedition/run-info";
import { userStore } from "@/utils/user-store";
import { AbandonRun } from "./abandon-run";
import { PlayAgainTogether } from "./play-again-together";
import { PreparationCompany } from "./preparation-company";
import { usePreparationPresence } from "./use-preparation-presence";

type Props = {
  run: DungeonRunData;
  onFight: () => void;
  pending: boolean;
  error?: string;
};

export function SharedRunDeparture(props: Props) {
  const phase = runPhase(props.run);
  if (phase === "cleared" || phase === "fallen" || phase === "abandoned")
    return <CompletedCompany run={props.run} />;
  return <WaitingCompany {...props} />;
}

function CompletedCompany({ run }: { run: DungeonRunData }) {
  return (
    <aside className="expedition-departure">
      <small>The next chapter</small>
      <h2>
        {run.abandonedAt
          ? "Your spoils are safe."
          : "Return with your companion."}
      </h2>
      <p>
        Personal loot and completed battle replays remain available in this
        expedition.
      </p>
      {run.abandonedAt ? (
        <Link
          className="rpg-button rpg-button-primary expedition-button"
          to="/dungeons"
        >
          Choose another expedition →
        </Link>
      ) : (
        <PlayAgainTogether run={run} />
      )}
    </aside>
  );
}

function WaitingCompany({ run, onFight, pending, error }: Props) {
  const userId = userStore((state) => state.user?.id);
  const phase = runPhase(run);
  const shared = run.shared!;
  const connected = usePreparationPresence(shared.preparationId);
  const host = shared.hostUserId === userId;
  return (
    <aside className="space-y-5">
      <PreparationCompany
        id={shared.preparationId}
        revision={shared.revision}
        participants={shared.participants}
        connected={connected}
        disabled={phase === "battle" || phase === "choice"}
      />
      <section className="expedition-departure">
        <small>
          {host ? "You lead the company" : "The host leads the company"}
        </small>
        <SharedRunAction
          run={run}
          onFight={onFight}
          pending={pending}
          host={host}
          connected={connected}
        />
        {error ? (
          <p className="expedition-error" role="alert">
            {error}
          </p>
        ) : null}
        <p>
          Waiting for your companion? You can play another expedition and return
          here later.
        </p>
        <AbandonRun id={run.id} />
      </section>
    </aside>
  );
}

function SharedRunAction({
  run,
  onFight,
  pending,
  host,
  connected,
}: Omit<Props, "error"> & { host: boolean; connected: boolean }) {
  const phase = runPhase(run);
  if (phase === "battle" && run.activeBattleId)
    return (
      <Link
        className="rpg-button rpg-button-primary expedition-button"
        to="/battle/$id"
        params={{ id: run.activeBattleId }}
      >
        Join the battle →
      </Link>
    );
  if (!host)
    return (
      <p role="status">
        {phase === "choice"
          ? "Waiting for the host to choose a path."
          : "Ready up, then wait for the host to start this encounter."}
      </p>
    );
  return (
    <button
      className="rpg-button rpg-button-primary expedition-button"
      disabled={
        pending || phase !== "ready" || !connected || !run.shared?.canStart
      }
      onClick={onFight}
    >
      {pending
        ? "Entering together…"
        : phase === "choice"
          ? "Choose a path above"
          : `Start encounter ${run.round + 1} together →`}
    </button>
  );
}
