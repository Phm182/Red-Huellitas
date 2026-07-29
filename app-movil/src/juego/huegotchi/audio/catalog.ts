import { JuegoAnimo } from '../../types';
import { EspecieHue } from './types';

/**
 * Catálogo de voz: 10 maullidos (o ladridos) por bucket de ánimo.
 * Drop files en assets/juego/sfx/{especie}/ — ver README ahí.
 * Mientras no haya MP3, PetVoice usa síntesis + háptica.
 */
export type VoiceClipId =
  | 'm01'
  | 'm02'
  | 'm03'
  | 'm04'
  | 'm05'
  | 'm06'
  | 'm07'
  | 'm08'
  | 'm09'
  | 'm10';

export type VoiceMoodBucket = 'feliz' | 'bien' | 'aburrido' | 'decaido';

const CLIPS: VoiceClipId[] = [
  'm01',
  'm02',
  'm03',
  'm04',
  'm05',
  'm06',
  'm07',
  'm08',
  'm09',
  'm10',
];

/** Qué clips suenan más en cada ánimo (solapados a propósito). */
const POR_ANIMO: Record<VoiceMoodBucket, VoiceClipId[]> = {
  feliz: ['m01', 'm02', 'm03', 'm04'],
  bien: ['m03', 'm04', 'm05', 'm06'],
  aburrido: ['m05', 'm06', 'm07', 'm08'],
  decaido: ['m07', 'm08', 'm09', 'm10'],
};

/** Perfiles de síntesis (Hz / duración) — 10 “maullidos” distintos. */
export const SYNTH_PROFILES: Record<
  VoiceClipId,
  { f0: number; f1: number; ms: number; vibrato: number }
> = {
  m01: { f0: 620, f1: 880, ms: 280, vibrato: 12 },
  m02: { f0: 540, f1: 760, ms: 320, vibrato: 8 },
  m03: { f0: 700, f1: 980, ms: 240, vibrato: 18 },
  m04: { f0: 480, f1: 640, ms: 360, vibrato: 6 },
  m05: { f0: 580, f1: 720, ms: 300, vibrato: 10 },
  m06: { f0: 450, f1: 560, ms: 400, vibrato: 5 },
  m07: { f0: 400, f1: 480, ms: 420, vibrato: 4 },
  m08: { f0: 380, f1: 420, ms: 380, vibrato: 3 },
  m09: { f0: 340, f1: 380, ms: 460, vibrato: 2 },
  m10: { f0: 300, f1: 340, ms: 500, vibrato: 1 },
};

export function moodBucket(animo: JuegoAnimo): VoiceMoodBucket {
  return animo;
}

export function pickVoiceClip(animo: JuegoAnimo): VoiceClipId {
  const pool = POR_ANIMO[moodBucket(animo)] ?? CLIPS;
  return pool[Math.floor(Math.random() * pool.length)]!;
}

export function pickAnyClip(): VoiceClipId {
  return CLIPS[Math.floor(Math.random() * CLIPS.length)]!;
}

/**
 * Mapa opcional de assets. Completar cuando tengas los MP3:
 * `m01: require('../../../assets/juego/sfx/gato/m01.mp3')`
 */
export const VOICE_ASSETS: Partial<
  Record<EspecieHue, Partial<Record<VoiceClipId, number>>>
> = {
  gato: {},
  perro: {},
  otro: {},
};
