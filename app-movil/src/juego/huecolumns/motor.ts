/**
 * Motor de HueColumns. Lógica pura, mismo criterio que `huetetris/motor.ts`
 * (ver su comentario de cabecera para la nota de diseño compartida sobre
 * "nivel por tiempo, no por líneas/combos" — acá el mismo criterio: sube
 * cada `SEGUNDOS_POR_NIVEL` segundos, no por cuántas gemas juntaste).
 *
 * Reusa `prng()` de `huematch/motor.ts`, igual que HueTetris.
 */
import { prng } from '../huematch/motor';
import type { PasoAnim } from '../comun/secuenciaAnim';

export const ANCHO = 6;
export const ALTO_VISIBLE = 13;
export const ALTO_OCULTO = 3;
export const ALTO_TOTAL = ALTO_VISIBLE + ALTO_OCULTO;

/** 6 colores de gema — mismo criterio de paleta que HueTetris (colores planos, sin pretender igualar el pixel art original). */
export const COLORES_GEMA = ['#E04A3A', '#B060D0', '#E8902C', '#E8C93A', '#3FC46A', '#3D6FE0'] as const;
export type ColorGema = (typeof COLORES_GEMA)[number];
export type Gema = ColorGema | null;

export const SEGUNDOS_POR_NIVEL = 40;
export const NIVEL_MAX = 19;

/**
 * Segundos por celda de caída, según nivel.
 *
 * Curva EXPONENCIAL, no lineal: cada nivel es un `RATIO_NIVEL` (11,5%) más
 * rápido que el anterior, así que el cambio se siente parejo desde el
 * nivel 1 — antes era una resta fija por nivel (`1.0 - n*0.045`), que hace
 * que el cambio relativo sea chiquito al principio (de 1.00s a 0.955s casi
 * no se nota) y recién se sienta fuerte cerca del techo (quejado: "recién
 * en nivel 14 sentí la diferencia"). El piso sigue en `PISO_CAIDA`, y con
 * este ratio se llega justo ahí en `NIVEL_MAX`.
 */
const RATIO_NIVEL = 0.885;
const PISO_CAIDA = 0.1;

export function intervaloCaida(nivel: number): number {
  const n = Math.min(nivel, NIVEL_MAX);
  return Math.max(PISO_CAIDA, RATIO_NIVEL ** n);
}

/**
 * Intervalo mientras se mantiene apretado para acelerar la caída ("soft
 * drop": distinto de la caída dura, que fija la pieza de una). Nunca más
 * lento que la caída normal del nivel actual, para que acelerar nunca frene.
 */
/**
 * Antes 0,035s (~29 casilleros/seg): tan rápido que mantener apretado se
 * sentía como una caída dura disfrazada — apenas se notaba que arrancaba y
 * ya estaba en el piso, sin margen para soltar en el lugar justo. A este
 * ritmo cruzar el tablero entero lleva unos 3 segundos: se puede seguir
 * moviendo a los costados y soltar exactamente donde hace falta.
 */
export const INTERVALO_ACELERADO = 0.13;


/** El trío que cae: 3 gemas en una sola columna, `orden[0]` es la de ARRIBA. */
export type TrioActivo = { orden: [ColorGema, ColorGema, ColorGema]; x: number; y: number };

export type EstadoColumns = {
  tablero: Gema[][]; // [fila][col]
  actual: TrioActivo;
  siguiente: [ColorGema, ColorGema, ColorGema];
  puntaje: number;
  gemasLimpiadas: number;
  combo: number;
  nivel: number;
  terminado: boolean;
  duracionSegundos: number;
  tiempoCaidaAcumulado: number;
  /** Casillas limpiadas en el último cuadro (para el flash visual), `"fila,col"`. Se vacía cada cuadro. */
  limpiadasAhora: string[];
  /** true un instante mientras el motor está resolviendo la cascada de matches — el jugador no controla nada en ese rato. */
  resolviendo: boolean;
  /** Los pasos de la última cascada, para reproducirla animada (la pantalla los consume y lo pone en null). */
  cierre?: PasoAnim<ColorGema>[] | null;
};

const generadores = new WeakMap<EstadoColumns, () => number>();

function tableroVacio(): Gema[][] {
  return Array.from({ length: ALTO_TOTAL }, () => Array<Gema>(ANCHO).fill(null));
}

function trioAlAzar(rnd: () => number): [ColorGema, ColorGema, ColorGema] {
  const pick = () => COLORES_GEMA[Math.floor(rnd() * COLORES_GEMA.length)]!;
  return [pick(), pick(), pick()];
}

function trioInicialEn(orden: [ColorGema, ColorGema, ColorGema]): TrioActivo {
  return { orden, x: Math.floor(ANCHO / 2) - 1, y: ALTO_OCULTO - 3 };
}

export function crearEstadoInicial(semilla: number): EstadoColumns {
  const rnd = prng(semilla >>> 0);
  const actual = trioInicialEn(trioAlAzar(rnd));
  const siguiente = trioAlAzar(rnd);

  const estado: EstadoColumns = {
    tablero: tableroVacio(),
    actual,
    siguiente,
    puntaje: 0,
    gemasLimpiadas: 0,
    combo: 0,
    nivel: 0,
    terminado: false,
    duracionSegundos: 0,
    tiempoCaidaAcumulado: 0,
    limpiadasAhora: [],
    resolviendo: false,
    cierre: null,
  };
  generadores.set(estado, rnd);
  return estado;
}

/** Las 3 celdas del trío activo, de arriba a abajo (`orden[0]` es la de más arriba, en `y`). */
export function celdasTrio(t: TrioActivo): { x: number; y: number; color: ColorGema }[] {
  return [
    { x: t.x, y: t.y, color: t.orden[0] },
    { x: t.x, y: t.y + 1, color: t.orden[1] },
    { x: t.x, y: t.y + 2, color: t.orden[2] },
  ];
}

function colisionaTrio(tablero: Gema[][], t: TrioActivo): boolean {
  if (t.x < 0 || t.x >= ANCHO) return true;
  for (const { y } of celdasTrio(t)) {
    if (y >= ALTO_TOTAL) return true;
    if (y >= 0 && tablero[y]![t.x] !== null) return true;
  }
  return false;
}

export function moverTrio(estado: EstadoColumns, dx: number, dy: number): boolean {
  if (estado.terminado || estado.resolviendo) return false;
  const propuesto = { ...estado.actual, x: estado.actual.x + dx, y: estado.actual.y + dy };
  if (colisionaTrio(estado.tablero, propuesto)) return false;
  estado.actual = propuesto;
  return true;
}

/** Rota el ORDEN de las 3 gemas dentro del trío (la de abajo pasa a arriba) — no cambia de posición en el tablero, sólo reordena los colores. */
export function rotarTrio(estado: EstadoColumns): void {
  if (estado.terminado || estado.resolviendo) return;
  const [a, b, c] = estado.actual.orden;
  estado.actual = { ...estado.actual, orden: [c, a, b] };
}

/** Direcciones únicas a explorar desde cada celda para no contar una misma corrida dos veces (horizontal, vertical, las 2 diagonales). */
const DIRECCIONES = [
  { dx: 1, dy: 0 },
  { dx: 0, dy: 1 },
  { dx: 1, dy: 1 },
  { dx: 1, dy: -1 },
];

/** Todas las celdas que forman parte de una corrida de 3+ del mismo color, en cualquiera de las 4 direcciones. */
function encontrarMatches(tablero: Gema[][]): Set<string> {
  const marcadas = new Set<string>();
  for (let y = 0; y < ALTO_TOTAL; y++) {
    for (let x = 0; x < ANCHO; x++) {
      const color = tablero[y]![x];
      if (!color) continue;
      for (const { dx, dy } of DIRECCIONES) {
        const racha: string[] = [`${y},${x}`];
        let ny = y + dy;
        let nx = x + dx;
        while (ny >= 0 && ny < ALTO_TOTAL && nx >= 0 && nx < ANCHO && tablero[ny]![nx] === color) {
          racha.push(`${ny},${nx}`);
          ny += dy;
          nx += dx;
        }
        if (racha.length >= 3) {
          for (const clave of racha) marcadas.add(clave);
        }
      }
    }
  }
  return marcadas;
}

/** Hace caer todo lo que quedó flotando y devuelve, por celda final, cuántas filas cayó (para animarlo). */
function aplicarGravedad(tablero: Gema[][]): number[][] {
  const caidas = Array.from({ length: ALTO_TOTAL }, () => Array<number>(ANCHO).fill(0));
  for (let x = 0; x < ANCHO; x++) {
    const columna: Gema[] = [];
    const origen: number[] = [];
    for (let y = 0; y < ALTO_TOTAL; y++) {
      if (tablero[y]![x] !== null) {
        columna.push(tablero[y]![x]);
        origen.push(y);
      }
    }
    const relleno = ALTO_TOTAL - columna.length;
    for (let y = 0; y < ALTO_TOTAL; y++) {
      tablero[y]![x] = y < relleno ? null : columna[y - relleno]!;
      if (y >= relleno) caidas[y]![x] = y - origen[y - relleno]!;
    }
  }
  return caidas;
}

/** Puntos por gema limpiada, escalados por el combo (cascada) y el nivel — más combo, más vale cada gema. */
function puntosPorMatch(cantidad: number, combo: number, nivel: number): number {
  return cantidad * 10 * (combo + 1) * (1 + nivel * 0.5);
}

/**
 * Fija el trío activo en el tablero y resuelve la cascada completa de
 * matches (limpia, cae, vuelve a mirar si se formó algo nuevo, repite) de
 * una sola vez — es un cálculo instantáneo desde la lógica del juego, la
 * pantalla es la que decide animarlo cuadro a cuadro leyendo
 * `limpiadasAhora` en cada paso si quiere (ver `huecolumns.tsx`).
 */
function fijarTrio(estado: EstadoColumns): void {
  for (const { x, y, color } of celdasTrio(estado.actual)) {
    if (y >= 0) estado.tablero[y]![x] = color;
  }

  let combo = 0;
  const limpiadasTotal: string[] = [];
  const pasos: PasoAnim<ColorGema>[] = [];
  while (true) {
    const matches = encontrarMatches(estado.tablero);
    if (matches.size === 0) break;
    combo++;
    const antes = estado.tablero.map((fila) => [...fila]);
    for (const clave of matches) {
      const [y, x] = clave.split(',').map(Number);
      estado.tablero[y!]![x!] = null;
      limpiadasTotal.push(clave);
    }
    estado.puntaje += Math.round(puntosPorMatch(matches.size, combo - 1, estado.nivel));
    estado.gemasLimpiadas += matches.size;
    const caidas = aplicarGravedad(estado.tablero);
    pasos.push({
      tablero: antes,
      despues: estado.tablero.map((fila) => [...fila]),
      limpiar: [...matches],
      caidas,
      combo,
    });
  }
  estado.combo = combo;
  estado.limpiadasAhora = limpiadasTotal;
  estado.cierre = pasos.length > 0 ? pasos : null;

  const rnd = generadores.get(estado)!;
  const nuevoOrden = estado.siguiente;
  estado.siguiente = trioAlAzar(rnd);
  const nuevoTrio = trioInicialEn(nuevoOrden);
  if (colisionaTrio(estado.tablero, nuevoTrio)) {
    estado.terminado = true;
    return;
  }
  estado.actual = nuevoTrio;
}

/** Cae de golpe hasta apoyarse y resuelve la cascada ahí mismo (hard drop). */
export function caidaDura(estado: EstadoColumns): void {
  if (estado.terminado || estado.resolviendo) return;
  let celdas = 0;
  while (moverTrio(estado, 0, 1)) celdas++;
  estado.puntaje += celdas * 2;
  fijarTrio(estado);
}

/**
 * No hay caída "suave" — el control es tocar/arrastrar sobre el tablero;
 * deslizar hacia abajo dispara `caidaDura()` directo. Ver la nota
 * equivalente en `huetetris/motor.ts::actualizar()` sobre por qué se sacó
 * el modo de mantener apretado.
 */
export function actualizar(estado: EstadoColumns, dt: number, acelerado = false): void {
  if (estado.terminado) return;
  estado.limpiadasAhora = [];
  estado.duracionSegundos += dt;

  const nivelNuevo = Math.min(NIVEL_MAX, Math.floor(estado.duracionSegundos / SEGUNDOS_POR_NIVEL));
  if (nivelNuevo !== estado.nivel) estado.nivel = nivelNuevo;

  const intervalo = acelerado ? Math.min(intervaloCaida(estado.nivel), INTERVALO_ACELERADO) : intervaloCaida(estado.nivel);
  estado.tiempoCaidaAcumulado += dt;
  while (estado.tiempoCaidaAcumulado >= intervalo && !estado.terminado) {
    estado.tiempoCaidaAcumulado -= intervalo;
    if (!moverTrio(estado, 0, 1)) {
      fijarTrio(estado);
      break;
    }
  }
}

/**
 * Reconecta un `EstadoColumns` recién deserializado con un generador nuevo —
 * mismo motivo y mismo criterio que `huetetris/motor.ts::restaurarEstado`.
 */
export function restaurarEstado(estado: EstadoColumns): EstadoColumns {
  const semilla = (Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0;
  generadores.set(estado, prng(semilla));
  estado.cierre = null;
  return estado;
}

export function calcularSombra(estado: EstadoColumns): TrioActivo {
  let sombra = { ...estado.actual };
  while (!colisionaTrio(estado.tablero, { ...sombra, y: sombra.y + 1 })) {
    sombra = { ...sombra, y: sombra.y + 1 };
  }
  return sombra;
}
