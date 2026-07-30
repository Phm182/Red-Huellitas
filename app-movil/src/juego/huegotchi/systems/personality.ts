import { PersonalityTrait } from '../domain/types';
import { JuegoStats } from '../../../types';

/** Modificadores de stats según rasgo. */
export type TraitModifiers = {
  /** Multiplicador de gasto de energía al jugar. */
  playEnergyCost: number;
  /** Multiplicador de recuperación al dormir. */
  sleepRecovery: number;
  /** Umbral de hambre para pedir comida (más bajo = pide antes). */
  hungerAskBelow: number;
  /** Habilita minijuego atrapar comida. */
  enableCatchFood: boolean;
  /** Idle fidget frequency (0–1). */
  fidget: number;
};

export function modifiersForTrait(trait: PersonalityTrait): TraitModifiers {
  switch (trait) {
    case 'hiperactivo':
      return {
        playEnergyCost: 0.85,
        sleepRecovery: 0.9,
        hungerAskBelow: 45,
        enableCatchFood: false,
        fidget: 0.85,
      };
    case 'perezoso':
      return {
        playEnergyCost: 1.45,
        sleepRecovery: 1.35,
        hungerAskBelow: 35,
        enableCatchFood: false,
        fidget: 0.2,
      };
    case 'gloton':
      return {
        playEnergyCost: 1.05,
        sleepRecovery: 1,
        hungerAskBelow: 60,
        enableCatchFood: true,
        fidget: 0.5,
      };
    case 'curioso':
      return {
        playEnergyCost: 1.1,
        sleepRecovery: 1,
        hungerAskBelow: 40,
        enableCatchFood: false,
        fidget: 0.7,
      };
    case 'timido':
      return {
        playEnergyCost: 1.2,
        sleepRecovery: 1.1,
        hungerAskBelow: 38,
        enableCatchFood: false,
        fidget: 0.35,
      };
  }
}

export function wantsFoodSoon(stats: JuegoStats, trait: PersonalityTrait): boolean {
  return stats.hambre < modifiersForTrait(trait).hungerAskBelow;
}
