import { HueGuestVisit, HueSpecies, SocialVisitOutcome, resolveSkinId, toHueSpecies } from '../domain/types';
import { RIVE_TRIGGERS } from '../rive/contract';

export type FriendPetLite = {
  mascotaId: number;
  nombre: string;
  especie: string;
  raza?: string | null;
};

function rollOutcome(): SocialVisitOutcome {
  const r = Math.random();
  if (r < 0.45) return 'play';
  if (r < 0.75) return 'sniff';
  return 'ignore';
}

export function createGuestVisit(friend: FriendPetLite): HueGuestVisit {
  const species = toHueSpecies(friend.especie);
  return {
    guestMascotaId: friend.mascotaId,
    guestNombre: friend.nombre,
    guestSpecies: species,
    guestRaza: friend.raza ?? null,
    guestSkinId: resolveSkinId(species, friend.raza ?? null, 'adulto'),
    outcome: rollOutcome(),
  };
}

export function visitTrigger(outcome: SocialVisitOutcome): string {
  switch (outcome) {
    case 'play':
      return RIVE_TRIGGERS.guestPlay;
    case 'sniff':
      return RIVE_TRIGGERS.guestSniff;
    case 'ignore':
      return RIVE_TRIGGERS.guestIgnore;
  }
}

/** Pool demo hasta cablear amigos reales de la API. */
// Los nombres de raza tienen que coincidir con `RazaCatalogo` para que caigan
// en la tabla de morfología en vez del perfil derivado por hash.
export const DEMO_FRIENDS: FriendPetLite[] = [
  { mascotaId: -101, nombre: 'Luna', especie: 'gato', raza: 'Siamés' },
  { mascotaId: -102, nombre: 'Rocky', especie: 'perro', raza: 'Salchicha (Dachshund)' },
  { mascotaId: -103, nombre: 'Kira', especie: 'perro', raza: 'Husky Siberiano' },
  { mascotaId: -104, nombre: 'Mora', especie: 'gato', raza: 'Persa' },
  { mascotaId: -105, nombre: 'Tina', especie: 'tortuga', raza: null },
];
