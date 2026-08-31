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

// El pool DEMO_FRIENDS que vivía acá (mascotas inventadas) se sacó: ahora
// `useHueGotchiController.abrirInvitarAmigo()` pide de verdad a quién seguís
// (`seguimientoApi.seguidos`) y sus mascotas (`mascotasApi.listarUsuario`),
// y arma el `FriendPetLite` con esos datos reales.
