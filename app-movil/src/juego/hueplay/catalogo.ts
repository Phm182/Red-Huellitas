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
  { codigo: 'huereversi', titulo: 'HueReversi', icono: 'circle-half-full', color: '#2C2C2C' },
  { codigo: 'huetateti', titulo: 'HueTaTeTi', icono: 'close', color: '#E8577E' },
  { codigo: 'huepool', titulo: 'HuePool', icono: 'billiards-rack', color: '#2C5F3E' },
  { codigo: 'huepacman', titulo: 'HuePacMan', icono: 'pac-man', color: '#F0D830' },
  { codigo: 'hueludo', titulo: 'HueLudo', icono: 'dice-multiple', color: '#B36FE0', esSala: true },
  { codigo: 'hueludoroyal', titulo: 'HueLudo Real', icono: 'crown', color: '#D4A017', esSala: true },
  { codigo: 'huerummy', titulo: 'HueRummy', icono: 'cards-playing-outline', color: '#4CC3A5', esSala: true },
  { codigo: 'hueburako', titulo: 'HueBurako', icono: 'cards', color: '#D9834F', esSala: true },
  { codigo: 'huescrabble', titulo: 'HueScrabble', icono: 'alphabetical-variant', color: '#B08D57', esSala: true },
  { codigo: 'huedoku6', titulo: 'HueDoku 6x6', icono: 'view-grid-outline', color: '#D9834F' },
  { codigo: 'huedoku9facil', titulo: 'HueDoku 9x9 Fácil', icono: 'view-grid-outline', color: '#D9834F' },
  { codigo: 'huedoku9dificil', titulo: 'HueDoku 9x9 Difícil', icono: 'view-grid-outline', color: '#D9834F' },
];

export function juegoDelCatalogo(codigo: string): JuegoCatalogoItem | undefined {
  return JUEGOS_CATALOGO.find((j) => j.codigo === codigo);
}

/**
 * Juegos de tablero por turnos: los únicos donde el plazo de respuesta
 * tiene sentido (mover primero es ventaja, hay que esperar al otro).
 */
export const JUEGOS_TURNOS = ['hueconecta', 'huedamas', 'hueajedrez', 'huereversi', 'huetateti', 'huesoccer', 'huepool'];

/**
 * Juegos que se pueden jugar 1 contra 1: retar a alguien puntual, armar una
 * sala de duelo, o un torneo. Espejo de `RH_JUEGOS_DUELO` en el backend
 * (`inc/funciones/desafio_tablero.php`) — los de puntaje (incluido
 * `huepacman`) compiten por quién saca más puntos, sin tablero compartido.
 * El único que queda afuera es HueGotchi: no se juega por partidas.
 */
export const JUEGOS_DUELO = [
  ...JUEGOS_TURNOS,
  'huematch',
  'huememo',
  'huetrivia',
  'huezip',
  'huepacman',
  'huedoku6',
  'huedoku9facil',
  'huedoku9dificil',
];

export function esJuegoDuelo(codigo: string): boolean {
  return JUEGOS_DUELO.includes(codigo);
}

/**
 * Orden que deben tener las listas de juegos en toda la app: alfabético por
 * título, con los favoritos primero (también alfabético entre ellos). Los
 * títulos son nombres de marca fijos (no se traducen entre idiomas), así
 * que comparar el string crudo alcanza sin pedirle nada al `t()`.
 *
 * Genérico en `T` porque la home usa su propio tipo local (`JuegoDef`, con
 * campo `id`) y `desafios.tsx` usa `JuegoCatalogoItem` (campo `codigo`) —
 * en vez de forzar un tipo común, recibe cómo sacarle la clave y el título
 * a cada uno.
 */
export function ordenarJuegos<T>(items: T[], favoritos: string[], claveDe: (item: T) => string, tituloDe: (item: T) => string): T[] {
  const esFavorito = (item: T) => favoritos.includes(claveDe(item));
  return [...items].sort((a, b) => {
    const favA = esFavorito(a);
    const favB = esFavorito(b);
    if (favA !== favB) return favA ? -1 : 1;
    return tituloDe(a).localeCompare(tituloDe(b));
  });
}
