import { Ionicons } from '@expo/vector-icons';

export type JuegoCatalogoItem = {
  codigo: string;
  titulo: string;
  icono: keyof typeof Ionicons.glyphMap;
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
 */
export const JUEGOS_CATALOGO: JuegoCatalogoItem[] = [
  { codigo: 'huematch', titulo: 'HueCrush', icono: 'grid', color: '#E8577E' },
  { codigo: 'hueconecta', titulo: 'HueConecta', icono: 'ellipse', color: '#5B9AD6' },
  { codigo: 'huememo', titulo: 'HueMemo', icono: 'copy', color: '#4CC3A5' },
  { codigo: 'huetrivia', titulo: 'HueTrivia', icono: 'help-circle', color: '#B36FE0' },
  { codigo: 'huezip', titulo: 'HueZip', icono: 'trail-sign', color: '#F0A830' },
  { codigo: 'huesoccer', titulo: 'HueSoccer', icono: 'football', color: '#3D9970' },
  { codigo: 'huedamas', titulo: 'HueDamas', icono: 'apps', color: '#6B4226' },
  { codigo: 'hueajedrez', titulo: 'HueAjedrez', icono: 'grid-outline', color: '#7B9463' },
  { codigo: 'hueludo', titulo: 'HueLudo', icono: 'dice', color: '#B36FE0', esSala: true },
  { codigo: 'huerummy', titulo: 'HueRummy', icono: 'albums', color: '#4CC3A5', esSala: true },
  { codigo: 'huedoku6', titulo: 'HueDoku 6x6', icono: 'grid-outline', color: '#D9834F' },
  { codigo: 'huedoku9facil', titulo: 'HueDoku 9x9 Fácil', icono: 'grid-outline', color: '#D9834F' },
  { codigo: 'huedoku9dificil', titulo: 'HueDoku 9x9 Difícil', icono: 'grid-outline', color: '#D9834F' },
];

export function juegoDelCatalogo(codigo: string): JuegoCatalogoItem | undefined {
  return JUEGOS_CATALOGO.find((j) => j.codigo === codigo);
}
