import { TrickId } from '../domain/types';
import { RIVE_TRIGGERS } from '../rive/contract';

export type GestureToken = 'up' | 'down' | 'left' | 'right' | 'tap';

export type TrickDef = {
  id: TrickId;
  labelKey: string;
  /** Secuencia que hay que hacer sobre el animal. */
  pattern: GestureToken[];
  xpReward: number;
  riveTrigger: string;
};

export const TRICKS: TrickDef[] = [
  {
    id: 'dar_pata',
    labelKey: 'juego.tricks.darPata',
    pattern: ['tap', 'up', 'tap'],
    xpReward: 12,
    riveTrigger: RIVE_TRIGGERS.trickPaw,
  },
  {
    id: 'dar_vuelta',
    labelKey: 'juego.tricks.darVuelta',
    pattern: ['left', 'right', 'left', 'right'],
    xpReward: 18,
    riveTrigger: RIVE_TRIGGERS.trickSpin,
  },
  {
    id: 'hacerse_muerto',
    labelKey: 'juego.tricks.hacerseMuerto',
    pattern: ['down', 'down', 'tap'],
    xpReward: 22,
    riveTrigger: RIVE_TRIGGERS.trickPlayDead,
  },
];

export type ResultadoGesto = 'avanza' | 'completo' | 'falla' | null;

/**
 * Entrenador paso a paso.
 *
 * La versión anterior usaba un buffer rodante y `onDragPet` le metía un token
 * en cada frame del arrastre: el buffer se llenaba de veinte 'up' seguidos, el
 * patrón no calzaba nunca y "Entrenar trucos" no hacía absolutamente nada.
 * Ahora:
 *
 * - un gesto = un token, emitido sólo al soltar el dedo;
 * - el avance es por paso, con índice público para que la UI lo dibuje;
 * - un gesto equivocado reinicia el intento en lugar de acumular basura.
 */
export class TrickTrainer {
  private trick: TrickDef | null = null;
  private paso = 0;
  private ultimoEn = 0;
  /** Tiempo máximo entre gestos antes de dar el intento por perdido. */
  readonly ventanaMs = 5000;

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

  /** Cuántos pasos del patrón ya salieron bien. */
  get progreso(): number {
    return this.paso;
  }

  /** El gesto que hay que hacer ahora, para poder mostrarlo en pantalla. */
  get siguiente(): GestureToken | null {
    if (!this.trick) return null;
    return this.trick.pattern[this.paso] ?? null;
  }

  /**
   * Sólo se abandona el intento si ya arrancó la secuencia. Antes del primer
   * gesto no corre reloj: estás leyendo el patrón en pantalla, y cancelarte por
   * eso hacía que el truco se apagara solo antes de poder tocar nada.
   */
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
    // Gesto equivocado: se reinicia el intento, pero el truco sigue armado.
    this.paso = 0;
    return 'falla';
  }
}

/**
 * Un swipe entero se traduce a un solo token, calculado sobre el
 * desplazamiento total. Lo que no llega a moverse se descarta, para que un roce
 * no cuente como una dirección al azar.
 */
export function gestureFromSwipe(dx: number, dy: number): GestureToken | null {
  const ax = Math.abs(dx);
  const ay = Math.abs(dy);
  if (ax < 28 && ay < 28) return null;
  if (ax > ay * 1.2) return dx > 0 ? 'right' : 'left';
  if (ay > ax * 1.2) return dy > 0 ? 'down' : 'up';
  return null; // diagonal ambigua: mejor no adivinar
}

/** Flecha para dibujar cada paso del patrón en la UI. */
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
