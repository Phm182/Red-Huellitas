export { buildAppearance, applyLayerPatch, normalizarEspecie } from './appearance';
export { resolveHueGotchiState, RIVE_SM, animoToMoodNumber } from './PetStateMachine';
export { playPetVoice } from './audio/PetVoice';
export { screenToLookAt, lerp, LOOK_LERP } from './lookAt';
export { AppearancePanel, HueGotchiStage } from './rive/HueGotchiStage';
export { COATS, ACCESSORIES, hasRiveAsset } from './rive/registry';
export type { PetAppearance, HueGotchiState, HueGotchiProps } from './types';

/** Alias público del stage. */
export { HueGotchiStage as HueGotchiCharacter } from './rive/HueGotchiStage';
