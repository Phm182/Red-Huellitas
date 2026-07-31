/**
 * Normalización + motion del modelo GLB.
 * Con clips: el director maneja el mixer; acá normalize + fallback rígido.
 */

import * as THREE from 'three';
import { HeldStance } from '../domain/poses';
import { applySkeletonPose, extractRig, SkeletonRig, snapRootToGround } from './skeletonPose';

export type GlbVisualInput = {
  yaw: number;
  heldStance: HeldStance;
  stanceWeight: number;
  actionTrigger: string | null;
  mood: string;
  time: number;
  actionT: number;
};

/** Centra, escala y apoya en y=0. Hip-pivot solo si NO hay skin. */
export function normalizeGlbRoot(scene: THREE.Object3D): THREE.Group {
  const root = new THREE.Group();
  const pivot = new THREE.Group();
  const hip = new THREE.Group();
  root.add(pivot);
  pivot.add(hip);
  hip.add(scene);

  const box = new THREE.Box3().setFromObject(hip);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  scene.position.sub(center);

  const maxDim = Math.max(size.x, size.y, size.z, 0.001);
  const s = 1.7 / maxDim;
  root.scale.setScalar(s);

  root.updateMatrixWorld(true);
  const grounded = new THREE.Box3().setFromObject(root);
  root.position.y = -grounded.min.y;

  const rig = extractRig(root);
  const hasSkeleton = !!(rig && (rig.bones.length > 0 || rig.skinned.length > 0));

  if (!hasSkeleton) {
    root.updateMatrixWorld(true);
    const tall = new THREE.Box3().setFromObject(root);
    const height = Math.max(0.01, tall.max.y - tall.min.y);
    const hipLocal = (height * 0.28) / s;
    hip.position.y = hipLocal;
    scene.position.y -= hipLocal;
    root.updateMatrixWorld(true);
    const g2 = new THREE.Box3().setFromObject(root);
    root.position.y = -g2.min.y;
  }

  root.userData.pivot = pivot;
  root.userData.hip = hip;
  root.userData.rig = rig;
  root.userData.hasSkeleton = hasSkeleton;
  root.userData.groundBaseY = 0;

  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    console.log(
      '[GlbPet]',
      hasSkeleton
        ? `esqueleto OK · ${rig!.bones.length} huesos · pies ${rig!.feet.length}`
        : 'SIN esqueleto (motion rígido + hip pivot)'
    );
  }

  return root;
}

/** Motion cuando no hay mixer (gato estático / sin clips). */
export function applyProceduralMotion(root: THREE.Group, input: GlbVisualInput) {
  const pivot = (root.userData.pivot as THREE.Group | undefined) ?? root;
  const hip = (root.userData.hip as THREE.Group | undefined) ?? pivot;
  const rig = root.userData.rig as SkeletonRig | null | undefined;
  const hasSkeleton = !!root.userData.hasSkeleton && !!rig;
  const restSit = root.userData.restPose === 'sit';

  root.rotation.y = input.yaw;
  root.rotation.x = 0;
  root.rotation.z = 0;
  pivot.rotation.set(0, 0, 0);
  pivot.scale.set(1, 1, 1);
  hip.rotation.set(0, 0, 0);

  if (hasSkeleton && rig) {
    const posed = applySkeletonPose(rig, {
      heldStance: input.heldStance,
      stanceWeight: input.stanceWeight,
      actionTrigger: input.actionTrigger,
      actionT: input.actionT,
      time: input.time,
      mood: input.mood,
    });
    root.rotation.x = posed.rootPitch;
    root.rotation.z = posed.rootRoll;
    pivot.position.y = -posed.sinkY;
    snapRootToGround(root, rig.feet, 0);
    return;
  }

  const t = input.time;
  const at = Math.max(0, Math.min(1, input.actionT));
  const action = input.actionTrigger;
  const w = input.stanceWeight;
  let rootY = 0;
  let hipRx = 0;
  let hipRz = 0;
  let sx = 1;
  let sy = 1;
  let sz = 1;

  if (restSit) {
    // Mesh ya sentado: "stand" = respirar; lie/sleep = tumbar; sit = idle.
    if (input.heldStance === 'sleep' || input.heldStance === 'lie') {
      hipRz = (input.heldStance === 'sleep' ? 1.1 : 0.75) * w;
      hipRx = -0.25 * w;
      rootY = -0.08 * w;
      sy = 1 - 0.06 * w;
    } else {
      const sad = input.mood === 'triste' || input.mood === 'enojado' || input.mood === 'decaido';
      const happy = input.mood === 'feliz';
      rootY = Math.sin(t * (sad ? 1.4 : 2.4)) * (sad ? 0.015 : 0.035);
      hipRz = Math.sin(t * 1.6) * (sad ? 0.03 : 0.06);
      hipRx = sad ? 0.08 : Math.sin(t * 2) * 0.03;
      if (happy) {
        rootY += Math.abs(Math.sin(t * 3.4)) * 0.03;
        sy = 1 + Math.sin(t * 3.4) * 0.03;
      }
    }
  } else if (input.heldStance === 'sleep' || input.heldStance === 'lie') {
    hipRx = -1.25 * w;
    hipRz = (input.heldStance === 'sleep' ? 0.9 : 0.55) * w;
    rootY = -0.22 * w + Math.sin(t * 1.2) * 0.012 * w;
    sy = 1 - 0.08 * w;
    sx = 1 + 0.06 * w;
  } else if (input.heldStance === 'sit') {
    hipRx = -1.05 * w;
    rootY = -0.16 * w + Math.sin(t * 2) * 0.01 * w;
    sy = 1 - 0.1 * w;
    sx = 1 + 0.08 * w;
  } else {
    const sad = input.mood === 'triste' || input.mood === 'enojado' || input.mood === 'decaido';
    const happy = input.mood === 'feliz';
    rootY = Math.sin(t * (sad ? 1.6 : 2.6)) * (sad ? 0.02 : 0.045);
    hipRz = Math.sin(t * 1.7) * (sad ? 0.03 : 0.07);
    hipRx = sad ? 0.12 : Math.sin(t * 2.2) * 0.04;
    if (happy) {
      rootY += Math.abs(Math.sin(t * 3.6)) * 0.035;
      sy = 1 + Math.sin(t * 3.6) * 0.035;
    }
  }

  if (action && at < 1) {
    const pulse = Math.sin(at * Math.PI);
    if (action === 'play' || action === 'catchFood' || action === 'trickSuccess' || action === 'trickSpin') {
      rootY += pulse * (restSit ? 0.18 : 0.28);
      sy = 1 + pulse * 0.12;
      sx = 1 - pulse * 0.06;
      hipRz += Math.sin(at * Math.PI * 5) * 0.28;
      if (action === 'trickSpin') pivot.rotation.y = at * Math.PI * 2;
    } else if (action === 'feed' || action === 'pet' || action === 'scratch' || action === 'speak') {
      hipRx += (restSit ? -0.25 : -0.4) * pulse;
      rootY += pulse * 0.1;
      sy = 1 + pulse * 0.06;
    } else if (action === 'bath') {
      hipRz += Math.sin(at * Math.PI * 9) * 0.45;
      rootY += Math.abs(Math.sin(at * Math.PI * 6)) * 0.08;
    } else if (action === 'trickFail') {
      hipRz += Math.sin(at * Math.PI * 10) * 0.35 * (1 - at);
    } else if (action === 'lieDown' || action === 'sleep' || action === 'trickPlayDead') {
      hipRz = (restSit ? 1.0 : 0.7) * pulse;
      hipRx = (restSit ? -0.2 : -1.25) * pulse;
      rootY = -0.12 * pulse;
    } else if (!restSit && (action === 'sitDown' || action === 'trickSit')) {
      hipRx = -1.05 * pulse;
      rootY = -0.16 * pulse;
    } else {
      rootY += pulse * 0.1;
    }
  }

  pivot.position.y = rootY;
  pivot.scale.set(sx, sy, sz);
  hip.rotation.x = hipRx;
  hip.rotation.z = hipRz;
}
