import React from 'react';
import { View } from 'react-native';
import Svg, { Circle, Rect } from 'react-native-svg';

/**
 * Geometría del tablero de HueLudo: una grilla de 15x15 casillas. Cada
 * función acá espeja EXACTAMENTE la numeración del backend
 * (`inc/funciones/ludo.php`) — jugador 0 entra en la absoluta 0, cada
 * jugador siguiente 13 casillas después, y el camino da (casi) toda la
 * vuelta al anillo de 52 antes de doblar hacia el tramo final propio.
 */

export const COLOR_JUGADOR: [string, string, string, string] = [
  '#E8577E', // jugador 0 (rojo) — arranca abajo a la izquierda
  '#4CC3A5', // jugador 1 (verde) — arriba a la izquierda
  '#5B9AD6', // jugador 2 (azul) — arriba a la derecha
  '#E8A54C', // jugador 3 (amarillo) — abajo a la derecha
];

const ENTRADA_POR_JUGADOR = 13;

/** Las 52 casillas del camino compartido, en orden, arrancando en la entrada del jugador 0. */
const PATH: [number, number][] = [
  [6, 1], [6, 2], [6, 3], [6, 4], [6, 5],
  [5, 6], [4, 6], [3, 6], [2, 6], [1, 6], [0, 6],
  [0, 7],
  [0, 8],
  [1, 8], [2, 8], [3, 8], [4, 8], [5, 8],
  [6, 9], [6, 10], [6, 11], [6, 12], [6, 13], [6, 14],
  [7, 14],
  [8, 14],
  [8, 13], [8, 12], [8, 11], [8, 10], [8, 9],
  [9, 8], [10, 8], [11, 8], [12, 8], [13, 8], [14, 8],
  [14, 7],
  [14, 6],
  [13, 6], [12, 6], [11, 6], [10, 6], [9, 6],
  [8, 5], [8, 4], [8, 3], [8, 2], [8, 1], [8, 0],
  [7, 0],
];

/** El tramo final privado de cada jugador (6 casillas, relativa 51-56), camino al centro. */
const TRAMO_FINAL: [number, number][][] = [
  [[7, 1], [7, 2], [7, 3], [7, 4], [7, 5], [7, 6]],
  [[1, 7], [2, 7], [3, 7], [4, 7], [5, 7], [6, 7]],
  [[7, 13], [7, 12], [7, 11], [7, 10], [7, 9], [7, 8]],
  [[13, 7], [12, 7], [11, 7], [10, 7], [9, 7], [8, 7]],
];

/** 4 lugares por jugador dentro de su corral, para cuando la ficha está en pos=-1. */
const CORRAL: [number, number][][] = [
  [[1, 1], [1, 4], [4, 1], [4, 4]],
  [[1, 10], [1, 13], [4, 10], [4, 13]],
  [[10, 10], [10, 13], [13, 10], [13, 13]],
  [[10, 1], [10, 4], [13, 1], [13, 4]],
];

const CENTRO: [number, number] = [7, 7];

/** Casilla (fila, col en la grilla de 15) de una ficha, según su posición relativa a SU jugador. */
export function celdaDeFicha(jugador: number, posRelativa: number, num: number): [number, number] {
  if (posRelativa === -1) {
    return CORRAL[jugador][num];
  }
  if (posRelativa <= 50) {
    const abs = (jugador * ENTRADA_POR_JUGADOR + posRelativa) % 52;
    return PATH[abs];
  }
  if (posRelativa <= 56) {
    return TRAMO_FINAL[jugador][posRelativa - 51];
  }
  return CENTRO;
}

/** Si una posición absoluta del camino compartido es casilla segura (no se puede capturar ahí). */
export function esCasillaSeguraAbs(absoluta: number): boolean {
  for (let j = 0; j < 4; j++) {
    const entrada = j * ENTRADA_POR_JUGADOR;
    if (absoluta === entrada || absoluta === (entrada + 8) % 52) return true;
  }
  return false;
}

const SAFE_ABS = new Set(Array.from({ length: 52 }, (_, i) => i).filter(esCasillaSeguraAbs));
const SAFE_CELLS = new Set(Array.from(SAFE_ABS).map((abs) => PATH[abs].join(',')));

type Props = { tamano: number };

/** El fondo estático del tablero: corrales, camino, tramos finales y centro. Las fichas se dibujan aparte, encima. */
export function TableroLudo({ tamano }: Props) {
  const cell = tamano / 15;

  return (
    <View style={{ width: tamano, height: tamano }}>
      <Svg width={tamano} height={tamano} viewBox="0 0 300 300">
        <Rect x={0} y={0} width={300} height={300} fill="#F7F3EC" />

        {/* Corrales de salida, uno por jugador, en cada esquina. */}
        {[
          [0, 0],
          [0, 9],
          [9, 9],
          [9, 0],
        ].map(([r, c], jugador) => (
          <React.Fragment key={`corral-${jugador}`}>
            <Rect
              x={c * 20}
              y={r * 20}
              width={120}
              height={120}
              rx={12}
              fill={COLOR_JUGADOR[jugador]}
              opacity={0.22}
            />
            <Rect
              x={c * 20 + 14}
              y={r * 20 + 14}
              width={92}
              height={92}
              rx={10}
              fill="#FFFFFF"
            />
            {CORRAL[jugador].map(([cr, cc], i) => (
              <Circle
                key={`corral-slot-${jugador}-${i}`}
                cx={cc * 20 + 10}
                cy={cr * 20 + 10}
                r={7}
                fill={COLOR_JUGADOR[jugador]}
                opacity={0.35}
              />
            ))}
          </React.Fragment>
        ))}

        {/* Camino compartido: una casilla por índice del anillo de 52. */}
        {PATH.map(([r, c], i) => (
          <Rect
            key={`path-${i}`}
            x={c * 20 + 1}
            y={r * 20 + 1}
            width={18}
            height={18}
            fill={SAFE_CELLS.has(`${r},${c}`) ? '#FFE9B0' : '#FFFFFF'}
            stroke="#E3D9C6"
            strokeWidth={1}
          />
        ))}
        {Array.from(SAFE_ABS).map((abs) => {
          const [r, c] = PATH[abs];
          return (
            <Circle key={`safe-${abs}`} cx={c * 20 + 10} cy={r * 20 + 10} r={3.5} fill="#D9A32B" opacity={0.6} />
          );
        })}

        {/* Tramos finales, un carril de color por jugador. */}
        {TRAMO_FINAL.map((celdas, jugador) =>
          celdas.map(([r, c], i) => (
            <Rect
              key={`tramo-${jugador}-${i}`}
              x={c * 20 + 1}
              y={r * 20 + 1}
              width={18}
              height={18}
              fill={COLOR_JUGADOR[jugador]}
              opacity={0.45}
            />
          ))
        )}

        {/* Centro: 4 triángulos de color apuntando al medio, la meta. */}
        <Rect x={126} y={126} width={48} height={48} fill="#FFFFFF" stroke="#E3D9C6" strokeWidth={1} />
        <Circle cx={150} cy={150} r={16} fill="#FFD166" opacity={0.8} />
      </Svg>
    </View>
  );
}

export { CENTRO, CORRAL, PATH, TRAMO_FINAL };
