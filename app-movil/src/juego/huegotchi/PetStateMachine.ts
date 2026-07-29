import { JuegoAnimo } from '../../types';
import { AccionMascota } from '../../components/MascotaAvatar';
import { HueGotchiState } from './types';

/**
 * State machine HueGotchi.
 * En Rive: cada valor es un State / Trigger de la State Machine "PetLife".
 */
export function resolveHueGotchiState(opts: {
  animo: JuegoAnimo;
  accion: AccionMascota | null | undefined;
  poke?: boolean;
}): HueGotchiState {
  if (opts.poke) return 'poke';
  if (opts.accion === 'alimentar') return 'eating';
  if (opts.accion === 'jugar') return 'playing';
  if (opts.accion === 'banar') return 'bathing';
  if (opts.accion === 'dormir') return 'sleeping';

  switch (opts.animo) {
    case 'feliz':
      return 'happy';
    case 'decaido':
      return 'sad';
    case 'aburrido':
      return 'idle';
    default:
      return 'idle';
  }
}

/** Inputs sugeridos para la State Machine de Rive. */
export const RIVE_SM = {
  name: 'PetLife',
  triggers: ['poke', 'feed', 'play', 'bath', 'sleep'] as const,
  numbers: ['lookX', 'lookY', 'squash', 'stretch', 'mood'] as const,
  booleans: ['isSleeping', 'isDragging'] as const,
};

export function animoToMoodNumber(animo: JuegoAnimo): number {
  switch (animo) {
    case 'feliz':
      return 1;
    case 'bien':
      return 0.66;
    case 'aburrido':
      return 0.33;
    case 'decaido':
      return 0;
  }
}
