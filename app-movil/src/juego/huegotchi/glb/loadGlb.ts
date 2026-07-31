import { Asset } from 'expo-asset';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { normalizeGlbRoot } from './procedural';
import { GlbClipId, GlbPack } from './registry';

async function assetUri(moduleId: number): Promise<string> {
  const asset = Asset.fromModule(moduleId);
  await asset.downloadAsync();
  const uri = asset.localUri ?? asset.uri;
  if (!uri) throw new Error('Asset sin URI');
  return uri;
}

async function loadGltf(moduleId: number) {
  const uri = await assetUri(moduleId);
  const loader = new GLTFLoader();
  try {
    const res = await fetch(uri);
    const buf = await res.arrayBuffer();
    return loader.parseAsync(buf, '');
  } catch {
    return new Promise<Awaited<ReturnType<GLTFLoader['loadAsync']>>>((resolve, reject) => {
      loader.load(uri, resolve, undefined, reject);
    });
  }
}

export type LoadedGlbPet = {
  root: THREE.Group;
  clips: Partial<Record<GlbClipId, THREE.AnimationClip>>;
  hasClips: boolean;
};

async function applyAlbedo(root: THREE.Object3D, albedoModule: number) {
  const uri = await assetUri(albedoModule);
  const tex = await new THREE.TextureLoader().loadAsync(uri);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.flipY = false;
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh) return;
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const m of mats) {
      const mat = m as THREE.MeshStandardMaterial;
      if (!mat) continue;
      mat.map = tex;
      mat.roughness = 0.75;
      mat.metalness = 0.05;
      mat.side = THREE.DoubleSide;
      mat.needsUpdate = true;
    }
  });
}

/**
 * Carga mesh (+ textura) y clips de animación separados (mismo rig).
 */
export async function loadGlbPetPack(pack: GlbPack): Promise<LoadedGlbPet> {
  const meshGltf = await loadGltf(pack.mesh);
  meshGltf.scene.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (mesh.isMesh) {
      mesh.castShadow = false;
      mesh.receiveShadow = false;
    }
  });

  const root = normalizeGlbRoot(meshGltf.scene);
  root.userData.restPose = pack.restPose ?? 'stand';
  if (pack.albedo != null) {
    try {
      await applyAlbedo(root, pack.albedo);
    } catch (e) {
      console.warn('[GlbPet] albedo falló', e);
    }
  }

  const clips: Partial<Record<GlbClipId, THREE.AnimationClip>> = {};
  const entries = Object.entries(pack.clips) as [GlbClipId, number][];
  await Promise.all(
    entries.map(async ([id, mod]) => {
      try {
        const g = await loadGltf(mod);
        const clip = g.animations[0];
        if (clip) {
          clip.name = id;
          clips[id] = clip;
        }
      } catch (e) {
        console.warn('[GlbPet] clip falló', id, e);
      }
    })
  );

  return { root, clips, hasClips: Object.keys(clips).length > 0 };
}

/** Compat: solo mesh. */
export async function loadNormalizedGlb(moduleId: number): Promise<THREE.Group> {
  const { root } = await loadGlbPetPack({ mesh: moduleId, clips: {} });
  return root;
}
