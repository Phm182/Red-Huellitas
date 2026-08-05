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
  ranking: HuePlayRankingItem[];
  miPuesto: number;
  desafiosPendientes: number;
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
  aciertos: number;
  total: number;
  puntos: number;
  detalle: TriviaDetalle[];
  progreso: HuePlayProgreso;
  esRecord?: boolean;
  desafio?: HuePlayDesafio;
}
