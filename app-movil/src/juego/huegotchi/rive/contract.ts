/**
 * Contrato Rive HueGotchi — nombres EXACTOS que debe exponer el .riv
 * State Machine: PetLife | Artboard: Pet
 * View Model (recomendado): PetVM
 */

export const RIVE_ARTBOARD = 'Pet';
export const RIVE_SM = 'PetLife';
export const RIVE_VM = 'PetVM';

/** Numbers (−1…1 o rangos documentados). */
export const RIVE_NUMBERS = {
  lookX: 'lookX',
  lookY: 'lookY',
  squash: 'squash',
  stretch: 'stretch',
  mood: 'mood',
  bodyScale: 'bodyScale',
  /** 0=cachorro 1=adulto (blend morph). */
  ageBlend: 'ageBlend',
  /** ID numérico del lugar (ver PLACE_INDEX). */
  placeId: 'placeId',
  /** 0 clear … 1 rain … 2 storm */
  weatherId: 'weatherId',
  /** 0 dawn … 1 day … 2 dusk … 3 night */
  periodId: 'periodId',
} as const;

export const RIVE_BOOLEANS = {
  isDragging: 'isDragging',
  isSleeping: 'isSleeping',
  isNight: 'isNight',
  isRaining: 'isRaining',
  preferIndoors: 'preferIndoors',
  hasGuest: 'hasGuest',
} as const;

/** Triggers one-shot. */
export const RIVE_TRIGGERS = {
  poke: 'poke',
  feed: 'feed',
  play: 'play',
  bath: 'bath',
  sleep: 'sleep',
  yawn: 'yawn',
  trickPaw: 'trickPaw',
  trickSpin: 'trickSpin',
  trickPlayDead: 'trickPlayDead',
  trickSuccess: 'trickSuccess',
  trickFail: 'trickFail',
  catchFood: 'catchFood',
  guestArrive: 'guestArrive',
  guestPlay: 'guestPlay',
  guestSniff: 'guestSniff',
  guestIgnore: 'guestIgnore',
} as const;

/**
 * Skins: ViewModel string/enum `skinId` (método setSkin del controller).
 * No recarga el .riv — cambia capa/mesh en caliente.
 */
export const RIVE_SKIN_PROP = 'skinId';

/** placeId number → lugar. */
export const PLACE_INDEX = {
  living: 0,
  cocina: 1,
  patio: 2,
  arbol: 3,
  plaza: 4,
} as const;

export const WEATHER_INDEX = {
  clear: 0,
  cloudy: 1,
  rain: 2,
  storm: 3,
} as const;

export const PERIOD_INDEX = {
  dawn: 0,
  day: 1,
  dusk: 2,
  night: 3,
} as const;

export type RiveBridgeInputs = {
  lookX: number;
  lookY: number;
  squash: number;
  stretch: number;
  mood: number;
  bodyScale: number;
  ageBlend: number;
  placeId: number;
  weatherId: number;
  periodId: number;
  isDragging: boolean;
  isSleeping: boolean;
  isNight: boolean;
  isRaining: boolean;
  preferIndoors: boolean;
  hasGuest: boolean;
  skinId: string;
};
