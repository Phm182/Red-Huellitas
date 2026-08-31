/**
 * Motor de HueDoku (Sudoku). Lógica pura, sin React ni dibujo.
 *
 * Dos tamaños de grilla — 6x6 (cajas de 2x3, dígitos 1-6, pensado para
 * velocidad) y 9x9 clásico (cajas de 3x3, dígitos 1-9, con dos niveles de
 * dificultad por cantidad de pistas) — bajo un mismo algoritmo genérico.
 *
 * Generación en dos fases, mismo patrón de guard/reintento que
 * `huezip/motor.ts::generarCamino` (presupuesto de PASOS, no de tiempo real
 * — determinístico sin importar la velocidad del dispositivo):
 *   1. Arma una grilla resuelta completa por backtracking aleatorizado.
 *   2. Vacía celdas de a una (orden aleatorio) mientras la solución siga
 *      siendo ÚNICA — se verifica contando soluciones y cortando apenas se
 *      encuentra una segunda.
 */
import { prng } from '../huematch/motor';

export type VarianteDoku = '6' | '9facil' | '9dificil';
/** 0 = celda vacía. */
export type Grilla = number[][];

export type Puzzle = {
  variante: VarianteDoku;
  n: number;
  cajaFilas: number;
  cajaCols: number;
  pistas: Grilla;
  solucion: Grilla;
};

type ConfigVariante = { n: number; cajaFilas: number; cajaCols: number; pistas: number; presupuesto: number };

const CONFIG: Record<VarianteDoku, ConfigVariante> = {
  // 36 celdas, 24 pistas (12 vacías): fácil/rápido a propósito.
  '6': { n: 6, cajaFilas: 2, cajaCols: 3, pistas: 24, presupuesto: 25000 },
  // 81 celdas, 38 pistas: rango estándar de "fácil" real (36-46).
  '9facil': { n: 9, cajaFilas: 3, cajaCols: 3, pistas: 38, presupuesto: 70000 },
  // 81 celdas, 28 pistas: rango estándar "difícil" (22-28), sin ir a
  // extremos que hagan la generación demasiado lenta en un celular.
  '9dificil': { n: 9, cajaFilas: 3, cajaCols: 3, pistas: 28, presupuesto: 150000 },
};

export function configDeVariante(variante: VarianteDoku): ConfigVariante {
  return CONFIG[variante];
}

function grillaVacia(n: number): Grilla {
  return Array.from({ length: n }, () => Array.from({ length: n }, () => 0));
}

function copiarGrilla(g: Grilla): Grilla {
  return g.map((fila) => [...fila]);
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

/** ¿Se puede colocar `valor` en `(fila,col)` sin romper fila/columna/caja? */
function esValido(g: Grilla, fila: number, col: number, valor: number, n: number, cajaFilas: number, cajaCols: number): boolean {
  for (let c = 0; c < n; c++) if (g[fila]![c] === valor) return false;
  for (let f = 0; f < n; f++) if (g[f]![col] === valor) return false;
  const boxFila = Math.floor(fila / cajaFilas) * cajaFilas;
  const boxCol = Math.floor(col / cajaCols) * cajaCols;
  for (let f = boxFila; f < boxFila + cajaFilas; f++) {
    for (let c = boxCol; c < boxCol + cajaCols; c++) {
      if (g[f]![c] === valor) return false;
    }
  }
  return true;
}

type Presupuesto = { pasos: number; limite: number };

/** Primer celda vacía en orden fila-major, o null si la grilla está completa. */
function primeraVacia(g: Grilla, n: number): { fila: number; col: number } | null {
  for (let f = 0; f < n; f++) {
    for (let c = 0; c < n; c++) {
      if (g[f]![c] === 0) return { fila: f, col: c };
    }
  }
  return null;
}

/**
 * Backtracking aleatorizado: llena toda la grilla con candidatos en orden
 * barajado por celda. Devuelve `null` si se agota el presupuesto de pasos.
 */
function generarGrillaCompleta(n: number, cajaFilas: number, cajaCols: number, rnd: () => number, presupuesto: Presupuesto): Grilla | null {
  const g = grillaVacia(n);
  const digitos = Array.from({ length: n }, (_, i) => i + 1);

  function paso(): boolean {
    if (presupuesto.pasos++ > presupuesto.limite) return false;
    const vacia = primeraVacia(g, n);
    if (!vacia) return true;
    const { fila, col } = vacia;
    for (const valor of barajar(digitos, rnd)) {
      if (!esValido(g, fila, col, valor, n, cajaFilas, cajaCols)) continue;
      g[fila]![col] = valor;
      if (paso()) return true;
      g[fila]![col] = 0;
      if (presupuesto.pasos > presupuesto.limite) return false;
    }
    return false;
  }

  return paso() ? g : null;
}

/**
 * Cuenta soluciones de `g` (con celdas en 0 = a resolver), cortando apenas
 * llega a `limite` — no hace falta seguir contando después de la 2ª, sólo
 * importa "única o no". Orden de candidatos fijo (no aleatorio: acá no
 * importa cuál solución se encuentra primero, sólo cuántas hay).
 */
function contarSoluciones(g: Grilla, n: number, cajaFilas: number, cajaCols: number, presupuesto: Presupuesto, limite: number): number {
  let encontradas = 0;

  function paso(): void {
    if (encontradas >= limite) return;
    if (presupuesto.pasos++ > presupuesto.limite) {
      // Presupuesto agotado a mitad de conteo: no se puede asegurar
      // unicidad. Se reporta como "no única" (conservador) para que el
      // llamador NUNCA vacíe una celda cuya unicidad no pudo verificar de
      // verdad — preferible un puzzle con más pistas de las buscadas a uno
      // con una solución que en realidad no es única.
      encontradas = Math.max(encontradas, limite);
      return;
    }
    const vacia = primeraVacia(g, n);
    if (!vacia) {
      encontradas++;
      return;
    }
    const { fila, col } = vacia;
    for (let valor = 1; valor <= n; valor++) {
      if (encontradas >= limite) return;
      if (!esValido(g, fila, col, valor, n, cajaFilas, cajaCols)) continue;
      g[fila]![col] = valor;
      paso();
      g[fila]![col] = 0;
    }
  }

  paso();
  return encontradas;
}

/**
 * Genera el puzzle completo para una semilla y variante: determinístico
 * (misma semilla → mismo puzzle, en cualquier dispositivo — necesario para
 * que duelo y reto diario compartan grilla). Nunca devuelve un puzzle
 * inválido o de solución no-única, aunque no llegue exacto a la cantidad de
 * pistas objetivo (degrada con más pistas de las buscadas antes que
 * arriesgar algo roto).
 */
export function generarPuzzle(semilla: number, variante: VarianteDoku): Puzzle {
  const { n, cajaFilas, cajaCols, pistas: pistasObjetivo, presupuesto: presupuestoBase } = CONFIG[variante];

  let mejor: Grilla | null = null;
  let mejorSolucion: Grilla | null = null;
  let mejorPistas = Infinity;

  for (let intento = 0; intento < 3; intento++) {
    const rnd = prng((semilla + intento * 7919) >>> 0);
    const presupuestoGrilla: Presupuesto = { pasos: 0, limite: Math.max(5000, presupuestoBase / 3) };
    const solucion = generarGrillaCompleta(n, cajaFilas, cajaCols, rnd, presupuestoGrilla);
    if (!solucion) continue;

    const candidato = copiarGrilla(solucion);
    const indices = barajar(
      Array.from({ length: n * n }, (_, i) => i),
      rnd
    );
    const objetivoVacias = n * n - pistasObjetivo;
    let vacias = 0;
    const presupuestoRemocion: Presupuesto = { pasos: 0, limite: presupuestoBase };

    for (const idx of indices) {
      if (vacias >= objetivoVacias) break;
      if (presupuestoRemocion.pasos > presupuestoRemocion.limite) break;

      const fila = Math.floor(idx / n);
      const col = idx % n;
      const valorGuardado = candidato[fila]![col]!;
      if (valorGuardado === 0) continue;

      candidato[fila]![col] = 0;
      const trabajo = copiarGrilla(candidato);
      const conteo = contarSoluciones(trabajo, n, cajaFilas, cajaCols, presupuestoRemocion, 2);

      if (conteo === 1) {
        vacias++;
      } else {
        candidato[fila]![col] = valorGuardado; // restaurar: rompía la unicidad
      }
    }

    const pistasFinal = n * n - vacias;
    if (pistasFinal < mejorPistas) {
      mejor = candidato;
      mejorSolucion = solucion;
      mejorPistas = pistasFinal;
    }
    if (pistasFinal <= pistasObjetivo) break; // ya se llegó al objetivo, no hace falta otro intento
  }

  if (mejor && mejorSolucion) {
    return { variante, n, cajaFilas, cajaCols, pistas: mejor, solucion: mejorSolucion };
  }

  // Salida de emergencia (no debería pasar nunca en la práctica): grilla
  // resuelta completa, sin celdas vacías — nunca inválida, nunca cuelga.
  const rnd = prng(semilla >>> 0);
  const solucionEmergencia =
    generarGrillaCompleta(n, cajaFilas, cajaCols, rnd, { pasos: 0, limite: presupuestoBase * 2 }) ?? grillaVacia(n);
  return { variante, n, cajaFilas, cajaCols, pistas: copiarGrilla(solucionEmergencia), solucion: solucionEmergencia };
}

/** ¿El valor en `(fila,col)` de `grilla` rompe fila/columna/caja con algún otro valor puesto? */
export function celdaTieneConflicto(puzzle: Puzzle, grilla: Grilla, fila: number, col: number): boolean {
  const { n, cajaFilas, cajaCols } = puzzle;
  const valor = grilla[fila]![col];
  if (!valor) return false;

  for (let c = 0; c < n; c++) if (c !== col && grilla[fila]![c] === valor) return true;
  for (let f = 0; f < n; f++) if (f !== fila && grilla[f]![col] === valor) return true;
  const boxFila = Math.floor(fila / cajaFilas) * cajaFilas;
  const boxCol = Math.floor(col / cajaCols) * cajaCols;
  for (let f = boxFila; f < boxFila + cajaFilas; f++) {
    for (let c = boxCol; c < boxCol + cajaCols; c++) {
      if ((f !== fila || c !== col) && grilla[f]![c] === valor) return true;
    }
  }
  return false;
}

export function grillaCompleta(grilla: Grilla): boolean {
  return grilla.every((fila) => fila.every((v) => v !== 0));
}

/** Completa y sin ningún conflicto — en un Sudoku válido eso ya implica que es LA solución. */
export function estaResuelto(puzzle: Puzzle, grilla: Grilla): boolean {
  if (!grillaCompleta(grilla)) return false;
  for (let f = 0; f < puzzle.n; f++) {
    for (let c = 0; c < puzzle.n; c++) {
      if (celdaTieneConflicto(puzzle, grilla, f, c)) return false;
    }
  }
  return true;
}

/**
 * Puntaje por velocidad, misma filosofía que HueZip: gana quien lo resuelve
 * más rápido, los errores sólo desempatan diferencias mínimas
 * (`TOPE_ERRORES_PENALIZADOS * PENALIDAD_ERROR` = 27 puntos ≈ 9 segundos,
 * calibrado más laxo que HueZip porque acá las partidas se miden en
 * minutos, no en 90 segundos).
 */
const RESOLUCION_TIEMPO = 3;
const PENALIDAD_ERROR = 3;
const TOPE_ERRORES_PENALIZADOS = 9;
const BASE_COMPLETO = 3000;

export function puntaje(resuelto: boolean, errores: number, segundosUsados: number, celdasCompletadas: number, totalCeldas: number): number {
  if (!resuelto) return Math.round((celdasCompletadas / Math.max(1, totalCeldas)) * 200);
  const penalidadTiempo = segundosUsados * RESOLUCION_TIEMPO;
  const penalidadErrores = Math.min(errores, TOPE_ERRORES_PENALIZADOS) * PENALIDAD_ERROR;
  return Math.max(0, BASE_COMPLETO - penalidadTiempo - penalidadErrores);
}

export function variantePorJuegoCodigo(codigo: string): VarianteDoku | null {
  if (codigo === 'huedoku6') return '6';
  if (codigo === 'huedoku9facil') return '9facil';
  if (codigo === 'huedoku9dificil') return '9dificil';
  return null;
}

export function juegoCodigoPorVariante(variante: VarianteDoku): string {
  return variante === '6' ? 'huedoku6' : variante === '9facil' ? 'huedoku9facil' : 'huedoku9dificil';
}
