import { DEFAULT_APPEARANCE, EspecieHue, PetAppearance } from './types';

export function normalizarEspecie(raw: string | null | undefined): EspecieHue {
  const e = (raw ?? '').toLowerCase();
  if (e.includes('gat') || e === 'cat') return 'gato';
  if (e.includes('perr') || e === 'dog') return 'perro';
  return 'otro';
}

/**
 * Personalización en tiempo real.
 * Con Rive: setTextRun / setBoolean / setNumber en nodos de capa.
 * Sin Rive: se traduce a scale / tint / stretch en InteractivePet.
 */
export function buildAppearance(
  especieRaw: string,
  partial?: Partial<PetAppearance>
): PetAppearance {
  return {
    ...DEFAULT_APPEARANCE,
    ...partial,
    especie: partial?.especie ?? normalizarEspecie(especieRaw),
    capas: { ...DEFAULT_APPEARANCE.capas, ...partial?.capas },
    accesorios: partial?.accesorios ?? [],
    tamano: clamp(partial?.tamano ?? 1, 0.7, 1.4),
    peso: clamp(partial?.peso ?? 1, 0.6, 1.6),
    longitud: clamp(partial?.longitud ?? 1, 0.85, 1.25),
  };
}

/**
 * Ejemplo de cómo mutar capas Rive sin recargar el archivo:
 *
 * ```ts
 * // riveRef.current?.setInputState('PetLife', 'coatColor', tintId);
 * // riveRef.current?.setBoolean('Accessory_Bow', true);
 * applyLayerPatch(appearance, { coat: 'tabby_orange', accessory: 'collar_red' });
 * ```
 */
export function applyLayerPatch(
  base: PetAppearance,
  patch: Partial<PetAppearance['capas']> & { accesorios?: string[] }
): PetAppearance {
  const { accesorios, ...capas } = patch;
  return {
    ...base,
    capas: { ...base.capas, ...capas },
    accesorios: accesorios ?? base.accesorios,
  };
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}
