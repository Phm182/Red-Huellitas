export type {
  HueSpecies,
  PetAgeStage,
  PlaceId,
  PersonalityTrait,
  TrickId,
  HuePetIdentity,
  HueEnvironmentState,
} from './domain/types';
export type { HeldStance } from './domain/poses';
export { identityFromJuego, toHueSpecies, resolveSkinId } from './domain/types';
// RIVE_TRIGGERS son sólo nombres de acción (strings): el vocabulario que
// también usa el sistema de poses del renderer SVG. El resto de Rive
// (bridge, .riv, handle nativo) se sacó — nunca se renderizó de verdad.
export { RIVE_TRIGGERS } from './rive/contract';
export { HueGotchiExperience } from './HueGotchiExperience';
export { useHueGotchiController } from './hooks/useHueGotchiController';
export { PetPhysicsEngine } from './physics/PetPhysicsEngine';
export { petVoice } from './audio/PetVoiceEngine';
export { TRICKS } from './systems/training';
export { PLACES } from './systems/environment';
export { SLEEP_LOCK_MS } from './domain/poses';
export { ProceduralPetStage } from './components/ProceduralPetStage';
