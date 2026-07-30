import { HueSpecies } from '../domain/types';

/**
 * Stub tipado. Metro usa assets.web.ts / assets.native.ts en runtime.
 */
export function riveUrlForSpecies(species: HueSpecies): string {
  return `/rive/${species}.riv`;
}

export function riveModuleForSpecies(_species: HueSpecies): number | null {
  return null;
}

export function hasRiveAsset(_species: HueSpecies): boolean {
  return false;
}
