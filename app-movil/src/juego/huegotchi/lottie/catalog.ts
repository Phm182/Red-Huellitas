/**
 * Catálogo Lottie HueGotchi — clips free de LottieFiles (Simple License).
 * Ver ATTRIBUTION.md para créditos.
 */

import { HueSpecies } from '../domain/types';
import type { AnimationObject } from 'lottie-react-native';

export type LottieClipId =
  | 'idle'
  | 'happy'
  | 'sad'
  | 'sit'
  | 'lie'
  | 'sleep'
  | 'feed'
  | 'play'
  | 'bath'
  | 'pet'
  | 'speak'
  | 'success'
  | 'fail';

export const LOTTIE_CLIP_IDS: LottieClipId[] = [
  'idle',
  'happy',
  'sad',
  'sit',
  'lie',
  'sleep',
  'feed',
  'play',
  'bath',
  'pet',
  'speak',
  'success',
  'fail',
];

type Pack = Partial<Record<LottieClipId, object>>;

const gato: Pack = {
  idle: require('../../../../assets/juego/lottie/gato/idle.json'),
  happy: require('../../../../assets/juego/lottie/gato/happy.json'),
  sad: require('../../../../assets/juego/lottie/gato/sad.json'),
  sit: require('../../../../assets/juego/lottie/gato/sit.json'),
  lie: require('../../../../assets/juego/lottie/gato/lie.json'),
  sleep: require('../../../../assets/juego/lottie/gato/sleep.json'),
  feed: require('../../../../assets/juego/lottie/gato/feed.json'),
  play: require('../../../../assets/juego/lottie/gato/play.json'),
  bath: require('../../../../assets/juego/lottie/gato/bath.json'),
  pet: require('../../../../assets/juego/lottie/gato/pet.json'),
  speak: require('../../../../assets/juego/lottie/gato/speak.json'),
  success: require('../../../../assets/juego/lottie/gato/success.json'),
  fail: require('../../../../assets/juego/lottie/gato/fail.json'),
};

const perro: Pack = {
  idle: require('../../../../assets/juego/lottie/perro/idle.json'),
  happy: require('../../../../assets/juego/lottie/perro/happy.json'),
  sad: require('../../../../assets/juego/lottie/perro/sad.json'),
  sit: require('../../../../assets/juego/lottie/perro/sit.json'),
  lie: require('../../../../assets/juego/lottie/perro/lie.json'),
  sleep: require('../../../../assets/juego/lottie/perro/sleep.json'),
  feed: require('../../../../assets/juego/lottie/perro/feed.json'),
  play: require('../../../../assets/juego/lottie/perro/play.json'),
  bath: require('../../../../assets/juego/lottie/perro/bath.json'),
  pet: require('../../../../assets/juego/lottie/perro/pet.json'),
  speak: require('../../../../assets/juego/lottie/perro/speak.json'),
  success: require('../../../../assets/juego/lottie/perro/success.json'),
  fail: require('../../../../assets/juego/lottie/perro/fail.json'),
};

const tortuga: Pack = {
  idle: require('../../../../assets/juego/lottie/tortuga/idle.json'),
  happy: require('../../../../assets/juego/lottie/tortuga/happy.json'),
  sad: require('../../../../assets/juego/lottie/tortuga/sad.json'),
  sit: require('../../../../assets/juego/lottie/tortuga/sit.json'),
  lie: require('../../../../assets/juego/lottie/tortuga/lie.json'),
  sleep: require('../../../../assets/juego/lottie/tortuga/sleep.json'),
  feed: require('../../../../assets/juego/lottie/tortuga/feed.json'),
  play: require('../../../../assets/juego/lottie/tortuga/play.json'),
  bath: require('../../../../assets/juego/lottie/tortuga/bath.json'),
  pet: require('../../../../assets/juego/lottie/tortuga/pet.json'),
  speak: require('../../../../assets/juego/lottie/tortuga/speak.json'),
  success: require('../../../../assets/juego/lottie/tortuga/success.json'),
  fail: require('../../../../assets/juego/lottie/tortuga/fail.json'),
};

const PACKS: Record<HueSpecies, Pack> = {
  gato,
  perro,
  tortuga,
  otro: perro,
};

/** Clips que se loopean (postura / ánimo). El resto son one-shot. */
export const LOOPING_CLIPS: ReadonlySet<LottieClipId> = new Set([
  'idle',
  'happy',
  'sad',
  'sit',
  'lie',
  'sleep',
]);

export function lottieSource(species: HueSpecies, clip: LottieClipId): AnimationObject {
  const pack = PACKS[species] ?? PACKS.perro;
  return (pack[clip] ?? pack.idle ?? PACKS.perro.idle!) as AnimationObject;
}

/**
 * Mapea triggers a un set chico y estable (idle / happy / sad / sleep).
 * Los JSON free de LottieFiles son de autores distintos: si cambiamos a
 * feed/play/bath/sit distintos, parece otro animal. Mejor reutilizar clips
 * coherentes con el idle de la especie.
 */
export function clipFromTrigger(trigger: string | null | undefined): LottieClipId | null {
  if (!trigger) return null;
  switch (trigger) {
    case 'feed':
    case 'play':
    case 'bath':
    case 'pet':
    case 'scratch':
    case 'speak':
    case 'yawn':
    case 'catchFood':
    case 'guestPlay':
    case 'guestSniff':
    case 'guestArrive':
    case 'trickSpin':
    case 'trickPaw':
    case 'trickSuccess':
      return 'happy';
    case 'trickFail':
    case 'guestIgnore':
      return 'sad';
    case 'sleep':
      return 'sleep';
    case 'sitDown':
    case 'trickSit':
    case 'standUp':
      return 'idle';
    case 'lieDown':
    case 'trickPlayDead':
      return 'sleep';
    case 'poke':
      return null;
    default:
      return null;
  }
}

export type ResolveLottieOpts = {
  species: HueSpecies;
  heldStance: 'none' | 'sit' | 'lie' | 'sleep';
  /** Trigger one-shot activo (animación en curso). */
  actionTrigger: string | null;
  mood: 'feliz' | 'bien' | 'aburrido' | 'triste' | 'enojado' | string;
  visual?: string | null;
};

/**
 * Prioridad: acción one-shot → postura sostenida → ánimo → idle.
 */
export function resolveLottieClip(opts: ResolveLottieOpts): {
  clip: LottieClipId;
  loop: boolean;
} {
  const fromAction = clipFromTrigger(opts.actionTrigger);
  if (fromAction) {
    return { clip: fromAction, loop: LOOPING_CLIPS.has(fromAction) };
  }

  if (opts.heldStance === 'sleep' || opts.heldStance === 'lie') {
    return { clip: 'sleep', loop: true };
  }
  if (opts.heldStance === 'sit') return { clip: 'idle', loop: true };

  if (opts.visual === 'sleeping') return { clip: 'sleep', loop: true };
  if (opts.visual === 'sad' || opts.mood === 'triste' || opts.mood === 'enojado') {
    return { clip: 'sad', loop: true };
  }
  if (opts.visual === 'happy' || opts.visual === 'playing' || opts.mood === 'feliz') {
    return { clip: 'happy', loop: true };
  }

  return { clip: 'idle', loop: true };
}
