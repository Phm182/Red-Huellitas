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
