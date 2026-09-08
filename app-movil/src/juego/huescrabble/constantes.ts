/**
 * Constantes visuales de HueScrabble — mirror del lado servidor
 * (`inc/funciones/scrabble.php`, `RH_SCRABBLE_FICHAS`/`RH_SCRABBLE_LAYOUT_FILAS`).
 * Sólo se usan para pintar la pantalla: el servidor es quien valida y
 * puntúa de verdad, esto nunca decide si una jugada es legal.
 */

/** Valor de cada letra, para el numerito chico de cada ficha. Comodín ('*') no tiene entrada: se muestra en blanco. */
export const RH_SCRABBLE_VALORES: Record<string, number> = {
  A: 1, E: 1, O: 1, I: 1, S: 1, N: 1, R: 1, U: 1, L: 1, T: 1,
  D: 2, G: 2,
  C: 3, B: 3, M: 3, P: 3,
  H: 4, F: 4, V: 4, Y: 4,
  Q: 5,
  J: 8, Ñ: 8, X: 8,
  Z: 10,
};

/** Tablero de premios 15x15 — mismo diseño estándar que el servidor. '.' normal, DL/TL/DP/TP como en el backend. */
export const RH_SCRABBLE_LAYOUT: string[][] = [
  ['TP', '.', '.', 'DL', '.', '.', '.', 'TP', '.', '.', '.', 'DL', '.', '.', 'TP'],
  ['.', 'DP', '.', '.', '.', 'TL', '.', '.', '.', 'TL', '.', '.', '.', 'DP', '.'],
  ['.', '.', 'DP', '.', '.', '.', 'DL', '.', 'DL', '.', '.', '.', 'DP', '.', '.'],
  ['DL', '.', '.', 'DP', '.', '.', '.', 'DL', '.', '.', '.', 'DP', '.', '.', 'DL'],
  ['.', '.', '.', '.', 'DP', '.', '.', '.', '.', '.', 'DP', '.', '.', '.', '.'],
  ['.', 'TL', '.', '.', '.', 'TL', '.', '.', '.', 'TL', '.', '.', '.', 'TL', '.'],
  ['.', '.', 'DL', '.', '.', '.', 'DL', '.', 'DL', '.', '.', '.', 'DL', '.', '.'],
  ['TP', '.', '.', 'DL', '.', '.', '.', 'DP', '.', '.', '.', 'DL', '.', '.', 'TP'],
  ['.', '.', 'DL', '.', '.', '.', 'DL', '.', 'DL', '.', '.', '.', 'DL', '.', '.'],
  ['.', 'TL', '.', '.', '.', 'TL', '.', '.', '.', 'TL', '.', '.', '.', 'TL', '.'],
  ['.', '.', '.', '.', 'DP', '.', '.', '.', '.', '.', 'DP', '.', '.', '.', '.'],
  ['DL', '.', '.', 'DP', '.', '.', '.', 'DL', '.', '.', '.', 'DP', '.', '.', 'DL'],
  ['.', '.', 'DP', '.', '.', '.', 'DL', '.', 'DL', '.', '.', '.', 'DP', '.', '.'],
  ['.', 'DP', '.', '.', '.', 'TL', '.', '.', '.', 'TL', '.', '.', '.', 'DP', '.'],
  ['TP', '.', '.', 'DL', '.', '.', '.', 'TP', '.', '.', '.', 'DL', '.', '.', 'TP'],
];

export const RH_SCRABBLE_CENTRO = 7;

/** Color de fondo y texto corto por tipo de premio, para pintar la celda vacía. */
export const RH_SCRABBLE_COLOR_PREMIO: Record<string, { fondo: string; texto: string; label: string }> = {
  '.': { fondo: '#E8DCC4', texto: '#E8DCC4', label: '' },
  DL: { fondo: '#8FBCE6', texto: '#1E3A5F', label: 'DL' },
  TL: { fondo: '#3E7CB1', texto: '#FFFFFF', label: 'TL' },
  DP: { fondo: '#E8A0A0', texto: '#6B1F1F', label: 'DP' },
  TP: { fondo: '#D2545A', texto: '#FFFFFF', label: 'TP' },
};

export const RH_SCRABBLE_ALFABETO = [
  'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'L', 'M', 'N', 'Ñ', 'O',
  'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'X', 'Y', 'Z',
];
