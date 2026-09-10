import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { AnimationMixer, Box3, LoopOnce } from "three";
import { loadModelGeometry, posedBounds } from "./enemy-model-geometry";

const directory = "apps/client/public/models/enemies-v1";
const placements: Record<string, unknown> = {};
for (const file of readdirSync(directory)
  .filter((file) => file.endsWith(".glb"))
  .sort()) {
  const bytes = readFileSync(`${directory}/${file}`);
  const asset = await loadModelGeometry(bytes);
  const mixer = new AnimationMixer(asset.scene);
  const idle = asset.animations.find((clip) => /idle/i.test(clip.name))!;
  const action = mixer.clipAction(idle).play();
  const bounds = new Box3();
  for (let i = 0; i < 16; i++) {
    action.time = (idle.duration * i) / 16;
    mixer.update(0);
    bounds.union(posedBounds(asset.scene));
  }
  mixer.stopAllAction();
  const death = asset.animations.find((clip) =>
    /^(Death|Death_A|Death1)$/.test(clip.name),
  );
  let deathMinY = bounds.min.y;
  if (death) {
    const falling = mixer.clipAction(death).setLoop(LoopOnce, 1);
    falling.clampWhenFinished = true;
    falling.play();
    falling.time = death.duration;
    mixer.update(0);
    deathMinY = posedBounds(asset.scene).min.y;
  }
  const round = (n: number) => Number(n.toFixed(6));
  placements[file] = {
    min: bounds.min.toArray().map(round),
    max: bounds.max.toArray().map(round),
    deathMinY: round(deathMinY),
    sha256: createHash("sha256").update(bytes).digest("hex"),
  };
  mixer.stopAllAction();
  mixer.uncacheRoot(asset.scene);
}
writeFileSync(
  "apps/client/src/routes/battle/-presentation/enemy-model-placements.json",
  JSON.stringify(placements, null, 2) + "\n",
);
console.log(
  `Measured ${Object.keys(placements).length} models across 16 idle poses and settled deaths.`,
);
