import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { enemyModelRoster } from "./enemy-model-roster";
import "./enemy-models.css";

type ModelReport = {
  output: string;
  bytes: number;
  meshes: number;
  skins: number;
  url: string;
};
const reports = Promise.all(
  ["build-report", "fbx-report", "original-report"].map(async (name) => {
    const response = await fetch(`/models/enemies-v1/${name}.json`);
    if (!response.ok) throw new Error("Model provenance unavailable");
    return response.json() as Promise<ModelReport[]>;
  }),
);

const element = <T = HTMLDivElement>(id: string) =>
  document.getElementById(id) as unknown as T;
const viewport = element("viewport");
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.25;
viewport.appendChild(renderer.domElement);
const scene = new THREE.Scene();
scene.add(new THREE.HemisphereLight(0xe3f1e1, 0x344438, 2.4));
const key = new THREE.DirectionalLight(0xffeccf, 3.2);
key.position.set(3, 6, 5);
scene.add(key);
const rim = new THREE.DirectionalLight(0x9fbddd, 2);
rim.position.set(-4, 3, -3);
scene.add(rim);
const camera = new THREE.PerspectiveCamera(34, 1, 0.01, 100);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.minDistance = 2;
controls.maxDistance = 12;
const pedestal = new THREE.Mesh(
  new THREE.CylinderGeometry(1.35, 1.45, 0.18, 64),
  new THREE.MeshStandardMaterial({ color: 0x425343, roughness: 0.85 }),
);
pedestal.position.y = -0.11;
scene.add(pedestal);
const line = new THREE.Mesh(
  new THREE.TorusGeometry(1.32, 0.009, 6, 96),
  new THREE.MeshBasicMaterial({ color: 0x9eaa7a }),
);
line.rotation.x = Math.PI / 2;
line.position.y = -0.012;
scene.add(line);
function resetView() {
  camera.position.set(3.6, 2.4, 5.6);
  controls.target.set(0, 1.1, 0);
  controls.update();
}
resetView();
new ResizeObserver(() => {
  const w = viewport.clientWidth,
    h = viewport.clientHeight;
  renderer.setSize(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}).observe(viewport);
let model: THREE.Group | undefined;
let mixer: THREE.AnimationMixer | undefined;
let clips: THREE.AnimationClip[] = [];
let active: THREE.AnimationAction | undefined;
let paused = matchMedia("(prefers-reduced-motion: reduce)").matches;
let selection = 0;
const loader = new GLTFLoader();
const clipSelect = element<HTMLSelectElement>("clip");
const pause = element<HTMLButtonElement>("pause");
function updatePause() {
  pause.textContent = paused ? "Play" : "Pause";
  pause.setAttribute("aria-pressed", String(paused));
}
updatePause();
function playClip(name: string) {
  const clip = clips.find((item) => item.name === name);
  if (!clip || !mixer) return;
  active?.stop();
  active = mixer.clipAction(clip);
  active.reset().play();
  mixer.update(0);
  element("status").textContent =
    `${name} · ${clip.duration.toFixed(2)}s · ${clips.length} available motions`;
}
function disposeObject(object: THREE.Group) {
  const geometries = new Set<THREE.BufferGeometry>(),
    materials = new Set<THREE.Material>(),
    textures = new Set<THREE.Texture>(),
    skeletons = new Set<THREE.Skeleton>();
  object.traverse((node) => {
    if (node instanceof THREE.Mesh) {
      geometries.add(node.geometry);
      for (const mat of Array.isArray(node.material)
        ? node.material
        : [node.material])
        materials.add(mat);
    }
    if (node instanceof THREE.SkinnedMesh) skeletons.add(node.skeleton);
  });
  for (const material of materials)
    for (const value of Object.values(material))
      if (value instanceof THREE.Texture) textures.add(value);
  geometries.forEach((item) => item.dispose());
  materials.forEach((item) => item.dispose());
  textures.forEach((item) => {
    if (item.source.data instanceof ImageBitmap) item.source.data.close();
    item.dispose();
  });
  skeletons.forEach((item) => item.dispose());
}
function disposeModel() {
  if (!model) return;
  mixer?.stopAllAction();
  mixer?.uncacheRoot(model);
  scene.remove(model);
  disposeObject(model);
  model = undefined;
  mixer = undefined;
  active = undefined;
  clips = [];
}
async function selectModel(index: number) {
  const id = ++selection;
  const creature = enemyModelRoster[index]!;
  let metadata: ModelReport[][];
  try {
    metadata = await reports;
  } catch (error) {
    if (id === selection) element("status").textContent = String(error);
    return;
  }
  const [report, fbxReport, originalReport] = metadata;
  if (id !== selection) return;
  const entry = [...report, ...fbxReport].find(
    (item) => item.output === creature.file,
  );
  const original = originalReport.find((item) => item.output === creature.file);
  document
    .querySelectorAll<HTMLButtonElement>("nav button")
    .forEach((button) =>
      button.setAttribute(
        "aria-pressed",
        String(Number(button.dataset.index) === index),
      ),
    );
  element("model-name").textContent = creature.name;
  element("family").textContent = creature.family.toUpperCase();
  element("badge").textContent = entry ? "ANIMATED BASE" : "ORIGINAL DRAFT";
  element("status").textContent = "Loading model…";
  clipSelect.replaceChildren();
  element("model-notes").replaceChildren();
  disposeModel();
  try {
    const gltf = await loader.loadAsync(`/models/enemies-v1/${creature.file}`);
    if (id !== selection) {
      disposeObject(gltf.scene);
      return;
    }
    model = gltf.scene;
    clips = gltf.animations;
    mixer = new THREE.AnimationMixer(model);
    for (const clip of clips) clipSelect.add(new Option(clip.name, clip.name));
    clipSelect.value =
      clips.find((clip) => /idle/i.test(clip.name))?.name ??
      clips[0]?.name ??
      "";
    playClip(clipSelect.value);
    // Include a complete idle cycle so lowered wings clear the pedestal.
    const box = new THREE.Box3();
    const idleDuration =
      clips.find((clip) => clip.name === clipSelect.value)?.duration ?? 0;
    for (let sample = 0; sample < 16; sample++) {
      mixer.setTime((idleDuration * sample) / 16);
      model.updateMatrixWorld(true);
      model.traverse((node) => {
        if (node instanceof THREE.SkinnedMesh) node.skeleton.update();
      });
      box.union(new THREE.Box3().setFromObject(model, true));
    }
    mixer.setTime(0);
    const size = box.getSize(new THREE.Vector3());
    const scale = 2.2 / Math.max(size.y, size.x * 0.72, size.z * 0.72);
    model.scale.setScalar(scale);
    const center = box.getCenter(new THREE.Vector3());
    model.position.set(
      -center.x * scale,
      -box.min.y * scale + (creature.file.startsWith("Flying-") ? 0.12 : 0),
      -center.z * scale,
    );
    scene.add(model);
    resetView();
    const notes = element("model-notes");
    const description = document.createElement("p");
    description.textContent = creature.notes;
    notes.appendChild(description);
    const text = document.createElement("p");
    text.textContent = entry
      ? `${(entry.bytes / 1024).toFixed(0)} KB · ${entry.meshes} meshes · ${entry.skins} skins · CC0 source · Self-contained GLB.`
      : `${((original?.bytes ?? 0) / 1024).toFixed(0)} KB · Original project asset · Self-contained animated GLB.`;
    notes.appendChild(text);
    const download = document.createElement("a");
    download.textContent = "Download GLB ↓";
    download.href = `/models/enemies-v1/${creature.file}`;
    download.download = creature.file;
    notes.appendChild(download);
    if (entry) {
      const link = document.createElement("a");
      link.textContent = "Original source ↗";
      link.href = entry.url;
      link.target = "_blank";
      link.rel = "noreferrer";
      link.style.marginLeft = "20px";
      notes.appendChild(link);
    }
  } catch (error) {
    if (id === selection)
      element("status").textContent = `Could not load model: ${String(error)}`;
  }
}
for (const [index, creature] of enemyModelRoster.entries()) {
  const button = document.createElement("button");
  button.type = "button";
  button.dataset.index = String(index);
  button.textContent = creature.name;
  const family = document.createElement("span");
  family.textContent = creature.family;
  button.appendChild(family);
  button.addEventListener("click", () => void selectModel(index));
  element("roster").appendChild(button);
}
element<HTMLInputElement>("model-filter").addEventListener("input", (event) => {
  const query = (event.target as HTMLInputElement).value.toLowerCase();
  document
    .querySelectorAll<HTMLButtonElement>("nav button")
    .forEach(
      (button) =>
        (button.hidden = !button.textContent?.toLowerCase().includes(query)),
    );
});
clipSelect.addEventListener("change", () => playClip(clipSelect.value));
pause.addEventListener("click", () => {
  paused = !paused;
  updatePause();
});
element("reset-view").addEventListener("click", resetView);
let previous = performance.now();
renderer.setAnimationLoop((now) => {
  const delta = Math.min((now - previous) / 1000, 0.05);
  previous = now;
  if (!paused) mixer?.update(delta);
  controls.update();
  renderer.render(scene, camera);
});
void selectModel(enemyModelRoster.length - 1);
