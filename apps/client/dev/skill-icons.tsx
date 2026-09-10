import { createRoot } from "react-dom/client";
import { SkillIcon } from "../src/components/skill-icon";
import { skillNames, conditionIconNames } from "../src/lib/skill-icons";
import { ConditionIcons } from "../src/routes/battle/-presentation/condition-icons";
import type { ConditionDetail } from "../src/routes/battle/-presentation/battle-effects";
import "../src/routes/battle/-presentation/battle-view.css";
import "./skill-icons.css";

const examples = new Map<string, ConditionDetail>(
  Object.entries(conditionIconNames).map(([id, name], index) => [
    id,
    {
      id,
      name,
      iconType: id,
      category: name,
      description:
        "Development example for checking icon size and condition overflow.",
      tone: index === 0 ? "beneficial" : index === 1 ? "harmful" : "neutral",
    },
  ]),
);

function Gallery() {
  return (
    <main className="icon-gallery">
      <header>
        <span>SHARDS OF AFFINITY / ART LIBRARY</span>
        <h1>A skill has a silhouette.</h1>
        <p>
          49 abilities and passives, plus 10 condition symbols. Generated
          individually, shown at 72, 40 and 20 pixels.
        </p>
        <a href="/dev/battle-replay.html">Open battle replay ↗</a>
      </header>
      {[
        ["Skills & passives", skillNames],
        ["Condition symbols", conditionIconNames],
      ].map(([title, entries]) => (
        <section key={String(title)}>
          <h2>{String(title)}</h2>
          <div className="icon-gallery-grid">
            {Object.entries(entries).map(([type, name]) => (
              <article key={type}>
                <div className="icon-gallery-sizes">
                  <SkillIcon type={type} size={72} eager />
                  <SkillIcon type={type} size={40} eager />
                  <SkillIcon type={type} size={20} eager />
                </div>
                <h3>{name}</h3>
                <code>{type}</code>
              </article>
            ))}
          </div>
        </section>
      ))}
      <section>
        <h2>Condition overflow & keyboard check</h2>
        <p>
          Focus or click a condition to see its details. Escape dismisses it.
        </p>
        <ConditionIcons
          ids={[...examples.keys(), "effect-buff"]}
          details={examples}
          entityName="Development actor"
        />
      </section>
    </main>
  );
}

if (import.meta.env.DEV) {
  const root = createRoot(document.getElementById("root")!);
  root.render(<Gallery />);
  import.meta.hot?.dispose(() => root.unmount());
}
