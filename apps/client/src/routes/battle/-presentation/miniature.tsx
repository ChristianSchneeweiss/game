import { useEffect, useMemo, useState } from "react";
import { useFrame } from "@react-three/fiber";
import {
  AnimationMixer,
  LoopOnce,
  LoopRepeat,
  Mesh,
  SkinnedMesh,
  Texture,
  Material,
} from "three";
import { GLTFLoader, type GLTF } from "three/addons/loaders/GLTFLoader.js";
import { clone } from "three/addons/utils/SkeletonUtils.js";
import { miniature } from "./visual-manifest";

// One immutable asset cache. Instances own only their skeletons and mixers.
let cached: Promise<GLTF> | undefined;
let owners = 0;
let eviction: ReturnType<typeof setTimeout> | undefined;
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

export function useMiniatureAsset() {
  const [asset, setAsset] = useState<GLTF>();
  const [error, setError] = useState(false);
  useEffect(() => {
    owners++;
    clearTimeout(eviction);
    let active = true;
    if (!cached) {
      cached = fetch(miniature.url, { signal: AbortSignal.timeout(12000) })
        .then((response) => {
          if (!response.ok) throw new Error("Miniature unavailable");
          return response.arrayBuffer();
        })
        .then((buffer) =>
          new GLTFLoader().parseAsync(buffer, "/models/kaykit-skeletons-1.0/"),
        );
    }
    cached
      .then((gltf) => {
        if (active) setAsset(gltf);
      })
      .catch(() => {
        if (active) setError(true);
      });
    return () => {
      active = false;
      owners--;
      eviction = setTimeout(() => {
        if (owners !== 0) return;
        const previous = cached;
        cached = undefined;
        previous?.then(disposeAsset).catch(() => {});
      }, 1000);
    };
  }, []);
  return { asset, error };
}

type Props = {
  asset: GLTF;
  action: "idle" | "attack" | "hit" | "death";
  cueKey: string;
  reducedMotion: boolean;
  speed: number;
};
export function Miniature({
  asset,
  action,
  cueKey,
  reducedMotion,
  speed,
}: Props) {
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
    const name =
      miniature.clips[reducedMotion && action !== "death" ? "idle" : action];
    const clip = asset.animations.find(
      (clip) => clip.name === name && clip.duration > 0,
    );
    instance.mixer.stopAllAction();
    if (!clip) return; // The outer marker still presents impact/death.
    const animation = instance.mixer.clipAction(clip);
    animation
      .reset()
      .setLoop(
        action === "idle" ? LoopRepeat : LoopOnce,
        action === "idle" ? Infinity : 1,
      );
    animation.clampWhenFinished = true;
    animation.timeScale = action === "attack" ? clip.duration : 1;
    animation.play();
    if (reducedMotion) {
      animation.time = action === "death" ? clip.duration : 0;
      instance.mixer.update(0);
    }
    return () => {
      animation.stop();
    };
  }, [instance, asset, action, cueKey, reducedMotion]);
  useFrame((_, delta) => {
    if (!reducedMotion) instance.mixer.update(Math.min(delta, 0.1) * speed);
  });
  return (
    <primitive object={instance.root} scale={miniature.scale} dispose={null} />
  );
}
