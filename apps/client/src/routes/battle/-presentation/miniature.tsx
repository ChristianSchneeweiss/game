import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import {
  AnimationMixer,
  Group,
  LoopOnce,
  LoopRepeat,
  Mesh,
  SkinnedMesh,
  Texture,
  Material,
} from "three";
import { GLTFLoader, type GLTF } from "three/addons/loaders/GLTFLoader.js";
import { clone } from "three/addons/utils/SkeletonUtils.js";
import type { MiniatureAction, MiniatureDefinition } from "./visual-manifest";

// Each URL has independent ownership. Instances share immutable asset data,
// while retaining their own skeletons and animation mixers.
type CacheEntry = {
  promise: Promise<GLTF>;
  owners: number;
  eviction?: ReturnType<typeof setTimeout>;
};
const cache = new Map<string, CacheEntry>();
function disposeAsset(asset: GLTF) {
  const geometries = new Set<Mesh["geometry"]>();
  const materials = new Set<Material>();
  const textures = new Set<Texture>();
  asset.scene.traverse((node) => {
    if (!(node instanceof Mesh)) return;
    geometries.add(node.geometry);
    const list = Array.isArray(node.material) ? node.material : [node.material];
    for (const material of list) {
      // Materials and texture images are shared by all six instances.
      for (const value of Object.values(material))
        if (value instanceof Texture) textures.add(value);
      materials.add(material);
    }
    if (node instanceof SkinnedMesh) node.skeleton.dispose();
  });
  geometries.forEach((geometry) => geometry.dispose());
  materials.forEach((material) => material.dispose());
  const images = new Set<ImageBitmap>();
  textures.forEach((texture) => {
    if (
      typeof ImageBitmap !== "undefined" &&
      texture.image instanceof ImageBitmap
    )
      images.add(texture.image);
    texture.dispose();
  });
  images.forEach((bitmap) => bitmap.close());
}

export type MiniatureAssetResult = { asset?: GLTF; error?: boolean };

export function useMiniatureAssets(urls: string[]) {
  const key = JSON.stringify([...new Set(urls)].sort());
  const [results, setResults] = useState(
    new Map<string, MiniatureAssetResult & { entry: CacheEntry }>(),
  );
  useEffect(() => {
    let active = true;
    const requested: string[] = JSON.parse(key);
    const owned = requested.map((url) => {
      let entry = cache.get(url);
      if (!entry) {
        const promise = fetch(url, { signal: AbortSignal.timeout(12000) })
          .then((response) => {
            if (!response.ok) throw new Error("Miniature unavailable");
            return response.arrayBuffer();
          })
          .then((buffer) =>
            new GLTFLoader().parseAsync(
              buffer,
              url.slice(0, url.lastIndexOf("/") + 1),
            ),
          );
        entry = { promise, owners: 0 };
        cache.set(url, entry);
      }
      const lease = entry;
      lease.owners++;
      clearTimeout(lease.eviction);
      const publish = (result: MiniatureAssetResult) => {
        if (!active) return;
        setResults((previous) => {
          const next = new Map(
            requested.flatMap((name) => {
              const value = previous.get(name);
              return value ? [[name, value] as const] : [];
            }),
          );
          next.set(url, { ...result, entry: lease });
          return next;
        });
      };
      lease.promise
        .then((asset) => publish({ asset }))
        .catch(() => publish({ error: true }));
      return { url, lease };
    });
    return () => {
      active = false;
      for (const { url, lease } of owned) {
        lease.owners--;
        lease.eviction = setTimeout(() => {
          if (lease.owners !== 0 || cache.get(url) !== lease) return;
          cache.delete(url);
          lease.promise.then(disposeAsset).catch(() => {});
        }, 1000);
      }
    };
  }, [key]);
  return useMemo(
    () =>
      new Map<string, MiniatureAssetResult>(
        (JSON.parse(key) as string[]).map((url) => {
          const result = results.get(url);
          return [url, result && cache.get(url) === result.entry ? result : {}];
        }),
      ),
    [key, results],
  );
}

type Props = {
  asset: GLTF;
  definition: MiniatureDefinition;
  action: MiniatureAction;
  cueKey: string;
  reducedMotion: boolean;
  deathSettled: boolean;
  speed: number;
  durationMs: number;
};
export function Miniature({
  asset,
  definition,
  action,
  cueKey,
  reducedMotion,
  deathSettled,
  speed,
  durationMs,
}: Props) {
  const pose = useRef<Group>(null);
  const elapsed = useRef(0);
  const instance = useMemo(() => {
    const root = clone(asset.scene);
    root.traverse((node) => {
      if (node instanceof Mesh) {
        node.castShadow = true;
        node.receiveShadow = true;
        node.frustumCulled = false;
      }
    });
    return { root, mixer: new AnimationMixer(root) };
  }, [asset]);
  useEffect(
    () => () => {
      instance.mixer.stopAllAction();
      instance.mixer.uncacheRoot(instance.root);
      instance.root.traverse((node) => {
        if (node instanceof SkinnedMesh) node.skeleton.dispose();
      });
    },
    [instance],
  );
  useEffect(() => {
    elapsed.current = 0;
    const name =
      definition.clips[reducedMotion && action !== "death" ? "idle" : action];
    const requested = asset.animations.find(
      (clip) => clip.name === name && clip.duration > 0,
    );
    const clip =
      requested ??
      asset.animations.find(
        (clip) => clip.name === definition.clips.idle && clip.duration > 0,
      );
    instance.mixer.stopAllAction();
    if (!clip) return;
    const animation = instance.mixer.clipAction(clip);
    animation
      .reset()
      .setLoop(
        action === "idle" ? LoopRepeat : LoopOnce,
        action === "idle" ? Infinity : 1,
      );
    animation.clampWhenFinished = true;
    animation.timeScale = ["attack", "cast", "heal"].includes(action)
      ? clip.duration * (1000 / durationMs)
      : 1;
    animation.play();
    if (action === "death" && !requested) animation.paused = true;
    if (reducedMotion || (action === "death" && deathSettled)) {
      animation.time = action === "death" && requested ? clip.duration : 0;
    }
    instance.mixer.update(0);
    return () => {
      animation.stop();
    };
  }, [
    instance,
    asset,
    definition,
    action,
    cueKey,
    reducedMotion,
    deathSettled,
    durationMs,
  ]);
  const nativeDeath = asset.animations.some(
    (clip) => clip.name === definition.clips.death && clip.duration > 0,
  );
  const nativeHit = asset.animations.some(
    (clip) => clip.name === definition.clips.hit && clip.duration > 0,
  );
  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.1) * speed;
    if (!reducedMotion) instance.mixer.update(dt);
    elapsed.current += dt;
    if (!pose.current) return;
    const falling = action === "death";
    const progress =
      falling && (deathSettled || reducedMotion)
        ? 1
        : Math.min(elapsed.current / 0.65, 1);
    const topple = falling && !nativeDeath ? (progress * Math.PI) / 2 : 0;
    pose.current.rotation.x = -topple;
    pose.current.rotation.z =
      action === "hit" && !nativeHit && !reducedMotion
        ? Math.sin(Math.min(elapsed.current / 0.35, 1) * Math.PI) * 0.16
        : 0;
    // Ground native death poses (including flying rigs), or a toppled idle body.
    pose.current.position.y =
      falling && nativeDeath
        ? ((definition.deathOffsetY ?? 0) - (definition.offset?.[1] ?? 0)) *
          progress
        : Math.sin(topple) * (definition.halfDepth ?? 0.35);
  });
  return (
    <group ref={pose}>
      <group position={definition.offset ?? [0, 0, 0]}>
        <primitive
          object={instance.root}
          scale={definition.scale}
          dispose={null}
        />
      </group>
    </group>
  );
}
