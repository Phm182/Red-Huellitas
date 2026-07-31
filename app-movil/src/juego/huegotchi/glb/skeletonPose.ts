/**
 * Poses por huesos — rig RSG German Shepherd (DEF-*).
 * Los muslos cuelgan de DEF-spine004; no tratar ese hueso como “breathing spine”.
 */

import * as THREE from 'three';
import { HeldStance } from '../domain/poses';

export type BoneRole =
  | 'pelvis'
  | 'spine'
  | 'chest'
  | 'neck'
  | 'head'
  | 'jaw'
  | 'thighL'
  | 'thighR'
  | 'calfL'
  | 'calfR'
  | 'footL'
  | 'footR'
  | 'frontThighL'
  | 'frontThighR'
  | 'frontShinL'
  | 'frontShinR'
  | 'frontFootL'
  | 'frontFootR'
  | 'tail'
  | 'shoulderL'
  | 'shoulderR';

export type TrackedBone = {
  bone: THREE.Bone;
  role: BoneRole;
  restQuat: THREE.Quaternion;
  restPos: THREE.Vector3;
};

export type SkeletonRig = {
  bones: TrackedBone[];
  byRole: Partial<Record<BoneRole, TrackedBone>>;
  skinned: THREE.SkinnedMesh[];
  feet: THREE.Bone[];
};

/** Mapa explícito del pack RSG (nombres sin puntos). */
const EXPLICIT: Record<string, BoneRole> = {
  'DEF-spine': 'pelvis',
  'DEF-spine001': 'spine',
  'DEF-spine002': 'chest',
  'DEF-spine003': 'neck',
  'DEF-spine004': 'pelvis', // ancla de patas traseras en este FBX
  'DEF-jaw': 'jaw',
  'DEF-thighL': 'thighL',
  'DEF-thighR': 'thighR',
  'DEF-shinL': 'calfL',
  'DEF-shinR': 'calfR',
  'DEF-footL': 'footL',
  'DEF-footR': 'footR',
  'DEF-front_thighL': 'frontThighL',
  'DEF-front_thighR': 'frontThighR',
  'DEF-front_shinL': 'frontShinL',
  'DEF-front_shinR': 'frontShinR',
  'DEF-front_footL': 'frontFootL',
  'DEF-front_footR': 'frontFootR',
  'DEF-shoulderL': 'shoulderL',
  'DEF-shoulderR': 'shoulderR',
};

function classify(name: string): BoneRole | null {
  if (EXPLICIT[name]) return EXPLICIT[name];
  const n = name.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (!n || /ik|target|helper|nub|end|tongue|toe|palm|ear|australian|bordercollie/.test(n)) {
    return null;
  }
  if (/frontthighl/.test(n)) return 'frontThighL';
  if (/frontthighr/.test(n)) return 'frontThighR';
  if (/frontshinl/.test(n)) return 'frontShinL';
  if (/frontshinr/.test(n)) return 'frontShinR';
  if (/thighl/.test(n) && !/front/.test(n)) return 'thighL';
  if (/thighr/.test(n) && !/front/.test(n)) return 'thighR';
  if (/shinl|calfl/.test(n) && !/front/.test(n)) return 'calfL';
  if (/shinr|calfr/.test(n) && !/front/.test(n)) return 'calfR';
  if (/jaw/.test(n)) return 'jaw';
  if (/head|skull/.test(n)) return 'head';
  if (/(tail|cola)/.test(n)) return 'tail';
  if (/shoulderl/.test(n)) return 'shoulderL';
  if (/shoulderr/.test(n)) return 'shoulderR';
  if (/(pelvis|hips|hip|sacrum)/.test(n) && !/thigh|leg/.test(n)) return 'pelvis';
  return null;
}

export function extractRig(root: THREE.Object3D): SkeletonRig | null {
  const bones: TrackedBone[] = [];
  const skinned: THREE.SkinnedMesh[] = [];
  const seen = new Set<THREE.Bone>();
  const byRole: Partial<Record<BoneRole, TrackedBone>> = {};

  root.traverse((obj) => {
    const sm = obj as THREE.SkinnedMesh;
    if (sm.isSkinnedMesh) {
      skinned.push(sm);
      for (const bone of sm.skeleton?.bones ?? []) {
        if (seen.has(bone)) continue;
        seen.add(bone);
        const role = classify(bone.name);
        if (!role) continue;
        const tracked: TrackedBone = {
          bone,
          role,
          restQuat: bone.quaternion.clone(),
          restPos: bone.position.clone(),
        };
        bones.push(tracked);
        // Preferir el primer match, salvo pelvis: quedarnos con DEF-spine004 si aparece
        if (!byRole[role] || (role === 'pelvis' && bone.name === 'DEF-spine004')) {
          byRole[role] = tracked;
        }
      }
    }
  });

  if (bones.length === 0 && skinned.length === 0) return null;

  const feet = [
    byRole.footL?.bone,
    byRole.footR?.bone,
    byRole.frontFootL?.bone,
    byRole.frontFootR?.bone,
  ].filter(Boolean) as THREE.Bone[];

  return { bones, byRole, skinned, feet };
}

const _e = new THREE.Euler();
const _q = new THREE.Quaternion();

function addLocalEuler(tracked: TrackedBone | undefined, x: number, y: number, z: number, weight = 1) {
  if (!tracked || weight <= 0) return;
  _e.set(x * weight, y * weight, z * weight, 'XYZ');
  _q.setFromEuler(_e);
  tracked.bone.quaternion.copy(tracked.restQuat).multiply(_q);
}

function lerpPos(tracked: TrackedBone | undefined, dx: number, dy: number, dz: number, weight = 1) {
  if (!tracked || weight <= 0) return;
  tracked.bone.position.set(
    tracked.restPos.x + dx * weight,
    tracked.restPos.y + dy * weight,
    tracked.restPos.z + dz * weight
  );
}

export function resetRig(rig: SkeletonRig) {
  for (const b of rig.bones) {
    b.bone.quaternion.copy(b.restQuat);
    b.bone.position.copy(b.restPos);
  }
}

export function updateSkinned(rig: SkeletonRig) {
  for (const sm of rig.skinned) sm.skeleton.update();
}

/**
 * Pose sostenida + one-shots. `stanceWeight` 0..1 para blend suave.
 * Devuelve pitch/roll sugeridos del root (rad) y sink Y local.
 */
export function applySkeletonPose(
  rig: SkeletonRig,
  opts: {
    heldStance: HeldStance;
    stanceWeight: number;
    actionTrigger: string | null;
    actionT: number;
    time: number;
    mood: string;
  }
): { rootPitch: number; rootRoll: number; sinkY: number } {
  resetRig(rig);

  const r = rig.byRole;
  const t = opts.time;
  const w = Math.max(0, Math.min(1, opts.stanceWeight));
  const breath = Math.sin(t * 2.2) * 0.025;

  // Respiración suave en pecho/cuello (nunca en pelvis/patas).
  addLocalEuler(r.spine, breath, 0, 0, 1 - w * 0.5);
  addLocalEuler(r.chest, breath * 0.55, 0, 0, 1 - w * 0.5);
  addLocalEuler(r.tail, 0, Math.sin(t * 3) * 0.2, Math.sin(t * 2.2) * 0.12, 1);

  let rootPitch = 0;
  let rootRoll = 0;
  let sinkY = 0;

  if (opts.heldStance === 'sit' && w > 0) {
    // Sentado: hundir pelvis, flexionar traseras (ejes locales del FBX), pecho erguido.
    lerpPos(r.pelvis, 0, -0.02 * w, 0.1 * w, 1);
    addLocalEuler(r.pelvis, 0.15 * w, 0, 0, 1);
    addLocalEuler(r.spine, 0.35 * w + breath, 0, 0, 1);
    addLocalEuler(r.chest, 0.2 * w, 0, 0, 1);
    addLocalEuler(r.neck, -0.15 * w, 0, 0, 1);
    addLocalEuler(r.thighL, -0.75 * w, 0.1 * w, 0.08 * w, 1);
    addLocalEuler(r.thighR, -0.75 * w, -0.1 * w, -0.08 * w, 1);
    addLocalEuler(r.calfL, 1.05 * w, 0, 0, 1);
    addLocalEuler(r.calfR, 1.05 * w, 0, 0, 1);
    addLocalEuler(r.frontThighL, -0.22 * w, 0.04 * w, 0, 1);
    addLocalEuler(r.frontThighR, -0.22 * w, -0.04 * w, 0, 1);
    addLocalEuler(r.frontShinL, 0.15 * w, 0, 0, 1);
    addLocalEuler(r.frontShinR, 0.15 * w, 0, 0, 1);
    rootPitch = 0.12 * w;
    sinkY = 0.18 * w;
  } else if ((opts.heldStance === 'lie' || opts.heldStance === 'sleep') && w > 0) {
    const sleep = opts.heldStance === 'sleep' ? 1 : 0.7;
    lerpPos(r.pelvis, 0, -0.04 * w, 0.06 * w, 1);
    addLocalEuler(r.pelvis, 0.1 * w, 0.05 * w, 0.15 * w, 1);
    addLocalEuler(r.spine, 0.2 * w, 0, 0.08 * w, 1);
    addLocalEuler(r.chest, 0.1 * w, 0, 0, 1);
    addLocalEuler(r.neck, 0.25 * w * sleep, 0.1 * w, 0, 1);
    addLocalEuler(r.jaw, sleep > 0.8 ? 0.15 * w : 0, 0, 0, 1);
    addLocalEuler(r.thighL, -0.55 * w, 0.45 * w, 0.2 * w, 1);
    addLocalEuler(r.thighR, -0.45 * w, -0.55 * w, -0.15 * w, 1);
    addLocalEuler(r.calfL, 0.7 * w, 0, 0, 1);
    addLocalEuler(r.calfR, 0.65 * w, 0, 0, 1);
    addLocalEuler(r.frontThighL, -0.7 * w, 0.35 * w, 0.1 * w, 1);
    addLocalEuler(r.frontThighR, -0.65 * w, -0.4 * w, -0.1 * w, 1);
    rootRoll = 0.95 * w;
    rootPitch = 0.05 * w;
    sinkY = 0.24 * w;
  } else {
    const sad = opts.mood === 'triste' || opts.mood === 'enojado' || opts.mood === 'decaido';
    if (sad) {
      addLocalEuler(r.spine, 0.12, 0, 0, 1);
      addLocalEuler(r.neck, 0.18, 0, 0, 1);
      addLocalEuler(r.head, 0.12, 0, 0, 1);
    } else if (opts.mood === 'feliz') {
      addLocalEuler(r.neck, -0.06 + Math.sin(t * 4) * 0.04, Math.sin(t * 2) * 0.06, 0, 1);
      addLocalEuler(r.tail, 0, Math.sin(t * 6) * 0.35, 0, 1);
    }
  }

  // One-shots con actitud (encima de idle/play del mixer se aplican aparte).
  const at = Math.max(0, Math.min(1, opts.actionT));
  const pulse = Math.sin(at * Math.PI);
  const a = opts.actionTrigger;
  if (a && at < 1 && w < 0.5) {
    if (a === 'feed') {
      addLocalEuler(r.neck, 0.35 * pulse, 0, 0, 1);
      addLocalEuler(r.jaw, 0.55 * pulse * (0.5 + 0.5 * Math.sin(at * Math.PI * 8)), 0, 0, 1);
      addLocalEuler(r.spine, 0.12 * pulse, 0, 0, 1);
    } else if (a === 'play' || a === 'catchFood' || a === 'trickSuccess' || a === 'trickSpin') {
      addLocalEuler(r.spine, -0.2 * pulse, 0, Math.sin(at * Math.PI * 4) * 0.15, 1);
      addLocalEuler(r.tail, 0, Math.sin(at * 20) * 0.4, 0, 1);
    } else if (a === 'pet' || a === 'scratch') {
      addLocalEuler(r.neck, -0.2 * pulse, Math.sin(at * 10) * 0.15, 0, 1);
      addLocalEuler(r.jaw, 0.1 * pulse, 0, 0, 1);
    } else if (a === 'speak') {
      addLocalEuler(r.jaw, 0.35 * Math.abs(Math.sin(at * Math.PI * 10)), 0, 0, 1);
      addLocalEuler(r.neck, -0.08 * pulse, 0, 0, 1);
    } else if (a === 'bath') {
      addLocalEuler(r.spine, 0, 0, Math.sin(at * Math.PI * 10) * 0.25, 1);
      addLocalEuler(r.neck, Math.sin(at * 14) * 0.2, 0, 0, 1);
    } else if (a === 'trickFail') {
      addLocalEuler(r.neck, 0.15, Math.sin(at * 16) * 0.3 * (1 - at), 0, 1);
    } else if (a === 'sitDown' || a === 'trickSit') {
      const k = pulse;
      addLocalEuler(r.thighL, -0.75 * k, 0.1 * k, 0.08 * k, 1);
      addLocalEuler(r.thighR, -0.75 * k, -0.1 * k, -0.08 * k, 1);
      addLocalEuler(r.calfL, 1.05 * k, 0, 0, 1);
      addLocalEuler(r.calfR, 1.05 * k, 0, 0, 1);
      rootPitch = 0.12 * k;
      sinkY = 0.18 * k;
    } else if (a === 'lieDown' || a === 'sleep' || a === 'trickPlayDead') {
      const k = pulse;
      rootRoll = 1.05 * k;
      sinkY = 0.28 * k;
    }
  }

  updateSkinned(rig);
  return { rootPitch, rootRoll, sinkY };
}

const _footWorld = new THREE.Vector3();

/** Baja el root para que la pata nunca flote (post-mixer / post-pose). */
export function snapRootToGround(root: THREE.Object3D, feet: THREE.Bone[], baseY = 0) {
  root.updateMatrixWorld(true);
  let minY = Infinity;
  if (feet.length) {
    for (const f of feet) {
      f.getWorldPosition(_footWorld);
      if (_footWorld.y < minY) minY = _footWorld.y;
    }
  } else {
    const box = new THREE.Box3().setFromObject(root);
    minY = box.min.y;
  }
  if (!Number.isFinite(minY)) return;
  root.position.y += baseY - minY;
}
