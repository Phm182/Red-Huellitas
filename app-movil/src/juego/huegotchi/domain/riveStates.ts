import { JuegoAccion, JuegoAnimo } from '../../../types';

/** Estados visuales del fallback (mapeo simple a Rive SM). */
export type HueGotchiState =
  | 'idle'
  | 'happy'
  | 'eating'
  | 'playing'
  | 'bathing'
  | 'sleeping'
  | 'sad'
  | 'poke';

export function resolveVisualState(opts: {
  animo: JuegoAnimo;
  accion: JuegoAccion | null | undefined;
}): HueGotchiState {
  if (opts.accion === 'alimentar') return 'eating';
  if (opts.accion === 'jugar') return 'playing';
  if (opts.accion === 'banar') return 'bathing';
  if (opts.accion === 'dormir') return 'sleeping';
  if (opts.animo === 'feliz') return 'happy';
  if (opts.animo === 'decaido') return 'sad';
  return 'idle';
}
