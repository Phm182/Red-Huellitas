import { prng } from '../huematch/motor';

/**
 * HueMemo: encontrar los pares.
 *
 * Reusa el PRNG de HueMatch por la misma razón: en un duelo los dos jugadores
 * tienen que recibir **el mismo reparto de cartas**, y eso sólo se logra
 * barajando desde una semilla compartida.
 */

export const PARES = 8;
export const TOTAL = PARES * 2;
export const COLUMNAS = 4;

/** Segundos de partida. Da para terminarla con calma y perderla si dudás mucho. */
export const SEGUNDOS = 90;

/**
 * Reparto de cartas: cada figura aparece dos veces, mezcladas.
 *
 * Fisher-Yates con el PRNG sembrado. `Math.random()` acá rompería el duelo.
 */
export function repartir(semilla: number): number[] {
  const cartas: number[] = [];
  for (let i = 0; i < PARES; i++) {
    cartas.push(i, i);
  }

  const rnd = prng(semilla);
  for (let i = cartas.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    const tmp = cartas[i]!;
    cartas[i] = cartas[j]!;
    cartas[j] = tmp;
  }

  return cartas;
}

/**
 * Puntaje final.
 *
 * Tres partes, a propósito: los pares encontrados pagan siempre (para que una
 * partida incompleta no valga cero), la eficiencia premia acordarse en vez de
 * dar vuelta cartas al azar, y el tiempo sobrante premia ir rápido. Sin la
 * parte de eficiencia, tocar todas las cartas a lo loco daría lo mismo que
 * jugar bien.
 */
export function puntaje(paresHechos: number, fallos: number, segundosUsados: number): number {
  const porPares = paresHechos * 100;
  const completo = paresHechos === PARES;

  // El bono de eficiencia y el de tiempo sólo se cobran si terminaste: si no,
  // abandonar temprano con pocos fallos pagaría más que jugar hasta el final.
  if (!completo) {
    return porPares;
  }

  const eficiencia = Math.max(0, 600 - fallos * 40);
  const tiempo = Math.max(0, (SEGUNDOS - segundosUsados) * 6);

  return porPares + eficiencia + tiempo;
}
