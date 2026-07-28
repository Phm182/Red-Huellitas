import { Especie } from '../types';

/** Misma lista que Cuidados / backend `rh_especies_validas()`. */
export const ESPECIES: Especie[] = [
  'perro',
  'gato',
  'conejo',
  'ave',
  'pez',
  'hamster',
  'cobayo',
  'tortuga',
  'huron',
  'otro',
];

/** Clave i18n: `mascotas.especieNombre.perro`, etc. */
export function especieI18nKey(especie: Especie): string {
  return `mascotas.especieNombre.${especie}`;
}
