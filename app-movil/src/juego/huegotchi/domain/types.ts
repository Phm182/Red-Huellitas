/**
 * HueGotchi — tipos de dominio (sin SDK Rive).
 */

import { Especie, JuegoAnimo, JuegoStats, MascotaJuego } from '../../../types';

export type HueSpecies = 'gato' | 'perro' | 'tortuga' | 'otro';

export type PetAgeStage = 'cachorro' | 'adulto';

export type PlaceId =
  | 'living'
  | 'cocina'
  | 'patio'
  | 'arbol'
  | 'plaza';

export type WeatherKind = 'clear' | 'rain' | 'cloudy' | 'storm';

export type DayPeriod = 'dawn' | 'day' | 'dusk' | 'night';

export type PersonalityTrait = 'hiperactivo' | 'perezoso' | 'gloton' | 'curioso' | 'timido';

export type TrickId = 'dar_pata' | 'sentarse' | 'dar_vuelta' | 'hacerse_muerto';

export type MoodBucket = 'feliz' | 'neutro' | 'enojado';

export type SocialVisitOutcome = 'play' | 'sniff' | 'ignore';

/** Snapshot del animal en el motor HueGotchi. */
export type HuePetIdentity = {
  mascotaId: number;
  nombre: string;
  especie: Especie;
  species: HueSpecies;
  raza: string | null;
  /** Skin Rive (enum / string ViewModel). */
  skinId: string;
  ageStage: PetAgeStage;
  edadMesesEstimados: number | null;
  trait: PersonalityTrait;
};

export type HueEnvironmentState = {
  place: PlaceId;
  period: DayPeriod;
  weather: WeatherKind;
  isNight: boolean;
  preferIndoors: boolean;
};

export type HuePhysicsState = {
  lookX: number;
  lookY: number;
  squash: number;
  stretch: number;
  isDragging: boolean;
};

export type HueGuestVisit = {
  guestMascotaId: number;
  guestNombre: string;
  guestSpecies: HueSpecies;
  /** Raza del invitado: define su morfología y colores igual que la del dueño. */
  guestRaza: string | null;
  guestSkinId: string;
  outcome: SocialVisitOutcome;
};

export type HueGameSnapshot = {
  identity: HuePetIdentity;
  stats: JuegoStats;
  animo: JuegoAnimo;
  mood: MoodBucket;
  environment: HueEnvironmentState;
  physics: HuePhysicsState;
  guest: HueGuestVisit | null;
  nivel: number;
  experienciaNivel: number;
  experienciaPorNivel: number;
};

export function toHueSpecies(especie: Especie | string): HueSpecies {
  const e = String(especie).toLowerCase();
  if (e.includes('gat') || e === 'cat') return 'gato';
  if (e.includes('perr') || e === 'dog') return 'perro';
  if (e.includes('tort') || e === 'turtle') return 'tortuga';
  return 'otro';
}

export function animoToMood(animo: JuegoAnimo): MoodBucket {
  if (animo === 'feliz') return 'feliz';
  if (animo === 'decaido') return 'enojado';
  return 'neutro';
}

export function identityFromJuego(
  juego: MascotaJuego,
  extras?: { edadMeses?: number | null }
): HuePetIdentity {
  const species = toHueSpecies(juego.especie);
  const meses = extras?.edadMeses ?? null;
  const ageStage: PetAgeStage = meses != null && meses < 12 ? 'cachorro' : 'adulto';
  return {
    mascotaId: juego.mascotaId,
    nombre: juego.nombre,
    especie: juego.especie,
    species,
    raza: juego.raza,
    skinId: resolveSkinId(species, juego.raza, ageStage),
    ageStage,
    edadMesesEstimados: meses,
    trait: resolveTrait(species, juego.raza, ageStage),
  };
}

export function resolveSkinId(
  species: HueSpecies,
  raza: string | null,
  age: PetAgeStage
): string {
  const slug = (raza ?? 'default')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 24) || 'default';
  return `${species}_${age}_${slug}`;
}

export function resolveTrait(
  species: HueSpecies,
  raza: string | null,
  age: PetAgeStage
): PersonalityTrait {
  const r = (raza ?? '').toLowerCase();
  if (age === 'cachorro') return 'hiperactivo';
  if (r.includes('bulldog') || r.includes('persa') || species === 'tortuga') return 'perezoso';
  if (r.includes('labrador') || r.includes('beagle') || r.includes('siames')) return 'gloton';
  if (r.includes('border') || r.includes('bengala')) return 'curioso';
  if (r.includes('chow') || r.includes('ragdoll')) return 'timido';
  return species === 'gato' ? 'curioso' : 'hiperactivo';
}
