/**
 * Secuencia de animación de los juegos de caída (HueTetris, HueColumns).
 *
 * Los motores resuelven todo de golpe (fijar la pieza, limpiar, hacer caer lo
 * que queda, volver a mirar si se formó algo nuevo…). Para que el jugador
 * entienda qué pasó, la pantalla reproduce esa resolución PASO A PASO:
 *
 *   caída rápida de la pieza → [ limpia (flash + fade) → cae lo que quedó ] × N
 *
 * Esta clase sólo lleva la cuenta del tiempo y devuelve qué hay que dibujar en
 * cada cuadro; no toca React. Mientras `activa()` es true el juego está
 * congelado (no cae la pieza ni se aceptan controles).
 */

export type PasoAnim<C> = {
  /** Tablero antes de limpiar este paso (con lo que se va a borrar todavía puesto). */
  tablero: (C | null)[][];
  /** Tablero después de limpiar y hacer caer. */
  despues: (C | null)[][];
  /** Celdas que se borran en este paso, "fila,col" en índices absolutos del tablero. */
  limpiar: string[];
  /** Por celda del tablero `despues`: cuántas filas cayó para llegar ahí. */
  caidas: number[][];
  /** Nº de paso dentro de la cascada (1 = primera limpieza). */
  combo: number;
};

export const DUR_LIMPIA_MS = 320;
export const DUR_CAE_MS = 230;

export type Cuadro<C, P> =
  | { tipo: 'caida'; pieza: P; y: number; desdeY: number }
  | { tipo: 'limpia'; paso: PasoAnim<C>; p: number; nro: number }
  | { tipo: 'cae'; paso: PasoAnim<C>; p: number; nro: number };

type Caida<P> = { pieza: P; desdeY: number; hastaY: number; t0: number; dur: number; alAterrizar: () => void };

export class SecuenciaAnim<C, P = unknown> {
  private caida: Caida<P> | null = null;
  private pasos: PasoAnim<C>[] = [];
  private i = 0;
  private fase: 'limpia' | 'cae' = 'limpia';
  private t0 = 0;

  activa(): boolean {
    return this.caida !== null || this.i < this.pasos.length;
  }

  reiniciar(): void {
    this.caida = null;
    this.pasos = [];
    this.i = 0;
  }

  /** Baja la pieza de `desdeY` a `hastaY` (filas, con decimales) en poco tiempo y luego avisa. */
  iniciarCaida(pieza: P, desdeY: number, hastaY: number, ahora: number, alAterrizar: () => void): void {
    const filas = Math.max(0, hastaY - desdeY);
    const dur = Math.min(210, 70 + filas * 9);
    this.caida = { pieza, desdeY, hastaY, t0: ahora, dur, alAterrizar };
  }

  iniciarPasos(pasos: PasoAnim<C>[], ahora: number): void {
    if (pasos.length === 0) return;
    this.pasos = pasos;
    this.i = 0;
    this.fase = 'limpia';
    this.t0 = ahora;
  }

  /** Qué dibujar ahora. `null` = nada animándose (dibujar el tablero normal). */
  cuadro(ahora: number): Cuadro<C, P> | null {
    if (this.caida) {
      const c = this.caida;
      const p = Math.min(1, (ahora - c.t0) / c.dur);
      if (p < 1) {
        // Aceleración (cae cada vez más rápido), como un golpe seco.
        const e = p * p;
        return { tipo: 'caida', pieza: c.pieza, y: c.desdeY + (c.hastaY - c.desdeY) * e, desdeY: c.desdeY };
      }
      this.caida = null;
      // El callback fija la pieza y (si corresponde) arma los pasos.
      c.alAterrizar();
      // Los pasos, si los hay, arrancan ahora mismo.
      if (this.i < this.pasos.length) this.t0 = ahora;
    }

    while (this.i < this.pasos.length) {
      const paso = this.pasos[this.i]!;
      const dur = this.fase === 'limpia' ? DUR_LIMPIA_MS : DUR_CAE_MS;
      const p = Math.min(1, (ahora - this.t0) / dur);
      if (p < 1) {
        return { tipo: this.fase, paso, p, nro: this.i + 1 };
      }
      if (this.fase === 'limpia') {
        this.fase = 'cae';
      } else {
        this.fase = 'limpia';
        this.i++;
      }
      this.t0 += dur;
    }
    this.pasos = [];
    this.i = 0;
    return null;
  }
}

/** Curva de salida suave (sin rebote). */
export const easeOut = (p: number): number => 1 - Math.pow(1 - p, 3);
