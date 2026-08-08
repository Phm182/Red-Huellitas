/** Tipos de HuePlay. Espejan lo que devuelve inc/ajax/hueplay/. */

export interface HuePlayProgreso {
  nivel: number;
  puntos: number;
  /** Puntos con los que arrancó este nivel y con los que arranca el próximo. */
  nivelDesde: number;
  nivelHasta: number;
  faltan: number;
  subioDeNivel?: boolean;
  puntosGanados?: number;
}

export interface HuePlayRankingItem {
  posicion: number;
  userId: number;
  nombreCompleto: string;
  username: string;
  avatarPath: string | null;
  puntos: number;
  nivel: number;
  soyYo: boolean;
}

export interface HuePlayPerfil {
  progreso: HuePlayProgreso;
  partidasJugadas: number;
  desafiosGanados: number;
  desafiosPerdidos: number;
  /** Récord personal por código de juego. */
  records: Record<string, number>;
  /**
   * Nivel y puntos DENTRO de cada juego, por código.
   *
   * Es distinto de `progreso`, que es el de la cuenta: ese suma todos los
   * juegos y por eso siempre va por delante de cualquiera de estos.
   */
  porJuego: Record<string, HuePlayProgreso>;
  ranking: HuePlayRankingItem[];
  miPuesto: number;
  desafiosPendientes: number;
}

/**
 * Un reto diario: el mismo tablero para todo el mundo ese día.
 *
 * `semilla` viene sólo mientras no lo jugaste. Cuando `jugado` es `true` el
 * backend la deja afuera a propósito —para que no se pueda practicar el
 * tablero del día sin registrar el intento—, y por eso acá es opcional.
 */
export interface DiarioReto {
  diarioId: number;
  fecha: string;
  juegoCodigo: string;
  titulo: string;
  semilla?: number;
  datos: string | null;
  jugado: boolean;
  miPuntaje: number | null;
  miPuesto: number | null;
  participantes: number;
}

export interface DiarioHoy {
  fecha: string;
  retos: DiarioReto[];
  /** Días seguidos jugando. Llega en 0 si la racha se cortó. */
  racha: number;
}

export interface DiarioRankingItem {
  puesto: number;
  userId: number;
  username: string;
  nombreCompleto: string;
  avatarPath: string | null;
  puntos: number;
  duracionSegundos: number | null;
}

export interface DiarioRanking {
  reto: DiarioReto;
  ranking: DiarioRankingItem[];
  participantes: number;
  miPuntaje: number | null;
  miPuesto: number | null;
}

export type DiarioPeriodo = 'dia' | 'semana' | 'mes' | 'anio';

/** Una fila del ranking acumulado: suma puntos de los tres retos diarios. */
export interface DiarioRankingPeriodoItem {
  puesto: number;
  userId: number;
  username: string;
  nombreCompleto: string;
  avatarPath: string | null;
  puntos: number;
  partidas: number;
  /** En cuántos días distintos jugó dentro de la ventana del período. */
  dias: number;
  soyYo: boolean;
}

export interface DiarioRankingPeriodo {
  periodo: DiarioPeriodo;
  desde: string;
  hasta: string;
  dias: number;
  ranking: DiarioRankingPeriodoItem[];
  miPuntaje: number | null;
  miPuesto: number | null;
  misDias: number;
}

export interface DiarioResultado {
  puntos: number;
  racha: number;
  puesto: number | null;
  participantes: number;
  progreso: HuePlayProgreso;
}

export interface HuePlayRival {
  userId: number;
  nombreCompleto: string;
  username: string;
  avatarPath: string | null;
  nivel: number;
  puntos: number;
  loSigo: boolean;
}

export type EstadoDesafio = 'pendiente' | 'aceptado' | 'terminado' | 'rechazado' | 'expirado';

/**
 * `puntaje`: cada uno juega su partida y se comparan los números (HueMatch).
 * `turnos`: un solo tablero que los dos modifican por turnos (HueConecta).
 */
export type ModoDesafio = 'puntaje' | 'turnos';

export interface HuePlayDesafio {
  desafioId: number;
  juegoCodigo: string;
  modo: ModoDesafio;
  estado: EstadoDesafio;
  soyRetador: boolean;
  /** Los dos jugadores reciben la misma semilla: el tablero es idéntico. */
  semilla: number;
  /** Sólo en modo turnos: 42 caracteres, '0' vacío / '1' retador / '2' retado. */
  tablero: string | null;
  turnoDeUserId: number | null;
  /** Ya resuelto por el backend para los dos modos; no lo deduzcas de vuelta. */
  esMiTurno: boolean;
  /** Qué ficha soy en el tablero: '1' o '2'. */
  miFicha: '1' | '2';
  movimientos: number;
  misPuntos: number | null;
  /** Llega en null hasta que jugás, para no saber contra qué número vas. */
  susPuntos: number | null;
  yaJugue: boolean;
  rivalYaJugo: boolean;
  ganadorUserId: number | null;
  otro: {
    userId: number;
    nombreCompleto: string;
    username: string;
    avatarPath: string | null;
  };
  creadoEn: string;
  expiraEn: string;
  /** Horas que tiene el rival para responder cada movimiento (1-24). */
  plazoTurnoHoras: number;
  /** Si el rival es la IA de la app y no otro usuario. */
  esRivalIA: boolean;
}

export interface HuePlayDesafiosBandeja {
  miTurno: HuePlayDesafio[];
  esperando: HuePlayDesafio[];
  terminados: HuePlayDesafio[];
}

export interface CeldaTablero {
  fila: number;
  col: number;
}

/** Respuesta de una jugada de HueConecta. */
export interface HuePlayTurno {
  desafio: HuePlayDesafio;
  ultimaJugada: { fila: number; columna: number };
  /** Las 4+ celdas de la línea, para resaltarla. Vacío si no ganó. */
  lineaGanadora: CeldaTablero[];
  columnasLibres: number[];
  gane: boolean;
  empate: boolean;
  progreso: HuePlayProgreso | null;
}

export interface HuePlayVista {
  desafio: HuePlayDesafio;
  columnasLibres: number[];
}

/** Una casilla de un tablero de 8x8 (Damas o Ajedrez). */
export interface Casilla {
  fila: number;
  col: number;
}

/**
 * HueDamas: el tablero es un string de 64 posiciones (fila*8+col, fila 0
 * arriba). '0' vacío, '1'/'3' ficha/dama del retador, '2'/'4' ficha/dama del
 * retado. El servidor decide todo — el cliente sólo manda desde/hasta.
 */
export type CasillaDamas = Casilla;

/** Un salto dentro de una cadena de captura. `comida` es null en un movimiento simple. */
export interface SaltoDamas {
  desde: CasillaDamas;
  hasta: CasillaDamas;
  comida: CasillaDamas | null;
}

/** Lo que dejó una jugada, para animar salto por salto. */
export interface JugadaDamas {
  saltos: SaltoDamas[];
  /** La casilla donde coronó, o null si no coronó. */
  corono: CasillaDamas | null;
}

/** Un movimiento legal tal como lo manda el servidor (ya con captura obligatoria aplicada). */
export interface MovimientoLegalDamas {
  desde: CasillaDamas;
  hasta: CasillaDamas;
  saltos: SaltoDamas[];
  corona: boolean;
}

export interface HuePlayDamasVista {
  desafio: HuePlayDesafio;
  /** Vacío si no es mi turno: recién se calculan cuando hay algo que elegir. */
  movimientosLegales: MovimientoLegalDamas[];
}

export interface HuePlayDamasTurno {
  desafio: HuePlayDesafio;
  jugada: JugadaDamas;
  /** La respuesta de la IA, ya aplicada, si el rival es la IA. */
  jugadaIA: JugadaDamas | null;
  gane: boolean;
  perdiste: boolean;
  progreso: HuePlayProgreso | null;
}

/**
 * HueAjedrez: el tablero es un string de 70 caracteres — 64 de casillas
 * (fila*8+col, fila 0 arriba) con letras de pieza (mayúscula el retador,
 * minúscula el retado, P/N/B/R/Q/K, '.' vacío) más 6 de estado extra
 * (derechos de enroque y objetivo de captura al paso) que el cliente nunca
 * necesita leer directo — el servidor ya manda todo resuelto.
 */
export interface JugadaAjedrez {
  desde: Casilla;
  hasta: Casilla;
  /** Dónde estaba la pieza comida, o null si no hubo captura (≠ hasta sólo al paso). */
  captura: Casilla | null;
  enroque: { torreDesde: Casilla; torreHasta: Casilla } | null;
  /** Si el movimiento coronó un peón a dama. */
  corono: boolean;
  /** Si esta jugada deja al rival en jaque. */
  jaque: boolean;
}

export interface MovimientoLegalAjedrez {
  desde: Casilla;
  hasta: Casilla;
  captura: boolean;
  enroque: { torreDesde: Casilla; torreHasta: Casilla } | null;
  promocion: boolean;
}

export interface HuePlayAjedrezVista {
  desafio: HuePlayDesafio;
  /** Vacío si no es mi turno: recién se calculan cuando hay algo que elegir. */
  movimientosLegales: MovimientoLegalAjedrez[];
  enJaque: boolean;
}

export interface HuePlayAjedrezTurno {
  desafio: HuePlayDesafio;
  jugada: JugadaAjedrez;
  /** La respuesta de la IA, ya aplicada, si el rival es la IA. */
  jugadaIA: JugadaAjedrez | null;
  gane: boolean;
  perdiste: boolean;
  tablas: boolean;
  progreso: HuePlayProgreso | null;
}

/**
 * HueLudo: sala de hasta 4 jugadores. `tablero` es JSON crudo (nunca un
 * string de casillas como Damas/Ajedrez) — Ludo no es una grilla cuadrada,
 * así que se parsea con `JSON.parse` en la pantalla del juego, no acá.
 */
export type PoliticaAbandonoSala = 'ia' | 'espera' | 'expulsa';
export type EstadoSala = 'esperando' | 'jugando' | 'terminada' | 'cancelada';
export type EstadoSalaJugador = 'invitado' | 'aceptado' | 'rechazado' | 'jugando' | 'abandono' | 'expulsado';

export interface HuePlaySalaJugador {
  salaJugadorId: number;
  userId: number;
  nombreCompleto: string;
  username: string;
  avatarPath: string | null;
  /** Orden de turno / de qué color juega (0-3). Recién se asigna al iniciar. */
  posicion: number;
  estado: EstadoSalaJugador;
  unidoPorCodigo: boolean;
  /** Si la IA le tomó el asiento tras vencer su turno (política 'ia'). */
  tomadoPorIA: boolean;
  esBot: boolean;
  esYo: boolean;
}

export interface HuePlaySala {
  salaId: number;
  juegoCodigo: string;
  creadorUserId: number;
  maxJugadores: number;
  completarConIA: boolean;
  politicaAbandono: PoliticaAbandonoSala;
  plazoTurnoHoras: number;
  codigoInvitacion: string;
  estado: EstadoSala;
  /** JSON crudo (Ludo) o null antes de arrancar. */
  tablero: string | null;
  jugadores: HuePlaySalaJugador[];
  miAsientoId: number | null;
  turnoDeSalaJugadorId: number | null;
  esMiTurno: boolean;
  turnoVenceEn: string | null;
  ganadorSalaJugadorId: number | null;
  soyCreador: boolean;
  creadoEn: string;
  iniciadaEn: string | null;
  terminadaEn: string | null;
}

export interface HuePlaySalasBandeja {
  invitaciones: HuePlaySala[];
  armando: HuePlaySala[];
  miTurno: HuePlaySala[];
  esperando: HuePlaySala[];
  terminadas: HuePlaySala[];
}

/** Una ficha de Ludo. `pos`: -1 corral, 0-50 camino compartido, 51-56 tramo final, 57 meta. */
export interface FichaLudo {
  jugador: number;
  num: number;
  pos: number;
}

export interface TableroLudo {
  fichas: FichaLudo[];
  consecutivosSeis: number;
  dadoPendiente: number | null;
  jugadores: number;
}

export interface MovimientoLegalLudo {
  ficha: { jugador: number; num: number };
  desde: number;
  hasta: number;
  captura: boolean;
}

export interface JugadaLudo {
  dado: number;
  ficha: { jugador: number; num: number } | null;
  desde: number | null;
  hasta: number | null;
  capturadas: { jugador: number; num: number }[];
}

/** Todas las jugadas de un asiento IA en su turno (puede ser más de una tirada, si saca seises). */
export interface JugadasIASalaJugador {
  salaJugadorId: number;
  jugadas: JugadaLudo[];
}

export interface HuePlaySalaTirar {
  sala: HuePlaySala;
  dado: number;
  movimientosLegales: MovimientoLegalLudo[];
  pasoElTurno: boolean;
  jugadasIA: JugadasIASalaJugador[];
}

export interface HuePlaySalaMover {
  sala: HuePlaySala;
  jugada: JugadasIASalaJugador;
  gane: boolean;
  jugadasIA: JugadasIASalaJugador[];
}

export interface HistorialPar {
  misVictorias: number;
  susVictorias: number;
  empates: number;
}

/**
 * HueRummy: `palo` 0-3 (picas/corazones/diamantes/tréboles), `valor` 1-13
 * (as=1, J/Q/K=11/12/13). El servidor nunca manda las manos ajenas — sólo
 * `cantidadCartasPorJugador`.
 */
export interface CartaRummy {
  palo: number;
  valor: number;
}

export interface MeldRummy {
  jugador: number;
  cartas: CartaRummy[];
}

/** Vista redactada del estado de una sala de Rummy, propia de quien la pide. */
export interface EstadoRummyVisible {
  miMano: CartaRummy[];
  cantidadCartasPorJugador: number[];
  cartasEnMazo: number;
  descarte: CartaRummy[];
  melds: MeldRummy[];
  fase: 'robar' | 'descartar';
  jugadores: number;
}

/** Respuesta de los endpoints genéricos de sala (`sala_ver.php`, `sala_iniciar.php`): sirven para cualquier juego de sala. */
export interface HuePlaySalaGenerica {
  sala: HuePlaySala;
  jugadasIA: (JugadasIASalaJugador | JugadaIARummy)[];
  estadoRummy: EstadoRummyVisible | null;
}

export interface JugadaIARummy {
  salaJugadorId: number;
  robo: CartaRummy | null;
  melds: CartaRummy[][];
  descarte: CartaRummy | null;
}

export type JugadasIASalaRummy = JugadaIARummy;

export interface HuePlayRummyRobar {
  sala: HuePlaySala;
  carta: CartaRummy | null;
  rondaCortada: boolean;
  estadoRummy: EstadoRummyVisible;
}

export interface HuePlayRummyBajar {
  sala: HuePlaySala;
  estadoRummy: EstadoRummyVisible;
}

export interface HuePlayRummyDescartar {
  sala: HuePlaySala;
  cartaDescartada: CartaRummy | null;
  gane: boolean;
  jugadasIA: JugadaIARummy[];
  estadoRummy: EstadoRummyVisible | null;
}

/** Una pregunta tal como la sirve el backend: sin la respuesta correcta. */
export interface TriviaPregunta {
  clave: string;
  texto: string;
  /** `id` es la POSICIÓN en la lista barajada, no una letra: la letra revelaría la correcta. */
  opciones: { id: number; texto: string }[];
}

export interface TriviaTanda {
  semilla: number;
  /** Puede no ser el pedido: si ese idioma no tiene preguntas, cae a español. */
  idioma: string;
  segundosPorPregunta: number;
  preguntas: TriviaPregunta[];
}

export interface TriviaDetalle {
  clave: string;
  acerto: boolean;
  elegidaPos: number | null;
  correctaPos: number;
  textoCorrecto: string;
  explicacion: string | null;
}

export interface TriviaResultado {
  /** Sólo cuando la partida fue el reto del día. */
  diario?: DiarioResultado;
  aciertos: number;
  total: number;
  puntos: number;
  detalle: TriviaDetalle[];
  progreso: HuePlayProgreso;
  esRecord?: boolean;
  desafio?: HuePlayDesafio;
}
