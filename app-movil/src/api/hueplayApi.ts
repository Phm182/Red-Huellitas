import { apiGet, apiPost } from './client';
import {
  HuePlayDesafio,
  HuePlayDesafiosBandeja,
  HuePlayPerfil,
  HuePlayProgreso,
  HuePlayRival,
  HuePlayTurno,
  HuePlayVista,
  TriviaResultado,
  TriviaTanda,
} from '../types/hueplay';

/**
 * HuePlay: puntaje de la cuenta, ranking y duelos.
 *
 * Separado de `juegoApi`, que es HueGotchi: allá el nivel es de una mascota,
 * acá es del usuario.
 *
 * Todas las llamadas van con el último parámetro en `true`: en `client.ts` el
 * token NO se manda por defecto, hay que pedirlo endpoint por endpoint. Sin eso
 * el backend contesta 401 aunque la sesión esté bien.
 */
export const hueplayApi = {
  perfil: () => apiGet<HuePlayPerfil>('ajax/hueplay/perfil.php', undefined, true),

  guardarPartida: (juegoCodigo: string, puntos: number, duracionSegundos: number) =>
    apiPost<HuePlayProgreso & { record: number; esRecord: boolean }>(
      'ajax/hueplay/partida_guardar.php',
      { juegoCodigo, puntos, duracionSegundos },
      true
    ),

  rivales: (juegoCodigo: string, q?: string) =>
    apiGet<{ rivales: HuePlayRival[] }>(
      'ajax/hueplay/rivales.php',
      q ? { juegoCodigo, q } : { juegoCodigo },
      true
    ),

  crearDesafio: (juegoCodigo: string, rivalUserId: number) =>
    apiPost<{ desafio: HuePlayDesafio }>(
      'ajax/hueplay/desafio_crear.php',
      { juegoCodigo, rivalUserId },
      true
    ),

  desafios: () => apiGet<HuePlayDesafiosBandeja>('ajax/hueplay/desafio_listar.php', undefined, true),

  jugarDesafio: (desafioId: number, puntos: number, duracionSegundos: number) =>
    apiPost<{ desafio: HuePlayDesafio; progreso: HuePlayProgreso }>(
      'ajax/hueplay/desafio_jugar.php',
      { desafioId, puntos, duracionSegundos },
      true
    ),

  /** Estado de un duelo. Es lo que se consulta mientras se espera al rival. */
  verDesafio: (desafioId: number) =>
    apiGet<HuePlayVista>('ajax/hueplay/desafio_ver.php', { desafioId }, true),

  /** Una jugada de HueConecta: se manda la columna y nada más. */
  jugarTurno: (desafioId: number, columna: number) =>
    apiPost<HuePlayTurno>('ajax/hueplay/turno_jugar.php', { desafioId, columna }, true),

  /** Las 10 preguntas de una partida. El backend nunca manda la correcta. */
  triviaPreguntas: (semilla: number, idioma: string) =>
    apiGet<TriviaTanda>('ajax/hueplay/trivia_preguntas.php', { semilla, idioma }, true),

  /**
   * Cierra la partida de trivia. Se mandan las posiciones elegidas y el
   * servidor corrige: acá el puntaje no lo calcula el cliente.
   */
  triviaResponder: (
    semilla: number,
    idioma: string,
    respuestas: Record<string, number | null>,
    duracionSegundos: number,
    desafioId?: number | null
  ) =>
    apiPost<TriviaResultado>(
      'ajax/hueplay/trivia_responder.php',
      {
        semilla,
        idioma,
        duracionSegundos,
        respuestas: JSON.stringify(respuestas),
        ...(desafioId ? { desafioId } : {}),
      },
      true
    ),

  rechazarDesafio: (desafioId: number) =>
    apiPost<{ desafioId: number; estado: string }>(
      'ajax/hueplay/desafio_rechazar.php',
      { desafioId },
      true
    ),
};
