import { EspecieHue } from '../types';

/**
 * Registry de .riv.
 * Cuando el artista entregue el archivo, descomentá el require correspondiente.
 * Metro solo incluye lo que está require()'d.
 */
const RIVE_SOURCES: Partial<Record<EspecieHue, number>> = {
  // gato: require('../../../../assets/juego/rive/gato_base.riv'),
  // perro: require('../../../../assets/juego/rive/perro_base.riv'),
};

export function riveSourceForEspecie(especie: EspecieHue): number | null {
  return RIVE_SOURCES[especie] ?? null;
}

export function hasRiveAsset(especie: EspecieHue): boolean {
  return riveSourceForEspecie(especie) != null;
}

export const COATS = [
  'coat_default',
  'coat_orange',
  'coat_gray',
  'coat_black',
  'coat_white',
  'coat_cream',
  'coat_tabby',
  'coat_calico',
  'coat_spotted',
] as const;

export const ACCESSORIES = [
  'acc_collar',
  'acc_bow',
  'acc_hat',
  'acc_glasses',
  'acc_bandana',
] as const;

export type CoatId = (typeof COATS)[number];
export type AccessoryId = (typeof ACCESSORIES)[number];
