/**
 * HueGotchi — tipos de dominio (sin SDK Rive).
 */

import { Especie, JuegoAnimo, JuegoStats, MascotaJuego } from '../../../types';

/**
 * Mismo catálogo que `Especie` (registro de mascotas / Cuidados): antes acá
 * sólo había 4 baldes (gato/perro/tortuga/"otro" para el resto), y conejo,
 * ave, pez, hámster, cobayo y hurón cargaban directo el genérico "otro" —
 * un dibujo sin cara propia para 6 de las 10 especies reales de la app.
 * Ahora es 1 a 1 con `Especie`, cada una con su propio archetype en
 * `ProceduralPet.tsx`.
 */
export type HueSpecies = Especie;

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

const ESPECIES_VALIDAS: readonly HueSpecies[] = [
  'perro', 'gato', 'conejo', 'ave', 'pez', 'hamster', 'cobayo', 'tortuga', 'huron', 'otro',
];

/**
 * `especie` en la fila real de la mascota ya viene como uno de estos 10
 * valores casi siempre (viene de `ESPECIES` en `constants/especies.ts`) —
 * el fallback por texto libre es sólo para datos viejos/sueltos que hayan
 * quedado en inglés o con mayúsculas.
 */
export function toHueSpecies(especie: Especie | string): HueSpecies {
  const e = String(especie).toLowerCase().trim();
  if ((ESPECIES_VALIDAS as string[]).includes(e)) return e as HueSpecies;
  if (e.includes('gat') || e === 'cat') return 'gato';
  if (e.includes('perr') || e === 'dog') return 'perro';
  if (e.includes('conej') || e === 'rabbit') return 'conejo';
  if (e.includes('ave') || e.includes('pajar') || e === 'bird') return 'ave';
  if (e.includes('pez') || e === 'fish') return 'pez';
  if (e.includes('hamst')) return 'hamster';
  if (e.includes('coba') || e.includes('guinea')) return 'cobayo';
  if (e.includes('tort') || e === 'turtle') return 'tortuga';
  if (e.includes('huron') || e === 'ferret') return 'huron';
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
