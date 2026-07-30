import { HueSpecies } from '../domain/types';

/**
 * Web: archivos en public/rive/ (NO usar /assets/ — Expo lo reserva para Metro).
 */
const WEB_RIVE: Partial<Record<HueSpecies, true>> = {
  gato: true,
  perro: true,
};

export function riveUrlForSpecies(species: HueSpecies): string {
  return `/rive/${species}.riv`;
}

export function riveModuleForSpecies(_species: HueSpecies): number | null {
  return null;
}

export function hasRiveAsset(species: HueSpecies): boolean {
  return WEB_RIVE[species] === true;
}
