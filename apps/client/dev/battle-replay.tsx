import { createRoot } from "react-dom/client";
import { useEffect, useState } from "react";
import SuperJSON from "superjson";
import type { Entity } from "@loot-game/game/entity-types";
import type { EffectTracking } from "@loot-game/game/bm";
import type { TimelineEventFull } from "@loot-game/game/timeline-events";
import type { SpellDescription } from "@loot-game/game/types";
import BattleView3D from "../src/routes/battle/-presentation/battle-view-3d";
import { usePlayback } from "../src/routes/battle/-presentation/use-playback";
import fixture from "../../../tests/battle/recordings/six-entity.json";

const recording = SuperJSON.deserialize<{
  participants: Entity[];
  events: TimelineEventFull[];
  effects: EffectTracking;
  descriptions: Map<string, SpellDescription>;
}>(fixture as unknown as Parameters<typeof SuperJSON.deserialize>[0]);
function Replay() {
  const playback = usePlayback(
    recording.participants,
    recording.events,
    recording.effects,
    0,
    true,
  );
  const [mounted, setMounted] = useState(true);
  const [metrics, setMetrics] = useState("");
  useEffect(() => {
    const timer = setInterval(
      () =>
        setMetrics(
          JSON.stringify(
            {
              renderer: window.__battleSceneMetrics,
              viewport: [innerWidth, innerHeight],
              userAgent: navigator.userAgent,
              modelReady: performance
                .getEntriesByName("battle-model-ready")
                .map((entry) => entry.startTime),
              controlsReady: performance
                .getEntriesByName("battle-controls-ready")
                .map((entry) => entry.startTime),
              resources: performance
                .getEntriesByType("resource")
                .filter((e) => e.name.includes("warrior.glb"))
                .map((e) => ({
                  duration: e.duration,
                  transferSize: (e as PerformanceResourceTiming).transferSize,
                  encodedBodySize: (e as PerformanceResourceTiming)
                    .encodedBodySize,
                })),
            },
            null,
            2,
          ),
        ),
      1000,
    );
    return () => clearInterval(timer);
  }, []);
  return (
    <>
      <div
        style={{
          padding: "12px 32px",
          font: "12px Trebuchet MS",
          background: "#293025",
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <span>
          DEVELOPMENT VERIFICATION · Recorded server-command results · No live
          connection or combat input
        </span>
        <label>
          Failure check{" "}
          <select
            aria-label="Failure check"
            defaultValue={
              new URLSearchParams(location.search).get("sceneFault") ?? ""
            }
            onChange={(e) => {
              location.search = e.target.value
                ? `sceneFault=${e.target.value}`
                : "";
            }}
          >
            <option value="">Normal</option>
            <option value="model">Missing model</option>
            <option value="clip">Missing attack clip</option>
            <option value="graphics">Graphics failure</option>
          </select>
        </label>
        <button
          onClick={() => {
            location.search = `loadSample=${Date.now()}`;
          }}
        >
          Fresh model load
        </button>
        <button onClick={() => setMounted(!mounted)}>
          {mounted ? "Unmount scene" : "Mount scene"}
        </button>
      </div>
      {mounted && (
        <BattleView3D
          participants={recording.participants}
          effects={recording.effects}
          descriptions={recording.descriptions}
          playback={playback}
          onFallback={() => setMounted(false)}
        />
      )}
      <details style={{ padding: "20px 32px", font: "11px monospace" }}>
        <summary>
          Development measurements (renderer, local transfer, viewport)
        </summary>
        <pre data-testid="scene-metrics">{metrics}</pre>
      </details>
    </>
  );
}
if (import.meta.env.DEV) {
  const root = createRoot(document.getElementById("root")!);
  root.render(<Replay />);
  import.meta.hot?.dispose(() => root.unmount());
}
