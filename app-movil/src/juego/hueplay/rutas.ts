/**
 * A qué pantalla ir según el juego de un desafío o una sala.
 *
 * Estaba duplicado tal cual (misma tabla, tres veces) en `retar.tsx`,
 * `desafios.tsx` y `salas.tsx` — cada uno lo había resuelto por su lado al
 * ir agregando juegos nuevos, con el riesgo de que uno se actualice y los
 * otros dos se olviden. Vive acá una sola vez.
 */
import { variantePorJuegoCodigo } from '../huedoku/motor';

export type DesafioParaRuta = { juegoCodigo: string; desafioId: number; semilla: number };

/** Ruta + params al crear/reanudar un desafío 1 contra 1. */
export function rutaDelDesafio(d: DesafioParaRuta): { pathname: string; params: Record<string, string | number> } {
  if (d.juegoCodigo === 'hueconecta') {
    return { pathname: '/(app)/hueplay/hueconecta', params: { desafioId: d.desafioId } };
  }
  if (d.juegoCodigo === 'huedamas') {
    return { pathname: '/(app)/hueplay/damas', params: { desafioId: d.desafioId } };
  }
  if (d.juegoCodigo === 'hueajedrez') {
    return { pathname: '/(app)/hueplay/ajedrez', params: { desafioId: d.desafioId } };
  }
  if (d.juegoCodigo === 'huereversi') {
    return { pathname: '/(app)/hueplay/reversi', params: { desafioId: d.desafioId } };
  }
  if (d.juegoCodigo === 'huetateti') {
    return { pathname: '/(app)/hueplay/tateti', params: { desafioId: d.desafioId } };
  }
  if (d.juegoCodigo === 'huepool') {
    return { pathname: '/(app)/hueplay/huepool', params: { desafioId: d.desafioId } };
  }
  if (d.juegoCodigo === 'huesoccer') {
    return { pathname: '/(app)/hueplay/huesoccer', params: { desafioId: d.desafioId } };
  }
  const varianteDoku = variantePorJuegoCodigo(d.juegoCodigo);
  if (varianteDoku) {
    return {
      pathname: '/(app)/hueplay/huedoku',
      params: { desafioId: d.desafioId, semilla: d.semilla, variante: varianteDoku },
    };
  }
  const rutas: Record<string, string> = {
    huememo: '/(app)/hueplay/huememo',
    huetrivia: '/(app)/hueplay/huetrivia',
    huezip: '/(app)/hueplay/huezip',
    huepacman: '/(app)/hueplay/huepacman',
  };
  return {
    pathname: rutas[d.juegoCodigo] ?? '/(app)/hueplay/huematch',
    params: { desafioId: d.desafioId, semilla: d.semilla },
  };
}

/** Pantalla de sala (hasta 4 jugadores) según el juego. */
const PANTALLA_SALA: Record<string, string> = {
  huerummy: '/(app)/hueplay/rummy',
  hueburako: '/(app)/hueplay/burako',
  huescrabble: '/(app)/hueplay/huescrabble',
  hueludoroyal: '/(app)/hueplay/ludoroyal',
};
export function rutaDeSala(juegoCodigo: string): string {
  return PANTALLA_SALA[juegoCodigo] ?? '/(app)/hueplay/ludo';
}

/** Clave de i18n (`hueplay.<clave>.*`) de un juego de sala. */
const CLAVE_I18N_SALA: Record<string, string> = {
  huerummy: 'rummy',
  hueburako: 'burako',
  huescrabble: 'scrabble',
  hueludoroyal: 'ludoroyal',
};
export function claveI18nSala(juegoCodigo: string): string {
  return CLAVE_I18N_SALA[juegoCodigo] ?? 'ludo';
}
