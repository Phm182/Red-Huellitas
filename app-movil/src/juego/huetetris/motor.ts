/**
 * Motor de HueTetris. Lógica pura, sin React ni dibujo — mismo criterio que
 * `huepool/motor.ts`/`huepacman/motor.ts`: nada de acá sabe que existe React
 * Native, así que se puede probar con un script suelto de Node.
 *
 * **Decisión de diseño pedida explícitamente** (no es el Tetris clásico de
 * verdad): el nivel NO sube cada 10 líneas como en el Tetris real — sube
 * cada `SEGUNDOS_POR_NIVEL` segundos de partida, y cada nivel la caída es
 * más rápida. "El que vaya aumentando de nivel tras transcurrir una cierta
 * cantidad de tiempo y aumente la velocidad progresivamente al pasar de
 * nivel para ir complejizando hasta que en algún momento pierda" — mismo
 * criterio que HueColumns (`huecolumns/motor.ts`), a propósito, para que
 * los dos jueguen "igual" de exigentes con el tiempo.
 *
 * Reusa `prng()` de `huematch/motor.ts` (mismo generador que ya usan
 * HueZip/HueMemo para semillas comparables en duelo/reto del día) en vez de
 * traer otro generador nuevo.
 */
import { prng } from '../huematch/motor';
import type { PasoAnim } from '../comun/secuenciaAnim';

export const ANCHO = 10;
/** Filas visibles. Hay 4 más arriba, ocultas, como colchón para que una
 * pieza recién aparecida (y sus rotaciones) nunca se corte contra el techo
 * antes de poder moverse — mismo critero que el Tetris real. */
export const ALTO_VISIBLE = 20;
export const ALTO_OCULTO = 4;
export const ALTO_TOTAL = ALTO_VISIBLE + ALTO_OCULTO;

export type TipoPieza = 'I' | 'O' | 'T' | 'S' | 'Z' | 'J' | 'L';

/** Cada pieza en sus 4 rotaciones, como grilla de 4x4 (fila-mayor, '#'=ocupado). Exportada para el preview de "siguiente" (`HuePlay`, `TableroTetris.tsx`). */
export const FORMAS: Record<TipoPieza, string[][]> = {
  I: [
    ['....', 'XXXX', '....', '....'],
    ['..X.', '..X.', '..X.', '..X.'],
    ['....', '....', 'XXXX', '....'],
    ['.X..', '.X..', '.X..', '.X..'],
  ],
  O: [
    ['.XX.', '.XX.', '....', '....'],
    ['.XX.', '.XX.', '....', '....'],
    ['.XX.', '.XX.', '....', '....'],
    ['.XX.', '.XX.', '....', '....'],
  ],
  T: [
    ['.X..', 'XXX.', '....', '....'],
    ['.X..', '.XX.', '.X..', '....'],
    ['....', 'XXX.', '.X..', '....'],
    ['.X..', 'XX..', '.X..', '....'],
  ],
  S: [
    ['.XX.', 'XX..', '....', '....'],
    ['.X..', '.XX.', '..X.', '....'],
    ['.XX.', 'XX..', '....', '....'],
    ['.X..', '.XX.', '..X.', '....'],
  ],
  Z: [
    ['XX..', '.XX.', '....', '....'],
    ['..X.', '.XX.', '.X..', '....'],
    ['XX..', '.XX.', '....', '....'],
    ['..X.', '.XX.', '.X..', '....'],
  ],
  J: [
    ['X...', 'XXX.', '....', '....'],
    ['.XX.', '.X..', '.X..', '....'],
    ['....', 'XXX.', '..X.', '....'],
    ['.X..', '.X..', 'XX..', '....'],
  ],
  L: [
    ['..X.', 'XXX.', '....', '....'],
    ['.X..', '.X..', '.XX.', '....'],
    ['....', 'XXX.', 'X...', '....'],
    ['XX..', '.X..', '.X..', '....'],
  ],
};

/** Colores por tipo — el esquema clásico (I cian, O amarillo, T violeta, S verde, Z rojo, J azul, L naranja). */
export const COLOR_PIEZA: Record<TipoPieza, string> = {
  I: '#31C7E8',
  O: '#E8C93A',
  T: '#B060D0',
  S: '#3FC46A',
  Z: '#E04A3A',
  J: '#3D6FE0',
  L: '#E8902C',
};

const TIPOS: TipoPieza[] = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];

/** Cada cuántos segundos de partida sube un nivel — el mismo número que usa HueColumns. */
export const SEGUNDOS_POR_NIVEL = 40;
export const NIVEL_MAX = 19;

/** Segundos por celda de caída, según nivel — curva decreciente clásica (más rápido = más chico), con piso. */
export function intervaloCaida(nivel: number): number {
  const n = Math.min(nivel, NIVEL_MAX);
  return Math.max(0.09, 1.0 - n * 0.045);
}

type Celda = TipoPieza | null;

export type PiezaActiva = { tipo: TipoPieza; rot: number; x: number; y: number };

export type EstadoTetris = {
  tablero: Celda[][]; // [fila][col], fila 0 = arriba del todo (incluye ALTO_OCULTO filas)
  actual: PiezaActiva;
  siguiente: TipoPieza;
  puntaje: number;
  lineas: number;
  nivel: number;
  terminado: boolean;
  duracionSegundos: number;
  tiempoCaidaAcumulado: number;
  /** Última tanda de líneas limpiadas (para flash visual), se vacía al cuadro siguiente. */
  lineasLimpiadasAhora: number[];
  /**
   * Cómo se resolvió la última pieza fijada si limpió líneas (la pantalla lo
   * reproduce animado y lo pone en null). Nunca se serializa: se consume en
   * el mismo cuadro.
   */
  cierre?: PasoAnim<TipoPieza>[] | null;
};

/** Bolsa de 7 (una de cada pieza, orden random) — evita rachas largas sin una pieza en particular, mismo criterio que el Tetris moderno. */
function crearBolsa(rnd: () => number): TipoPieza[] {
  const bolsa = [...TIPOS];
  for (let i = bolsa.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [bolsa[i], bolsa[j]] = [bolsa[j]!, bolsa[i]!];
  }
  return bolsa;
}

function tableroVacio(): Celda[][] {
  return Array.from({ length: ALTO_TOTAL }, () => Array<Celda>(ANCHO).fill(null));
}

function celdasPieza(p: PiezaActiva): { x: number; y: number }[] {
  const forma = FORMAS[p.tipo][p.rot % 4]!;
  const celdas: { x: number; y: number }[] = [];
  for (let f = 0; f < 4; f++) {
    for (let c = 0; c < 4; c++) {
      if (forma[f]![c] === 'X') celdas.push({ x: p.x + c, y: p.y + f });
    }
  }
  return celdas;
}

function colisiona(tablero: Celda[][], p: PiezaActiva): boolean {
  for (const { x, y } of celdasPieza(p)) {
    if (x < 0 || x >= ANCHO || y >= ALTO_TOTAL) return true;
    if (y >= 0 && tablero[y]![x] !== null) return true;
  }
  return false;
}

/** Generador de piezas con estado (bolsa + PRNG) — vive fuera de `EstadoTetris` porque no hace falta serializarlo, sólo lo usa `crearEstadoInicial`/`siguientePieza` en este mismo módulo. */
type GeneradorPiezas = { rnd: () => number; bolsa: TipoPieza[] };

function proximaPieza(gen: GeneradorPiezas): TipoPieza {
  if (gen.bolsa.length === 0) gen.bolsa = crearBolsa(gen.rnd);
  return gen.bolsa.shift()!;
}

const generadores = new WeakMap<EstadoTetris, GeneradorPiezas>();

function piezaInicialEn(tipo: TipoPieza): PiezaActiva {
  return { tipo, rot: 0, x: 3, y: tipo === 'I' ? ALTO_OCULTO - 2 : ALTO_OCULTO - 2 };
}

/**
 * Arranca una partida nueva. `semilla` fija la secuencia de piezas — en
 * duelo 1v1 o reto del día hay que usar SIEMPRE la que manda el servidor
 * (mismo criterio que HuePacMan fuerza el laberinto clásico), para que los
 * puntajes de dos personas jugando la MISMA secuencia sean comparables. En
 * solitario alcanza con `Date.now()`.
 */
export function crearEstadoInicial(semilla: number): EstadoTetris {
  const rnd = prng(semilla >>> 0);
  const gen: GeneradorPiezas = { rnd, bolsa: [] };
  const tipoActual = proximaPieza(gen);
  const tipoSiguiente = proximaPieza(gen);

  const estado: EstadoTetris = {
    tablero: tableroVacio(),
    actual: piezaInicialEn(tipoActual),
    siguiente: tipoSiguiente,
    puntaje: 0,
    lineas: 0,
    nivel: 0,
    terminado: false,
    duracionSegundos: 0,
    tiempoCaidaAcumulado: 0,
    lineasLimpiadasAhora: [],
    cierre: null,
  };
  generadores.set(estado, gen);
  return estado;
}

/** Puntos por líneas limpiadas de una sola bajada — igual criterio (simple/doble/triple/tetris) que el Tetris de siempre, escalado por nivel. */
function puntosPorLineas(cantidad: number, nivel: number): number {
  const base = [0, 100, 300, 500, 800][cantidad] ?? 0;
  return base * (nivel + 1);
}

/** Limpia las filas completas, hace caer el resto, y devuelve cuántas se limpiaron. Muta `tablero` in-place. */
function limpiarLineas(tablero: Celda[][]): number[] {
  const completas: number[] = [];
  for (let f = 0; f < ALTO_TOTAL; f++) {
    if (tablero[f]!.every((c) => c !== null)) completas.push(f);
  }
  if (completas.length === 0) return [];
  const nuevas = tablero.filter((_, f) => !completas.includes(f));
  while (nuevas.length < ALTO_TOTAL) nuevas.unshift(Array<Celda>(ANCHO).fill(null));
  for (let f = 0; f < ALTO_TOTAL; f++) tablero[f] = nuevas[f]!;
  return completas;
}

function fijarPieza(estado: EstadoTetris): void {
  for (const { x, y } of celdasPieza(estado.actual)) {
    if (y >= 0) estado.tablero[y]![x] = estado.actual.tipo;
  }
  const previo = estado.tablero.map((fila) => [...fila]);
  const limpiadas = limpiarLineas(estado.tablero);
  estado.lineasLimpiadasAhora = limpiadas;
  if (limpiadas.length > 0) {
    // Para animar: qué filas se borran y cuánto cae cada fila que quedó.
    const quedan: number[] = [];
    for (let f = 0; f < ALTO_TOTAL; f++) if (!limpiadas.includes(f)) quedan.push(f);
    const relleno = ALTO_TOTAL - quedan.length;
    const caidas = Array.from({ length: ALTO_TOTAL }, (_, f) =>
      Array<number>(ANCHO).fill(f >= relleno ? f - quedan[f - relleno]! : 0)
    );
    const limpiar: string[] = [];
    for (const f of limpiadas) for (let c = 0; c < ANCHO; c++) limpiar.push(`${f},${c}`);
    estado.cierre = [
      { tablero: previo, despues: estado.tablero.map((fila) => [...fila]), limpiar, caidas, combo: 1 },
    ];
  }
  if (limpiadas.length > 0) {
    estado.lineas += limpiadas.length;
    estado.puntaje += puntosPorLineas(limpiadas.length, estado.nivel);
  }

  const gen = generadores.get(estado)!;
  const nuevoTipo = estado.siguiente;
  estado.siguiente = proximaPieza(gen);
  const nueva = piezaInicialEn(nuevoTipo);
  if (colisiona(estado.tablero, nueva)) {
    estado.terminado = true;
    return;
  }
  estado.actual = nueva;
}

/** Intenta mover la pieza activa `dx` columnas / `dy` filas. Devuelve si se pudo mover. */
export function moverPieza(estado: EstadoTetris, dx: number, dy: number): boolean {
  if (estado.terminado) return false;
  const propuesta = { ...estado.actual, x: estado.actual.x + dx, y: estado.actual.y + dy };
  if (colisiona(estado.tablero, propuesta)) return false;
  estado.actual = propuesta;
  return true;
}

/** Rota la pieza activa (sentido horario). Prueba sin desplazar y, si no entra, corrido ±1/±2 columnas — un "kick" simple, no la tabla SRS completa (ver nota de alcance del archivo). */
export function rotarPieza(estado: EstadoTetris): boolean {
  if (estado.terminado || estado.actual.tipo === 'O') return false;
  const rot = (estado.actual.rot + 1) % 4;
  for (const dx of [0, 1, -1, 2, -2]) {
    const propuesta = { ...estado.actual, rot, x: estado.actual.x + dx };
    if (!colisiona(estado.tablero, propuesta)) {
      estado.actual = propuesta;
      return true;
    }
  }
  return false;
}

/** Cae de golpe hasta apoyarse y se fija ahí mismo (hard drop). Suma 2 puntos por celda caída, como bonus por arriesgarse. */
export function caidaDura(estado: EstadoTetris): void {
  if (estado.terminado) return;
  let celdas = 0;
  while (moverPieza(estado, 0, 1)) celdas++;
  estado.puntaje += celdas * 2;
  fijarPieza(estado);
}

/**
 * Un cuadro de simulación: acumula `dt` y aplica la caída automática según
 * el nivel. También actualiza el reloj y el nivel — ver la nota de diseño
 * arriba del archivo sobre por qué es por TIEMPO y no por líneas.
 *
 * No hay caída "suave" (mantener apretado para acelerar): el control es
 * tocar/arrastrar sobre el tablero — deslizar hacia abajo dispara
 * `caidaDura()` directo, sin paso intermedio. Antes existía un modo
 * `cayendoRapido` con un botón de mantener apretado, pero mezclaba mal con
 * el acumulado de esta función (a veces la caída se sentía suave, a veces
 * saltaba 2-3 bloques de golpe — bug real reportado) y quedó afuera al
 * rediseñar los controles.
 */
export function actualizar(estado: EstadoTetris, dt: number): void {
  if (estado.terminado) return;
  estado.lineasLimpiadasAhora = [];
  estado.duracionSegundos += dt;

  const nivelNuevo = Math.min(NIVEL_MAX, Math.floor(estado.duracionSegundos / SEGUNDOS_POR_NIVEL));
  if (nivelNuevo !== estado.nivel) estado.nivel = nivelNuevo;

  const intervalo = intervaloCaida(estado.nivel);
  estado.tiempoCaidaAcumulado += dt;
  while (estado.tiempoCaidaAcumulado >= intervalo && !estado.terminado) {
    estado.tiempoCaidaAcumulado -= intervalo;
    if (!moverPieza(estado, 0, 1)) {
      fijarPieza(estado);
      break; // el tablero cambió de raíz (pieza nueva u otra fijada): no sigue consumiendo el acumulado con la pieza vieja
    }
  }
}

/** Para el render: dónde caería la pieza activa si se soltara ahora (la "sombra fantasma"). */
export function calcularSombra(estado: EstadoTetris): PiezaActiva {
  let sombra = { ...estado.actual };
  while (!colisiona(estado.tablero, { ...sombra, y: sombra.y + 1 })) {
    sombra = { ...sombra, y: sombra.y + 1 };
  }
  return sombra;
}

/**
 * Reconecta un `EstadoTetris` recién deserializado (JSON.parse de lo que
 * guardó `pausaJuego.ts`) con un generador de piezas nuevo — el objeto
 * original y su generador viven pegados por identidad en el `WeakMap`
 * `generadores`, y esa asociación NO sobrevive un viaje por JSON (la
 * deserialización crea un objeto con otra identidad). No hace falta que la
 * bolsa/semilla sean las mismas de antes de pausar: es una partida solo, no
 * un duelo, así que no hace falta reproducibilidad — sólo que las piezas
 * sigan saliendo.
 */
export function restaurarEstado(estado: EstadoTetris): EstadoTetris {
  const semilla = (Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0;
  generadores.set(estado, { rnd: prng(semilla), bolsa: [] });
  estado.cierre = null;
  return estado;
}

export { celdasPieza };
