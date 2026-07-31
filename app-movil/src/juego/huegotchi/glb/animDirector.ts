/**
 * Director de animación GLB: cada acción → clip distinto + overlay de huesos.
 * Pack perro: idle / play / walk / run / turn / lean.
 */

import * as THREE from 'three';
import { HeldStance, poseDuration } from '../domain/poses';
import { GlbClipId } from './registry';
import { applyProceduralMotion } from './procedural';
import { SkeletonRig, snapRootToGround, updateSkinned } from './skeletonPose';

export type DirectorRefs = {
  yaw: number;
  heldStance: HeldStance;
  actionTrigger: string | null;
  mood: string;
  actionStartedAt: number | null;
};

export type DirectorRuntime = {
  mixer: THREE.AnimationMixer | null;
  actions: Partial<Record<GlbClipId, THREE.AnimationAction>>;
  currentClip: GlbClipId | null;
  stanceWeight: number;
  lastHeld: HeldStance;
};

function firstAvailable(
  has: Partial<Record<GlbClipId, THREE.AnimationClip>>,
  ids: GlbClipId[]
): GlbClipId | null {
  for (const id of ids) if (has[id]) return id;
  return null;
}

/**
 * Mapa explícito acción → clip (no todo a "play").
 */
export function pickClip(
  held: HeldStance,
  action: string | null,
  mood: string,
  has: Partial<Record<GlbClipId, THREE.AnimationClip>>
): GlbClipId | null {
  // Posturas sostenidas: sin clip (pose de huesos). Transiciones sí animan.
  if (held === 'sit' || held === 'lie' || held === 'sleep') {
    if (action === 'standUp') return firstAvailable(has, ['walk', 'idle']);
    if (action === 'sitDown' || action === 'trickSit') return firstAvailable(has, ['walk', 'idle']);
    return null;
  }

  switch (action) {
    case 'feed':
      // Se agacha / se estira hacia la comida
      return firstAvailable(has, ['lean', 'play', 'idle']);
    case 'play':
    case 'trickSuccess':
      return firstAvailable(has, ['play', 'run', 'idle']);
    case 'catchFood':
      return firstAvailable(has, ['run', 'play', 'walk']);
    case 'bath':
      // Sacudida / giro
      return firstAvailable(has, ['turn', 'play', 'lean']);
    case 'poke':
      return firstAvailable(has, ['play', 'lean', 'idle']);
    case 'pet':
    case 'scratch':
      return firstAvailable(has, ['idle', 'lean']);
    case 'speak':
    case 'yawn':
      return firstAvailable(has, ['idle']);
    case 'trickSpin':
      return firstAvailable(has, ['turn', 'walk', 'play']);
    case 'trickFail':
      return firstAvailable(has, ['lean', 'idle']);
    case 'standUp':
      return firstAvailable(has, ['walk', 'idle']);
    case 'sitDown':
    case 'trickSit':
      return firstAvailable(has, ['walk', 'idle']);
    case 'lieDown':
    case 'sleep':
    case 'trickPlayDead':
      return firstAvailable(has, ['lean', 'idle']);
    default:
      break;
  }

  // Humor: feliz NO fuerza play (eso hacía que todo se viera igual).
  if (mood === 'feliz') return firstAvailable(has, ['idle', 'play']);
  if (mood === 'triste' || mood === 'decaido' || mood === 'enojado') {
    return firstAvailable(has, ['idle']);
  }
  return firstAvailable(has, ['idle', 'play']);
}

function clipSpeed(id: GlbClipId, action: string | null): number {
  if (id === 'run') return action === 'catchFood' ? 1.35 : 1.15;
  if (id === 'play') return action === 'play' || action === 'trickSuccess' ? 1.25 : 1.1;
  if (id === 'turn') return action === 'bath' ? 1.4 : 1.15;
  if (id === 'lean') return action === 'feed' ? 0.85 : 1.1;
  if (id === 'walk') return 1.05;
  return 1;
}

export function createDirectorRuntime(
  root: THREE.Object3D,
  clips: Partial<Record<GlbClipId, THREE.AnimationClip>>
): DirectorRuntime {
  const actions: Partial<Record<GlbClipId, THREE.AnimationAction>> = {};
  let mixer: THREE.AnimationMixer | null = null;
  if (Object.keys(clips).length > 0) {
    mixer = new THREE.AnimationMixer(root);
    (Object.keys(clips) as GlbClipId[]).forEach((id) => {
      const clip = clips[id];
      if (!clip || !mixer) return;
      const action = mixer.clipAction(clip);
      action.enabled = true;
      // turn/lean: loop OK; one-shots también loopan mientras dure la acción
      action.setLoop(THREE.LoopRepeat, Infinity);
      actions[id] = action;
    });
  }
  return {
    mixer,
    actions,
    currentClip: null,
    stanceWeight: 0,
    lastHeld: 'sit',
  };
}

function crossFade(rt: DirectorRuntime, next: GlbClipId | null, fade = 0.28) {
  if (next === rt.currentClip) return;
  if (rt.currentClip && rt.actions[rt.currentClip]) {
    rt.actions[rt.currentClip]!.fadeOut(fade);
  }
  if (next && rt.actions[next]) {
    const a = rt.actions[next]!;
    a.reset().setEffectiveTimeScale(1).setEffectiveWeight(1).fadeIn(fade).play();
  }
  rt.currentClip = next;
}

function stopMixer(rt: DirectorRuntime) {
  if (!rt.mixer) return;
  rt.mixer.stopAllAction();
  rt.currentClip = null;
}

export function tickDirector(
  root: THREE.Group,
  rt: DirectorRuntime,
  clips: Partial<Record<GlbClipId, THREE.AnimationClip>>,
  refs: DirectorRefs,
  dt: number,
  time: number
) {
  const held = refs.heldStance;
  const trigger = refs.actionTrigger;
  let actionT = 0;
  if (trigger && refs.actionStartedAt != null) {
    actionT = (performance.now() - refs.actionStartedAt) / poseDuration(trigger);
  }

  if (held !== 'none') rt.lastHeld = held;
  const wantHeld = held !== 'none';
  const blendSpeed = wantHeld ? 3.4 : 4.5;
  if (wantHeld) rt.stanceWeight = Math.min(1, rt.stanceWeight + dt * blendSpeed);
  else rt.stanceWeight = Math.max(0, rt.stanceWeight - dt * blendSpeed);

  const stanceForPose: HeldStance =
    held !== 'none' ? held : rt.stanceWeight > 0.04 ? rt.lastHeld : 'none';

  let wantClip = pickClip(held, trigger, refs.mood, clips);
  // Tras el arranque de la transición, comprometer postura (no quedarse en walk).
  if (
    (held === 'sit' || held === 'lie' || held === 'sleep') &&
    rt.stanceWeight > 0.42
  ) {
    wantClip = null;
  }
  const rig = root.userData.rig as SkeletonRig | null | undefined;
  const usePose =
    (stanceForPose !== 'none' && rt.stanceWeight > 0.02 && wantClip == null) || !rt.mixer;

  root.rotation.y = refs.yaw;

  if (usePose || !rt.mixer) {
    if (rt.mixer && rt.currentClip) stopMixer(rt);
    applyProceduralMotion(root, {
      yaw: refs.yaw,
      heldStance: stanceForPose === 'none' ? 'none' : stanceForPose,
      stanceWeight: stanceForPose === 'none' ? 0 : rt.stanceWeight,
      actionTrigger: trigger,
      mood: refs.mood,
      time,
      actionT,
    });
    return;
  }

  crossFade(rt, wantClip);
  if (rt.currentClip && rt.actions[rt.currentClip]) {
    rt.actions[rt.currentClip]!.setEffectiveTimeScale(clipSpeed(rt.currentClip, trigger));
  }
  rt.mixer.update(dt);

  if (rig) {
    applyActionOverlay(rig, trigger, actionT, time, refs.mood);
    updateSkinned(rig);
  }

  const pivot = root.userData.pivot as THREE.Group | undefined;
  if (pivot) {
    applyRootAttitude(pivot, trigger, actionT, time);
  }
  root.rotation.x = 0;
  root.rotation.z = 0;

  if (
    rig?.feet?.length &&
    (rt.currentClip === 'idle' || rt.currentClip === 'walk' || rt.currentClip === 'lean' || !rt.currentClip)
  ) {
    snapRootToGround(root, rig.feet, 0);
  }
}

function applyRootAttitude(
  pivot: THREE.Group,
  action: string | null,
  actionT: number,
  time: number
) {
  pivot.rotation.set(0, 0, 0);
  const at = Math.max(0, Math.min(1, actionT));
  const pulse = Math.sin(at * Math.PI);

  if (!action || at >= 1) {
    pivot.position.y = Math.sin(time * 2.2) * 0.008;
    return;
  }

  switch (action) {
    case 'feed':
      pivot.position.y = pulse * 0.04;
      pivot.rotation.x = 0.12 * pulse;
      break;
    case 'play':
    case 'trickSuccess':
      pivot.position.y = pulse * 0.1;
      pivot.rotation.z = Math.sin(at * Math.PI * 4) * 0.08;
      break;
    case 'catchFood':
      pivot.position.y = pulse * 0.12;
      break;
    case 'bath':
      pivot.position.y = Math.abs(Math.sin(at * Math.PI * 7)) * 0.05;
      pivot.rotation.z = Math.sin(at * Math.PI * 10) * 0.12;
      pivot.rotation.y = Math.sin(at * Math.PI * 6) * 0.15;
      break;
    case 'trickSpin':
      pivot.rotation.y = at * Math.PI * 2;
      pivot.position.y = pulse * 0.06;
      break;
    case 'poke':
      pivot.position.y = pulse * 0.07;
      pivot.rotation.x = -0.1 * pulse;
      break;
    case 'pet':
    case 'scratch':
      pivot.position.y = pulse * 0.03;
      pivot.rotation.z = Math.sin(at * 8) * 0.05;
      break;
    case 'trickFail':
      pivot.rotation.z = Math.sin(at * 16) * 0.1 * (1 - at);
      break;
    default:
      pivot.position.y = pulse * 0.03;
  }
}

/** Overlay aditivo post-mixer: cada acción se siente distinta. */
function applyActionOverlay(
  rig: SkeletonRig,
  action: string | null,
  actionT: number,
  time: number,
  mood: string
) {
  const jaw = rig.byRole.jaw;
  const neck = rig.byRole.neck;
  const spine = rig.byRole.spine;
  const chest = rig.byRole.chest;
  const tail = rig.byRole.tail;
  const _e = new THREE.Euler();
  const _q = new THREE.Quaternion();

  const add = (tracked: typeof jaw, x: number, y: number, z: number) => {
    if (!tracked) return;
    _e.set(x, y, z, 'XYZ');
    _q.setFromEuler(_e);
    tracked.bone.quaternion.multiply(_q);
  };

  // Idle feliz: cola y orejas/cuello, sin cambiar de clip.
  if (!action || actionT >= 1) {
    if (mood === 'feliz') {
      add(tail, 0, Math.sin(time * 7) * 0.35, Math.sin(time * 5) * 0.15);
      add(neck, -0.05 + Math.sin(time * 3) * 0.03, Math.sin(time * 2.2) * 0.05, 0);
    } else if (mood === 'triste' || mood === 'decaido') {
      add(neck, 0.18, 0, 0);
      add(spine, 0.08, 0, 0);
    }
    return;
  }

  const at = Math.max(0, Math.min(1, actionT));
  const pulse = Math.sin(at * Math.PI);

  switch (action) {
    case 'feed':
      add(neck, 0.45 * pulse, 0, 0);
      add(jaw, 0.55 * pulse * (0.4 + 0.6 * Math.abs(Math.sin(at * Math.PI * 10))), 0, 0);
      add(spine, 0.18 * pulse, 0, 0);
      add(chest, 0.1 * pulse, 0, 0);
      break;
    case 'speak':
      add(jaw, 0.45 * Math.abs(Math.sin(at * Math.PI * 14)), 0, 0);
      add(neck, -0.1 * pulse, 0, 0);
      break;
    case 'yawn':
      add(jaw, 0.7 * pulse, 0, 0);
      add(neck, 0.2 * pulse, 0, 0);
      break;
    case 'pet':
    case 'scratch':
      add(neck, -0.25 * pulse, Math.sin(at * 14) * 0.2, 0);
      add(jaw, 0.12 * pulse, 0, 0);
      add(tail, 0, Math.sin(time * 10) * 0.3 * pulse, 0);
      break;
    case 'bath':
      add(spine, 0, 0, Math.sin(at * Math.PI * 14) * 0.28);
      add(neck, Math.sin(at * 16) * 0.25, 0, 0);
      add(tail, 0, Math.sin(at * 20) * 0.4, 0);
      break;
    case 'play':
    case 'catchFood':
    case 'trickSuccess':
      add(tail, 0, Math.sin(time * 16) * 0.45 * pulse, 0);
      add(neck, -0.15 * pulse, Math.sin(at * 10) * 0.1, 0);
      add(jaw, 0.15 * pulse, 0, 0);
      break;
    case 'poke':
      add(neck, -0.2 * pulse, 0, 0);
      add(spine, -0.1 * pulse, 0, 0);
      break;
    case 'trickSpin':
      add(tail, 0, Math.sin(time * 18) * 0.5, 0);
      add(neck, -0.1, Math.sin(at * Math.PI * 2) * 0.2, 0);
      break;
    case 'trickFail':
      add(neck, 0.2, Math.sin(at * 18) * 0.35 * (1 - at), 0);
      break;
    default:
      add(neck, -0.08 * pulse, 0, 0);
  }
}

export function disposeDirector(rt: DirectorRuntime) {
  stopMixer(rt);
  rt.mixer = null;
}
