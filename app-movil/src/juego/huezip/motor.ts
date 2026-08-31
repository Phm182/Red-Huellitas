/**
 * Motor de HueZip. Lógica pura, sin React ni dibujo.
 *
 * Como HueMatch/HueMemo: separado de la pantalla para poder razonarlo (y
 * probarlo) sin montar nada.
 */
import { prng } from '../huematch/motor';

export const N = 5;
export const K = 6;
/** Segundos por partida (arrancado/pantalla lo usa como techo del reloj). */
export const SEGUNDOS = 90;

export type Celda = { fila: number; col: number };
export type TipoCelda = 'numero' | 'blanca';
export type CeldaPuzzle = { fila: number; col: number; tipo: TipoCelda; numero: number | null };
export type Puzzle = {
  n: number;
  celdas: CeldaPuzzle[][];
  totalCeldas: number;
  totalNumeros: number;
};

/** Progreso del jugador mientras dibuja el camino. */
export type ProgresoZip = {
  visitadas: Celda[];
  /** Próximo número a tocar (1-indexed); K+1 = ya se tocaron todos. */
  siguienteNumero: number;
};

function clave(c: Celda): number {
  return c.fila * N + c.col;
}

function vecinos(c: Celda, n: number): Celda[] {
  const out: Celda[] = [];
  if (c.fila > 0) out.push({ fila: c.fila - 1, col: c.col });
  if (c.fila < n - 1) out.push({ fila: c.fila + 1, col: c.col });
  if (c.col > 0) out.push({ fila: c.fila, col: c.col - 1 });
  if (c.col < n - 1) out.push({ fila: c.fila, col: c.col + 1 });
  return out;
}

function barajar<T>(arr: T[], rnd: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    const tmp = a[i]!;
    a[i] = a[j]!;
    a[j] = tmp;
  }
  return a;
}

/**
 * Backtracking aleatorizado: intenta armar un camino Hamiltoniano (visita
 * cada celda de la grilla exactamente una vez, moviéndose a una celda
 * ortogonalmente adyacente en cada paso) arrancando en `inicio`.
 *
 * `presupuesto` es un contador de pasos explorados, no un timeout — así el
 * resultado es 100% determinístico para una semilla dada, sin depender de
 * qué tan rápido sea el dispositivo.
 */
function intentarCamino(
  n: number,
  inicio: Celda,
  rnd: () => number,
  presupuesto: { pasos: number; limite: number }
): Celda[] | null {
  const total = n * n;
  const visitado = new Set<number>([clave(inicio)]);
  const camino: Celda[] = [inicio];

  function paso(): boolean {
    if (presupuesto.pasos++ > presupuesto.limite) return false;
    if (camino.length === total) return true;
    const actual = camino[camino.length - 1]!;
    const candidatos = barajar(
      vecinos(actual, n).filter((v) => !visitado.has(clave(v))),
      rnd
    );
    for (const cand of candidatos) {
      visitado.add(clave(cand));
      camino.push(cand);
      if (paso()) return true;
      camino.pop();
      visitado.delete(clave(cand));
      if (presupuesto.pasos > presupuesto.limite) return false;
    }
    return false;
  }

  return paso() ? camino : null;
}

/**
 * Genera el camino solución completo (cubre las N*N celdas) para una
 * semilla dada. Determinístico: misma semilla → mismo camino, en cualquier
 * dispositivo — necesario para que duelo y reto diario compartan grilla.
 */
export function generarCamino(semilla: number, n: number = N): Celda[] {
  for (let intento = 0; intento < 8; intento++) {
    const rnd = prng((semilla + intento * 7919) >>> 0);
    const inicio: Celda = { fila: Math.floor(rnd() * n), col: Math.floor(rnd() * n) };
    const presupuesto = { pasos: 0, limite: 20000 };
    const camino = intentarCamino(n, inicio, rnd, presupuesto);
    if (camino) return camino;
  }
  // Salida de emergencia (no debería pasar con n=5): recorrido en serpentina.
  const camino: Celda[] = [];
  for (let f = 0; f < n; f++) {
    for (let c = 0; c < n; c++) {
      camino.push({ fila: f, col: f % 2 === 0 ? c : n - 1 - c });
    }
  }
  return camino;
}

/**
 * Arma el puzzle completo a partir de una semilla: genera el camino
 * solución y marca K celdas equiespaciadas a lo largo de él como
 * numeradas (la 1 y la K caen siempre en los extremos del camino, así el
 * puzzle tiene un único punto de partida y de llegada sin ambigüedad).
 */
export function generarPuzzle(semilla: number, n: number = N, k: number = K): Puzzle {
  const camino = generarCamino(semilla, n);
  const celdas: CeldaPuzzle[][] = Array.from({ length: n }, (_, fila) =>
    Array.from({ length: n }, (_, col) => ({ fila, col, tipo: 'blanca' as TipoCelda, numero: null }))
  );

  const paso = (camino.length - 1) / (k - 1);
  for (let i = 0; i < k; i++) {
    const idx = Math.round(i * paso);
    const { fila, col } = camino[idx]!;
    celdas[fila]![col] = { fila, col, tipo: 'numero', numero: i + 1 };
  }

  return { n, celdas, totalCeldas: n * n, totalNumeros: k };
}

export function sonAdyacentes(a: Celda, b: Celda): boolean {
  return Math.abs(a.fila - b.fila) + Math.abs(a.col - b.col) === 1;
}

export function progresoInicial(): ProgresoZip {
  return { visitadas: [], siguienteNumero: 1 };
}

/** Celda numerada "1" del puzzle — el único punto de partida válido. */
export function celdaInicial(puzzle: Puzzle): Celda {
  for (const fila of puzzle.celdas) {
    for (const cp of fila) {
      if (cp.tipo === 'numero' && cp.numero === 1) return { fila: cp.fila, col: cp.col };
    }
  }
  // No debería pasar nunca: generarPuzzle siempre pone el 1 en un extremo.
  return { fila: 0, col: 0 };
}

/**
 * Reinicia el camino desde cero, arrancando de nuevo en la celda 1. Se llama
 * cuando el dedo TOCA (no arrastra hasta) la celda 1 estando ya en curso una
 * partida — el gesto estándar de "empezar de nuevo" en este tipo de puzzle.
 */
export function reiniciar(puzzle: Puzzle): ProgresoZip {
  const inicio = celdaInicial(puzzle);
  return { visitadas: [inicio], siguienteNumero: 2 };
}

export type ResultadoToque = { progreso: ProgresoZip; evento: 'agregada' | 'deshecha' | 'rechazada' | 'sinCambio' };

/**
 * Aplica el toque de una celda al progreso actual, según las reglas de
 * HueZip (ver plan): deshacer si es la penúltima visitada, ignorar si no es
 * adyacente o ya está visitada, rechazar si es un número fuera de orden.
 */
export function tocarCelda(puzzle: Puzzle, progreso: ProgresoZip, c: Celda): ResultadoToque {
  const { visitadas, siguienteNumero } = progreso;
  const cp = puzzle.celdas[c.fila]![c.col]!;

  if (visitadas.length === 0) {
    // Sólo se puede arrancar por la celda número 1.
    if (cp.tipo === 'numero' && cp.numero === 1) {
      return { progreso: { visitadas: [c], siguienteNumero: 2 }, evento: 'agregada' };
    }
    return { progreso, evento: 'sinCambio' };
  }

  const penultima = visitadas.length >= 2 ? visitadas[visitadas.length - 2] : null;
  if (penultima && penultima.fila === c.fila && penultima.col === c.col) {
    const nuevaVisitadas = visitadas.slice(0, -1);
    const deshecha = visitadas[visitadas.length - 1]!;
    const celdaDeshecha = puzzle.celdas[deshecha.fila]![deshecha.col]!;
    const nuevoSiguiente =
      celdaDeshecha.tipo === 'numero' ? celdaDeshecha.numero! : siguienteNumero;
    return { progreso: { visitadas: nuevaVisitadas, siguienteNumero: nuevoSiguiente }, evento: 'deshecha' };
  }

  const ultima = visitadas[visitadas.length - 1]!;
  if (!sonAdyacentes(ultima, c)) {
    return { progreso, evento: 'sinCambio' };
  }
  if (visitadas.some((v) => v.fila === c.fila && v.col === c.col)) {
    return { progreso, evento: 'sinCambio' };
  }
  if (cp.tipo === 'numero' && cp.numero !== siguienteNumero) {
    return { progreso, evento: 'rechazada' };
  }

  const nuevoSiguiente = cp.tipo === 'numero' ? siguienteNumero + 1 : siguienteNumero;
  return {
    progreso: { visitadas: [...visitadas, c], siguienteNumero: nuevoSiguiente },
    evento: 'agregada',
  };
}

export function estaCompleto(puzzle: Puzzle, progreso: ProgresoZip): boolean {
  return progreso.visitadas.length === puzzle.totalCeldas && progreso.siguienteNumero === puzzle.totalNumeros + 1;
}

/**
 * Puntaje final. `celdasCompletadas` paga siempre (aunque no haya terminado
 * a tiempo); el bono de eficiencia y de tiempo sólo se suman si el camino
 * quedó completo. Mismo estilo que `huememo/motor.ts::puntaje()`.
 */
export function puntaje(
  celdasCompletadas: number,
  reinicios: number,
  segundosUsados: number,
  totalCeldas: number = N * N,
  limiteSegundos: number = SEGUNDOS
): number {
  const porCeldas = celdasCompletadas * 40;
  if (celdasCompletadas !== totalCeldas) return porCeldas;
  const eficiencia = Math.max(0, 300 - reinicios * 50);
  const tiempo = Math.max(0, (limiteSegundos - segundosUsados) * 8);
  return porCeldas + eficiencia + tiempo;
}
