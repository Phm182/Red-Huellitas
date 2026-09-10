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
  /** 'solo' (nunca contra otra persona), 'multiplayer' (nunca solo) o 'ambos', por código de juego. */
  modosPorJuego: Record<string, 'solo' | 'multiplayer' | 'ambos'>;
  /** Códigos de juego que este usuario marcó como favorito — para ordenar listas, no se navega aparte. */
  favoritos: string[];
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
    /** Skin fijo de HueSoccer del rival (aunque el duelo no sea de HueSoccer, siempre viaja). */
    skinFicha: string;
    skinPelota: string;
    colorFicha: string;
  };
  creadoEn: string;
  expiraEn: string;
  /** Horas que tiene el rival para responder cada movimiento (1-24). */
  plazoTurnoMinutos: number;
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
 * HueReversi: no hay "desde" — se coloca una ficha nueva, nunca se mueve
 * una existente. `volteadas` son las casillas rivales que esa jugada da
 * vuelta, para animar el volteo.
 */
export interface CasillaReversi {
  fila: number;
  col: number;
}

export interface MovimientoLegalReversi extends CasillaReversi {
  volteadas: [number, number][];
}

export interface JugadaReversi extends CasillaReversi {
  volteadas: [number, number][];
}

export interface HuePlayReversiVista {
  desafio: HuePlayDesafio;
  movimientosLegales: MovimientoLegalReversi[];
}

export interface HuePlayReversiTurno {
  desafio: HuePlayDesafio;
  jugada: JugadaReversi;
  /** Cadena de jugadas de la IA — puede ser más de una si a mí me tocaba pasar. */
  jugadasIA: JugadaReversi[];
  gane: boolean;
  perdiste: boolean;
  progreso: HuePlayProgreso | null;
}

/**
 * HueSoccer: `desafio.tablero` es un JSON (no un string fijo como
 * Damas/Ajedrez) con las posiciones de las 10 fichas, la pelota, los goles
 * y el reloj de turno/tope de partido — ver `app-movil/src/juego/
 * huesoccer/motor.ts` (`TableroSoccer`) para el shape exacto. Acá no se
 * repite el tipo: se decodifica con `JSON.parse` en la pantalla y se tipa
 * con el `TableroSoccer` del motor.
 */
export interface HuePlaySoccerVista {
  desafio: HuePlayDesafio;
}

export interface HuePlaySoccerTurno {
  desafio: HuePlayDesafio;
  gol: 1 | 2 | null;
  /** null = el partido sigue. */
  resultado: 'gane' | 'perdiste' | 'empate' | null;
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
  plazoTurnoMinutos: number;
  codigoInvitacion: string;
  /** Aparece en el visualizador de salas abiertas y cualquiera con cupo se suma sin código. */
  esPublica: boolean;
  /** Asientos que todavía se pueden ocupar (para el visualizador de salas abiertas). */
  cuposLibres: number;
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

/**
 * HueLudo Real: la variante de 2 dados (numérico + símbolos, ver
 * `inc/funciones/ludoroyal.php`). Mismo esquema de fichas que el Ludo
 * clásico (`FichaLudo`/`TableroLudo` de arriba), sólo cambia qué informa
 * cada tirada.
 */
export type SimboloLudoRoyal = 'corona' | 'pluma' | 'vacio';

export interface TableroLudoRoyal {
  fichas: FichaLudo[];
  jugadores: number;
  dadoPendiente: number | null;
  simboloPendiente: SimboloLudoRoyal | null;
}

export interface JugadaLudoRoyal {
  dadoNumerico: number;
  simbolo: SimboloLudoRoyal;
  ficha: { jugador: number; num: number } | null;
  desde: number | null;
  hasta: number | null;
  capturadas: { jugador: number; num: number }[];
}

export interface JugadasIASalaJugadorRoyal {
  salaJugadorId: number;
  jugadas: JugadaLudoRoyal[];
}

export interface HuePlaySalaTirarRoyal {
  sala: HuePlaySala;
  dadoNumerico: number;
  simbolo: SimboloLudoRoyal;
  movimientosLegales: MovimientoLegalLudo[];
  pasoElTurno: boolean;
  jugadasIA: JugadasIASalaJugadorRoyal[];
}

export interface HuePlaySalaMoverRoyal {
  sala: HuePlaySala;
  jugada: JugadasIASalaJugadorRoyal;
  gane: boolean;
  jugadasIA: JugadasIASalaJugadorRoyal[];
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
  jugadasIA: (JugadasIASalaJugador | JugadaIARummy | JugadaIAScrabble)[];
  estadoRummy: EstadoRummyVisible | null;
  estadoScrabble: EstadoScrabbleVisible | null;
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

/**
 * HueTaTeTi: no hay "desde" — se coloca una ficha nueva, igual que en
 * HueReversi. Sin `volteadas`: acá una jugada nunca voltea nada.
 */
export interface CasillaTaTeTi {
  fila: number;
  col: number;
}

export interface HuePlayTaTeTiVista {
  desafio: HuePlayDesafio;
  movimientosLegales: CasillaTaTeTi[];
}

export interface HuePlayTaTeTiTurno {
  desafio: HuePlayDesafio;
  jugada: CasillaTaTeTi;
  jugadaIA: CasillaTaTeTi | null;
  gane: boolean;
  empate: boolean;
  perdiste: boolean;
  progreso: HuePlayProgreso | null;
}

/**
 * HuePool: el `Tablero` de un desafío es el JSON del `TableroPool` completo
 * (ver `app-movil/src/juego/huepool/motor.ts`) — igual criterio que
 * HueSoccer, así que acá no hace falta un tipo de "vista" aparte, sólo la
 * respuesta de tirar.
 */
export interface HuePlayPoolVista {
  desafio: HuePlayDesafio;
}

export interface HuePlayPoolTiro {
  desafio: HuePlayDesafio;
  embocadas: number[];
  falta: boolean;
  resultado: 'gane' | 'perdiste' | 'empate' | null;
  progreso: HuePlayProgreso | null;
}

/**
 * HueScrabble: tablero 15x15, cada celda `null` (vacía) o `{letra, valor,
 * comodin}` — `valor` ya es el valor final de la letra (0 si es comodín,
 * incluso si la letra que representa vale más en el resto de la partida).
 */
export interface CeldaScrabble {
  letra: string;
  valor: number;
  comodin: boolean;
}

export type TableroScrabbleGrid = (CeldaScrabble | null)[][];

/** Una ficha nueva propuesta en una jugada (nunca las que ya estaban puestas). */
export interface FichaScrabblePropuesta {
  fila: number;
  col: number;
  letra: string;
  esComodin: boolean;
}

export interface PalabraScrabble {
  palabra: string;
  puntos: number;
}

/** Vista redactada del estado de una sala de HueScrabble, propia de quien la pide — nunca el atril ajeno ni la bolsa. */
export interface EstadoScrabbleVisible {
  tablero: TableroScrabbleGrid;
  miAtril: string[];
  cantidadFichasPorJugador: number[];
  fichasEnBolsa: number;
  puntajes: number[];
  primeraJugada: boolean;
  pasesConsecutivos: number;
  jugadores: number;
}

/** Turno de un asiento IA dentro de la cadena de bots de HueScrabble. */
export interface JugadaIAScrabble {
  salaJugadorId: number;
  tipo: 'jugada' | 'intercambio' | 'paso';
  fichasColocadas?: FichaScrabblePropuesta[];
  palabras?: PalabraScrabble[];
  puntos?: number;
}

export interface HuePlayScrabbleJugar {
  sala: HuePlaySala;
  fichasColocadas: FichaScrabblePropuesta[];
  palabras: PalabraScrabble[];
  puntos: number;
  terminada: boolean;
  jugadasIA: JugadaIAScrabble[];
  estadoScrabble: EstadoScrabbleVisible | null;
}

export interface HuePlayScrabblePasar {
  sala: HuePlaySala;
  terminada: boolean;
  jugadasIA: JugadaIAScrabble[];
  estadoScrabble: EstadoScrabbleVisible | null;
}

export interface HuePlayScrabbleIntercambiar {
  sala: HuePlaySala;
  jugadasIA: JugadaIAScrabble[];
  estadoScrabble: EstadoScrabbleVisible | null;
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
