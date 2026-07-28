import { Ionicons } from '@expo/vector-icons';
import { ReaccionTipo } from '../types';

export type ReaccionDef = {
  tipo: ReaccionTipo;
  /** Clave i18n bajo feed.reaccion.* */
  labelKey: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconOutline: keyof typeof Ionicons.glyphMap;
  /** Emoji opcional (reacciones más “mascota”). */
  emoji?: string;
};

/** Catálogo completo de reacciones (UI + API). */
export const REACCIONES: ReaccionDef[] = [
  { tipo: 'like', labelKey: 'like', icon: 'heart', iconOutline: 'heart-outline' },
  { tipo: 'me_divierte', labelKey: 'meDivierte', icon: 'happy', iconOutline: 'happy-outline' },
  { tipo: 'amor', labelKey: 'amor', icon: 'heart-circle', iconOutline: 'heart-circle-outline' },
  { tipo: 'asombro', labelKey: 'asombro', icon: 'sparkles', iconOutline: 'sparkles-outline' },
  { tipo: 'triste', labelKey: 'triste', icon: 'sad', iconOutline: 'sad-outline' },
  { tipo: 'abrazo', labelKey: 'abrazo', icon: 'people', iconOutline: 'people-outline', emoji: '🤗' },
  { tipo: 'huella', labelKey: 'huella', icon: 'paw', iconOutline: 'paw-outline', emoji: '🐾' },
  { tipo: 'apoyo', labelKey: 'apoyo', icon: 'hand-left', iconOutline: 'hand-left-outline', emoji: '💪' },
  { tipo: 'guau', labelKey: 'guau', icon: 'volume-high', iconOutline: 'volume-medium-outline', emoji: '🐶' },
  { tipo: 'michi', labelKey: 'michi', icon: 'moon', iconOutline: 'moon-outline', emoji: '🐱' },
];

export const REACCION_TIPOS: ReaccionTipo[] = REACCIONES.map((r) => r.tipo);

/** Campo camelCase en PostConteos para un tipo snake. */
export function reaccionConteoKey(tipo: ReaccionTipo): keyof import('../types').PostConteos {
  const map: Record<ReaccionTipo, keyof import('../types').PostConteos> = {
    like: 'like',
    me_divierte: 'meDivierte',
    amor: 'amor',
    asombro: 'asombro',
    triste: 'triste',
    abrazo: 'abrazo',
    huella: 'huella',
    apoyo: 'apoyo',
    guau: 'guau',
    michi: 'michi',
  };
  return map[tipo];
}
