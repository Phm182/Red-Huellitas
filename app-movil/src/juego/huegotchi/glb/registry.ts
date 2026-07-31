import { HueSpecies } from '../domain/types';

export type GlbClipId = 'idle' | 'play' | 'walk' | 'run' | 'turn' | 'lean';

export type GlbPack = {
  mesh: number;
  clips: Partial<Record<GlbClipId, number>>;
  albedo?: number;
  /** El mesh ya viene en esa postura (p.ej. STL sentado). */
  restPose?: 'stand' | 'sit';
};

/**
 * Packs GLB listos para Three.js.
 * - Perro: RSG German Shepherd (skinned + idle/play/walk/run/turn/lean).
 * - Gato: STL sitting blue cat (estático sentado, motion rígido).
 */
const GLB_PACKS: Partial<Record<HueSpecies, GlbPack>> = {
  gato: {
    mesh: require('../../../../assets/juego/glb/gato_mesh.glb'),
    clips: {},
    restPose: 'sit',
  },
  perro: {
    mesh: require('../../../../assets/juego/glb/perro_mesh.glb'),
    clips: {
      idle: require('../../../../assets/juego/glb/perro_idle.glb'),
      play: require('../../../../assets/juego/glb/perro_play.glb'),
      walk: require('../../../../assets/juego/glb/perro_walk.glb'),
      run: require('../../../../assets/juego/glb/perro_run.glb'),
      turn: require('../../../../assets/juego/glb/perro_turn.glb'),
      lean: require('../../../../assets/juego/glb/perro_lean.glb'),
    },
    albedo: require('../../../../assets/juego/glb/perro_albedo.jpg'),
    restPose: 'stand',
  },
};

export function hasGlbModel(species: HueSpecies): boolean {
  return GLB_PACKS[species] != null;
}

export function glbPackForSpecies(species: HueSpecies): GlbPack | null {
  return GLB_PACKS[species] ?? null;
}

/** @deprecated usar glbPackForSpecies */
export function glbModuleForSpecies(species: HueSpecies): number | null {
  return GLB_PACKS[species]?.mesh ?? null;
}
