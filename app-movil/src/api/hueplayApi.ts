import { apiGet, apiPost } from './client';
import {
  DiarioHoy,
  DiarioPeriodo,
  DiarioRanking,
  DiarioRankingPeriodo,
  DiarioResultado,
  HistorialPar,
  HuePlayAjedrezTurno,
  HuePlayAjedrezVista,
  HuePlayDamasTurno,
  HuePlayDamasVista,
  HuePlayDesafio,
  HuePlayDesafiosBandeja,
  HuePlayPerfil,
  HuePlayProgreso,
  HuePlayRival,
  HuePlayRummyBajar,
  HuePlayRummyDescartar,
  HuePlayRummyRobar,
  HuePlaySala,
  HuePlaySalaGenerica,
  HuePlaySalaMover,
  HuePlaySalasBandeja,
  HuePlaySalaTirar,
  HuePlaySoccerTurno,
  HuePlaySoccerVista,
  HuePlayTurno,
  HuePlayVista,
  PoliticaAbandonoSala,
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

  /** Los retos de hoy, los tres en una sola llamada: la pantalla los lista. */
  diarioHoy: () => apiGet<DiarioHoy>('ajax/hueplay/diario_hoy.php', undefined, true),

  /**
   * Cierra el reto del día. Puede fallar con "ya jugaste", que no es un error
   * sino la regla: en `data` viene el puntaje que ya tenías.
   */
  diarioJugar: (juegoCodigo: string, puntos: number, duracionSegundos: number) =>
    apiPost<DiarioResultado>(
      'ajax/hueplay/diario_jugar.php',
      { juegoCodigo, puntos, duracionSegundos },
      true
    ),

  diarioRanking: (juegoCodigo: string, fecha?: string) =>
    apiGet<DiarioRanking>(
      'ajax/hueplay/diario_ranking.php',
      fecha ? { juegoCodigo, fecha } : { juegoCodigo },
      true
    ),

  /** Ranking acumulado de los tres retos diarios, por período. */
  diarioRankingPeriodo: (periodo: DiarioPeriodo) =>
    apiGet<DiarioRankingPeriodo>('ajax/hueplay/diario_ranking_periodo.php', { periodo }, true),

  rivales: (juegoCodigo: string, q?: string) =>
    apiGet<{ rivales: HuePlayRival[] }>(
      'ajax/hueplay/rivales.php',
      q ? { juegoCodigo, q } : { juegoCodigo },
      true
    ),

  /**
   * `rivalUserId` no hace falta si `opciones.contraIA` es `true` — el backend
   * resuelve el rival a la cuenta de la IA y, si le toca arrancar a ella, la
   * jugada de apertura ya viene resuelta en la respuesta.
   */
  crearDesafio: (
    juegoCodigo: string,
    rivalUserId?: number,
    opciones?: { plazoTurnoMinutos?: number; contraIA?: boolean; metaGoles?: number }
  ) =>
    apiPost<{ desafio: HuePlayDesafio }>(
      'ajax/hueplay/desafio_crear.php',
      {
        juegoCodigo,
        ...(rivalUserId ? { rivalUserId } : {}),
        ...(opciones?.plazoTurnoMinutos ? { plazoTurnoMinutos: opciones.plazoTurnoMinutos } : {}),
        ...(opciones?.contraIA ? { contraIA: '1' } : {}),
        ...(opciones?.metaGoles ? { metaGoles: opciones.metaGoles } : {}),
      },
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

  /** Estado de un duelo de Damas, con los movimientos legales si es mi turno. */
  verDesafioDamas: (desafioId: number) =>
    apiGet<HuePlayDamasVista>('ajax/hueplay/damas_ver.php', { desafioId }, true),

  /** Una jugada de Damas: desde/hasta, el servidor busca la cadena que corresponde. */
  jugarDamas: (desafioId: number, desde: { fila: number; col: number }, hasta: { fila: number; col: number }) =>
    apiPost<HuePlayDamasTurno>(
      'ajax/hueplay/damas_mover.php',
      { desafioId, dFila: desde.fila, dCol: desde.col, hFila: hasta.fila, hCol: hasta.col },
      true
    ),

  /** Estado de un duelo de HueSoccer. `desafio.tablero` es el JSON del `TableroSoccer`. */
  verDesafioSoccer: (desafioId: number) =>
    apiGet<HuePlaySoccerVista>('ajax/hueplay/soccer_ver.php', { desafioId }, true),

  /**
   * Un tiro de HueSoccer: `tableroNuevo` es el `TableroSoccer` ya simulado
   * en el cliente (ver `src/juego/huesoccer/motor.ts`), serializado a JSON.
   * El servidor decide el gol por su cuenta, no confía en un flag acá.
   */
  soccerMover: (desafioId: number, tableroNuevo: string) =>
    apiPost<HuePlaySoccerTurno>('ajax/hueplay/soccer_mover.php', { desafioId, tableroNuevo }, true),

  /** Se agotaron los 20 segundos del turno: el servidor valida de verdad que pasó el tiempo. */
  soccerTurnoVencido: (desafioId: number) =>
    apiPost<HuePlaySoccerTurno>('ajax/hueplay/soccer_turno_vencido.php', { desafioId }, true),

  /** Preferencia fija de skin de HueSoccer (fichas/pelota), se usa en todos los partidos. */
  guardarHueSoccerSkin: (skinFicha?: string, skinPelota?: string) =>
    apiPost<{ skinFicha: string; skinPelota: string }>(
      'ajax/perfil/huesoccer_skin_guardar.php',
      { ...(skinFicha ? { skinFicha } : {}), ...(skinPelota ? { skinPelota } : {}) },
      true
    ),

  /** Estado de un duelo de Ajedrez, con los movimientos legales y si estoy en jaque. */
  verDesafioAjedrez: (desafioId: number) =>
    apiGet<HuePlayAjedrezVista>('ajax/hueplay/ajedrez_ver.php', { desafioId }, true),

  /** Una jugada de Ajedrez: desde/hasta, el servidor identifica el movimiento (enroque, al paso, promoción). */
  jugarAjedrez: (desafioId: number, desde: { fila: number; col: number }, hasta: { fila: number; col: number }) =>
    apiPost<HuePlayAjedrezTurno>(
      'ajax/hueplay/ajedrez_mover.php',
      { desafioId, dFila: desde.fila, dCol: desde.col, hFila: hasta.fila, hCol: hasta.col },
      true
    ),

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
    desafioId?: number | null,
    diario?: boolean
  ) =>
    apiPost<TriviaResultado>(
      'ajax/hueplay/trivia_responder.php',
      {
        semilla,
        idioma,
        duracionSegundos,
        respuestas: JSON.stringify(respuestas),
        ...(desafioId ? { desafioId } : {}),
        ...(diario ? { diario: '1' } : {}),
      },
      true
    ),

  rechazarDesafio: (desafioId: number) =>
    apiPost<{ desafioId: number; estado: string }>(
      'ajax/hueplay/desafio_rechazar.php',
      { desafioId },
      true
    ),

  // --- Salas (HueLudo, y después HueRummy) ---

  crearSala: (
    juegoCodigo: string,
    opciones: {
      maxJugadores: number;
      completarConIA: boolean;
      politicaAbandono: PoliticaAbandonoSala;
      plazoTurnoMinutos: number;
      invitadosUserIds?: number[];
    }
  ) =>
    apiPost<{ sala: HuePlaySala }>(
      'ajax/hueplay/sala_crear.php',
      {
        juegoCodigo,
        maxJugadores: opciones.maxJugadores,
        completarConIA: opciones.completarConIA ? '1' : '0',
        politicaAbandono: opciones.politicaAbandono,
        plazoTurnoMinutos: opciones.plazoTurnoMinutos,
        ...(opciones.invitadosUserIds?.length
          ? { invitadosUserIds: opciones.invitadosUserIds.join(',') }
          : {}),
      },
      true
    ),

  unirseSala: (codigoInvitacion: string) =>
    apiPost<{ sala: HuePlaySala }>('ajax/hueplay/sala_unirse.php', { codigoInvitacion }, true),

  responderSala: (salaId: number, aceptar: boolean) =>
    apiPost<{ sala: HuePlaySala }>(
      'ajax/hueplay/sala_responder.php',
      { salaId, aceptar: aceptar ? '1' : '0' },
      true
    ),

  iniciarSala: (salaId: number) =>
    apiPost<HuePlaySalaGenerica>('ajax/hueplay/sala_iniciar.php', { salaId }, true),

  verSala: (salaId: number) =>
    apiGet<HuePlaySalaGenerica>('ajax/hueplay/sala_ver.php', { salaId }, true),

  salas: () => apiGet<HuePlaySalasBandeja>('ajax/hueplay/sala_listar.php', undefined, true),

  historialCon: (rivalUserId: number, juegoCodigo: string) =>
    apiGet<{ historial: HistorialPar }>(
      'ajax/hueplay/historial_con.php',
      { rivalUserId, juegoCodigo },
      true
    ),

  /** Tira el dado en HueLudo. Si no hay jugada posible, el turno ya pasó solo. */
  ludoTirar: (salaId: number) =>
    apiPost<HuePlaySalaTirar>('ajax/hueplay/ludo_tirar.php', { salaId }, true),

  /** Mueve la ficha `fichaNum` con el dado que ya se tiró. */
  ludoMover: (salaId: number, fichaNum: number) =>
    apiPost<HuePlaySalaMover>('ajax/hueplay/ludo_mover.php', { salaId, fichaNum }, true),

  /** Roba una carta en HueRummy: del mazo, o del tope del descarte. */
  rummyRobar: (salaId: number, origen: 'mazo' | 'descarte') =>
    apiPost<HuePlayRummyRobar>('ajax/hueplay/rummy_robar.php', { salaId, origen }, true),

  /** Baja un meld nuevo con cartas de tu mano (índices dentro de tu mano, ya robada la carta del turno). */
  rummyBajar: (salaId: number, indices: number[]) =>
    apiPost<HuePlayRummyBajar>('ajax/hueplay/rummy_bajar.php', { salaId, indices: indices.join(',') }, true),

  /** Descarta una carta de tu mano (por índice) y cierra tu turno. */
  rummyDescartar: (salaId: number, indice: number) =>
    apiPost<HuePlayRummyDescartar>('ajax/hueplay/rummy_descartar.php', { salaId, indice }, true),
};
