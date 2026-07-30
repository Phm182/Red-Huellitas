import { RiveBridgeInputs } from './contract';

/**
 * API unificada del runtime Rive (native / web).
 * setSkin cambia el pelaje/raza SIN recargar el .riv.
 * react() dispara lo que el .riv tenga (triggers/booleans) + aliases.
 */
export type RivePetHandle = {
  setInputs: (inputs: Partial<RiveBridgeInputs>) => void;
  setSkin: (skinId: string) => void;
  fire: (triggerName: string) => void;
  /** Reacción de juego: poke / feed / play / bath / sleep / yawn / guest / trick */
  react: (kind: string) => void;
};

export type RivePetRuntimeProps = {
  /** require(.riv) nativo o URL web */
  source: number | string;
  width: number;
  height: number;
  onReady?: (handle: RivePetHandle) => void;
  onError?: (error: Error) => void;
};
