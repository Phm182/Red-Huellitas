/**
 * HueGotchi — tipos del motor de personaje (Rive-ready + runtime interactivo).
 *
 * Stack recomendado:
 * - Producción assets: Rive (.riv) con State Machine + Mesh Deform
 * - Runtime app: InteractivePet (Reanimated) hasta llegar los .riv
 * - No Phaser/Unity en Expo RN (mal encaje mobile + bundle)
 */

import { JuegoAnimo } from '../../types';
import { AccionMascota } from '../../components/MascotaAvatar';

/** Estados de la state machine del personaje (mapeables 1:1 a Rive SM). */
export type HueGotchiState =
  | 'idle'
  | 'happy'
  | 'eating'
  | 'playing'
  | 'bathing'
  | 'sleeping'
  | 'sad'
  | 'poke';

export type EspecieHue = 'gato' | 'perro' | 'otro';

/** Capas personalizables sin recargar sprites (en Rive = Artboards/Nodes). */
export type PetLayerId =
  | 'body'
  | 'head'
  | 'eyes'
  | 'ears'
  | 'tail'
  | 'coat'
  | 'pattern'
  | 'accessory';

export type PetAppearance = {
  especie: EspecieHue;
  /** Multiplicador visual de tamaño (0.7–1.4). */
  tamano: number;
  /** Influye squash: más peso = más “plastilina”. */
  peso: number;
  /** Estira en X (0.85–1.2) — longitud corporal. */
  longitud: number;
  /** Tint / skin hex opcional sobre capa coat. */
  colorPiel?: string;
  /** Overrides de nodos Rive / capas (nombre → valor). */
  capas: Partial<Record<PetLayerId, string>>;
  /** Accesorios activos (ids de nodos Rive). */
  accesorios: string[];
};

export type LookAtTarget = {
  /** -1..1 relativo al centro del escenario. */
  x: number;
  y: number;
};

export type HueGotchiProps = {
  especie: string;
  animo: JuegoAnimo;
  accion?: AccionMascota;
  disparo?: number;
  tamano?: number;
  appearance?: Partial<PetAppearance>;
  /** Ruta futura a .riv; si falta, usa motor interactivo + clips. */
  riveSrc?: string | number | null;
};

export const DEFAULT_APPEARANCE: PetAppearance = {
  especie: 'gato',
  tamano: 1,
  peso: 1,
  longitud: 1,
  capas: {},
  accesorios: [],
};
