import { MaterialCommunityIcons } from '@expo/vector-icons';

export type JuegoCatalogoItem = {
  codigo: string;
  titulo: string;
  icono: keyof typeof MaterialCommunityIcons.glyphMap;
  color: string;
  /** true = hasta 4 jugadores por sala (HueLudo/HueRummy), no 1 contra 1. */
  esSala?: boolean;
};

/**
 * Ícono y color por juego — el mismo que usa la lista principal de HuePlay
 * (`app/(app)/hueplay/index.tsx`), acá aparte para que cualquier pantalla que
 * necesite mostrar "qué juego es" (elegir con quién jugar, la bandeja de
 * desafíos, etc.) lo lea de un solo lugar en vez de tener el mapeo repetido
 * y corriendo el riesgo de que se desincronicen los colores/íconos.
 *
 * `MaterialCommunityIcons` y no `Ionicons`: es el set que trae íconos de
 * juego reales (`chess-knight`, `cards-playing-outline`, `dice-multiple`…) —
 * con Ionicons, ajedrez y damas terminaban los dos con una grilla genérica,
 * sin ninguna pista de qué juego era cada uno.
 */
export const JUEGOS_CATALOGO: JuegoCatalogoItem[] = [
  { codigo: 'huematch', titulo: 'HueCrush', icono: 'view-grid', color: '#E8577E' },
  { codigo: 'hueconecta', titulo: 'HueConecta', icono: 'circle-multiple', color: '#5B9AD6' },
  { codigo: 'huememo', titulo: 'HueMemo', icono: 'cards', color: '#4CC3A5' },
  { codigo: 'huetrivia', titulo: 'HueTrivia', icono: 'comment-question-outline', color: '#B36FE0' },
  { codigo: 'huezip', titulo: 'HueZip', icono: 'gesture-swipe', color: '#F0A830' },
  { codigo: 'huesoccer', titulo: 'HueSoccer', icono: 'soccer', color: '#3D9970' },
  { codigo: 'huedamas', titulo: 'HueDamas', icono: 'checkerboard', color: '#6B4226' },
  { codigo: 'hueajedrez', titulo: 'HueAjedrez', icono: 'chess-knight', color: '#7B9463' },
  { codigo: 'hueludo', titulo: 'HueLudo', icono: 'dice-multiple', color: '#B36FE0', esSala: true },
  { codigo: 'huerummy', titulo: 'HueRummy', icono: 'cards-playing-outline', color: '#4CC3A5', esSala: true },
  { codigo: 'huedoku6', titulo: 'HueDoku 6x6', icono: 'view-grid-outline', color: '#D9834F' },
  { codigo: 'huedoku9facil', titulo: 'HueDoku 9x9 Fácil', icono: 'view-grid-outline', color: '#D9834F' },
  { codigo: 'huedoku9dificil', titulo: 'HueDoku 9x9 Difícil', icono: 'view-grid-outline', color: '#D9834F' },
];

export function juegoDelCatalogo(codigo: string): JuegoCatalogoItem | undefined {
  return JUEGOS_CATALOGO.find((j) => j.codigo === codigo);
}
