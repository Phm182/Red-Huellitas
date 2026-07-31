import { TrickId } from '../domain/types';
import { RIVE_TRIGGERS } from '../rive/contract';

export type GestureToken = 'up' | 'down' | 'left' | 'right' | 'tap';

export const ALL_GESTURES: GestureToken[] = ['up', 'down', 'left', 'right', 'tap'];

/** Plantilla de truco (la secuencia real se genera al azar al empezar). */
export type TrickKind = {
  id: TrickId;
  labelKey: string;
  /** Pasos mínimos / máximos antes del bonus por nivel. */
  minSteps: number;
  maxSteps: number;
  /** XP fijo al completar. */
  baseXp: number;
  /** XP extra por cada gesto de la secuencia. */
  xpPerStep: number;
  /** Gestos permitidos en este truco (más = más difícil). */
  gesturePool: GestureToken[];
  riveTrigger: string;
};

/** Instancia jugable: patrón aleatorio + XP calculada. */
export type TrickDef = TrickKind & {
  pattern: GestureToken[];
  xpReward: number;
};

/**
 * De más fácil a más difícil.
 * El nivel del HueGotchi alarga la secuencia y sube el XP.
 */
export const TRICK_KINDS: TrickKind[] = [
  {
    id: 'sentarse',
    labelKey: 'juego.tricks.sentarse',
    minSteps: 2,
    maxSteps: 3,
    baseXp: 8,
    xpPerStep: 4,
    gesturePool: ['down', 'tap'],
    riveTrigger: RIVE_TRIGGERS.trickSit,
  },
  {
    id: 'dar_pata',
    labelKey: 'juego.tricks.darPata',
    minSteps: 3,
    maxSteps: 4,
    baseXp: 12,
    xpPerStep: 5,
    gesturePool: ['tap', 'up', 'down'],
    riveTrigger: RIVE_TRIGGERS.trickPaw,
  },
  {
    id: 'dar_vuelta',
    labelKey: 'juego.tricks.darVuelta',
    minSteps: 4,
    maxSteps: 5,
    baseXp: 18,
    xpPerStep: 6,
    gesturePool: ['left', 'right', 'up', 'down'],
    riveTrigger: RIVE_TRIGGERS.trickSpin,
  },
  {
    id: 'hacerse_muerto',
    labelKey: 'juego.tricks.hacerseMuerto',
    minSteps: 4,
    maxSteps: 6,
    baseXp: 24,
    xpPerStep: 7,
    gesturePool: ALL_GESTURES,
    riveTrigger: RIVE_TRIGGERS.trickPlayDead,
  },
];

/** @deprecated usar TRICK_KINDS; se mantiene por compat de imports. */
export const TRICKS = TRICK_KINDS;

/** Trucos que dejan al animal en una postura hasta que se le diga otra cosa. */
export const TRICKS_QUE_SOSTIENEN: Partial<Record<string, 'sit' | 'lie'>> = {
  trickSit: 'sit',
  trickPaw: 'sit',
  trickPlayDead: 'lie',
};

/** Pasos extra por nivel HueGotchi (cap). */
export function levelStepBonus(nivel: number): number {
  return Math.min(6, Math.floor(Math.max(0, nivel - 1) / 3));
}

export function pickStepCount(kind: TrickKind, nivel: number): number {
  const span = Math.max(0, kind.maxSteps - kind.minSteps);
  const roll = kind.minSteps + Math.floor(Math.random() * (span + 1));
  return Math.min(kind.maxSteps + 6, roll + levelStepBonus(nivel));
}

/**
 * Secuencia aleatoria. A niveles altos evita repetir el mismo gesto seguido
 * para que no sea memorizable / aburrida.
 */
export function randomPattern(
  steps: number,
  pool: GestureToken[],
  nivel: number
): GestureToken[] {
  const out: GestureToken[] = [];
  const avoidRepeat = nivel >= 4;
  for (let i = 0; i < steps; i++) {
    let candidates = pool;
    if (avoidRepeat && out.length > 0 && pool.length > 1) {
      const prev = out[out.length - 1]!;
      const filtered = pool.filter((g) => g !== prev);
      if (filtered.length > 0) candidates = filtered;
    }
    out.push(candidates[Math.floor(Math.random() * candidates.length)]!);
  }
  return out;
}

export function xpForPattern(kind: TrickKind, pattern: GestureToken[], nivel: number): number {
  return kind.baseXp + pattern.length * kind.xpPerStep + levelStepBonus(nivel) * 4;
}

/** Crea una instancia jugable (patrón nuevo cada vez que empezás el truco). */
export function buildTrickInstance(kind: TrickKind, nivel: number): TrickDef {
  const steps = pickStepCount(kind, nivel);
  const pattern = randomPattern(steps, kind.gesturePool, nivel);
  return {
    ...kind,
    pattern,
    xpReward: xpForPattern(kind, pattern, nivel),
  };
}

export function previewXpRange(kind: TrickKind, nivel: number): { min: number; max: number } {
  const bonus = levelStepBonus(nivel);
  const minSteps = kind.minSteps + bonus;
  const maxSteps = kind.maxSteps + bonus;
  return {
    min: kind.baseXp + minSteps * kind.xpPerStep + bonus * 4,
    max: kind.baseXp + maxSteps * kind.xpPerStep + bonus * 4,
  };
}

export type ResultadoGesto = 'avanza' | 'completo' | 'falla' | null;

/**
 * Entrenador paso a paso: un gesto = un token al soltar / tap.
 * La secuencia no se revela; solo se valida.
 */
export class TrickTrainer {
  private trick: TrickDef | null = null;
  private paso = 0;
  private ultimoEn = 0;
  /** Tiempo máximo entre gestos una vez empezada la secuencia. */
  readonly ventanaMs = 5500;

  empezar(trick: TrickDef) {
    this.trick = trick;
    this.paso = 0;
    this.ultimoEn = Date.now();
  }

  cancelar() {
    this.trick = null;
    this.paso = 0;
  }

  get activo(): boolean {
    return this.trick != null;
  }

  get definicion(): TrickDef | null {
    return this.trick;
  }

  get progreso(): number {
    return this.paso;
  }

  get totalPasos(): number {
    return this.trick?.pattern.length ?? 0;
  }

  get siguiente(): GestureToken | null {
    if (!this.trick) return null;
    return this.trick.pattern[this.paso] ?? null;
  }

  expirado(ahora = Date.now()): boolean {
    return this.trick != null && this.paso > 0 && ahora - this.ultimoEn > this.ventanaMs;
  }

  recibir(token: GestureToken): ResultadoGesto {
    if (!this.trick) return null;
    const ahora = Date.now();
    if (this.expirado(ahora)) {
      this.paso = 0;
      this.ultimoEn = ahora;
      return 'falla';
    }
    this.ultimoEn = ahora;
    if (this.trick.pattern[this.paso] === token) {
      this.paso += 1;
      if (this.paso >= this.trick.pattern.length) return 'completo';
      return 'avanza';
    }
    this.paso = 0;
    return 'falla';
  }
}

export function gestureFromSwipe(dx: number, dy: number): GestureToken | null {
  const ax = Math.abs(dx);
  const ay = Math.abs(dy);
  if (ax < 28 && ay < 28) return null;
  if (ax > ay * 1.2) return dx > 0 ? 'right' : 'left';
  if (ay > ax * 1.2) return dy > 0 ? 'down' : 'up';
  return null;
}

export function iconoGesto(token: GestureToken): string {
  switch (token) {
    case 'up':
      return '↑';
    case 'down':
      return '↓';
    case 'left':
      return '←';
    case 'right':
      return '→';
    case 'tap':
      return '●';
  }
}
