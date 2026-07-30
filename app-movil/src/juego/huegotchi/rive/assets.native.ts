import { HueSpecies } from '../domain/types';

/**
 * Nativo: require del .riv (Metro necesita assetExts: riv en metro.config.js).
 */
const RIVE_BY_SPECIES: Partial<Record<HueSpecies, number>> = {
  gato: require('../../../../assets/juego/rive/gato.riv'),
  perro: require('../../../../assets/juego/rive/perro.riv'),
  // tortuga: require('../../../../assets/juego/rive/tortuga.riv'),
};

export function riveUrlForSpecies(species: HueSpecies): string {
  return `/rive/${species}.riv`;
}

export function riveModuleForSpecies(species: HueSpecies): number | null {
  return RIVE_BY_SPECIES[species] ?? null;
}

export function hasRiveAsset(species: HueSpecies): boolean {
  return riveModuleForSpecies(species) != null;
}
