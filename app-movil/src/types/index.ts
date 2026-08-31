import { Asistencias, Reputacion, TipoEquipo } from './equipo';

export type Visibilidad = 'publica' | 'privada';

export interface Usuario {
  userId: number;
  email: string;
  nombreCompleto: string;
  username: string | null;
  zonaLat: number | null;
  zonaLng: number | null;
  zonaDescripcion: string | null;
  whatsappNumero: string | null;
  whatsappVisibilidad: Visibilidad;
  avatarPath: string | null;
  /** mtime del archivo; para cache-bust al servir por media/avatar.php */
  avatarBust?: number | null;
  /** Preferencia fija de skin de HueSoccer (fichas/pelota), la misma en todos los partidos. */
  huesoccerSkinFicha: string;
  huesoccerSkinPelota: string;
  onboardingCompleto: boolean;
  /** AAAA-MM-DD, o null en cuentas creadas antes de que el campo existiera. */
  fechaNacimiento: string | null;
  /**
   * Sin fecha cargada la cuenta se trata como menor y no puede chatear
   * (`rh_es_menor()` falla cerrado). Esto habilita la pantalla bloqueante.
   */
  requiereFechaNacimiento: boolean;
  edad: number | null;
  aceptoClausulaAntiCriaderos: boolean;
  rol: string;
  tipoUsuarioCodigo: string | null;
  notificarProximidad: boolean;
  /** Cuenta privada: sólo tus seguidores ven tu contenido. */
  perfilPrivado: boolean;
  /** El "mensaje personal" del MSN, debajo del nombre en el chat. */
  mensajePersonal: string | null;
  /** Código del plan activo (hue_plus / hue_plus_comercial) o null. */
  planCodigo?: string | null;
}

export interface Notificacion {
  notificacionId: number;
  tipo: string;
  titulo: string;
  cuerpo: string;
  /** A dónde lleva tocarla, ej. /(app)/match/12 */
  ruta: string | null;
  actorUserId: number | null;
  /** Si nació de una mascota, se cuenta y se muestra dentro de ella. */
  mascotaId: number | null;
  leida: boolean;
  createdAt: string;
}

export interface SolicitudSeguimiento {
  solicitudId: number;
  createdAt: string;
  usuario: UsuarioResumen & { zonaDescripcion: string | null; avatarBust?: number | null };
}

export type Especie =
  | 'perro'
  | 'gato'
  | 'conejo'
  | 'ave'
  | 'pez'
  | 'hamster'
  | 'cobayo'
  | 'tortuga'
  | 'huron'
  | 'otro';

/** Alias histórico: Cuidados usa el mismo catálogo que el resto. */
export type EspecieCuidado = Especie;
export type CategoriaCuidado =
  | 'alimentacion'
  | 'higiene'
  | 'salud'
  | 'ejercicio'
  | 'convivencia';

export interface CuidadoRecomendacion {
  cuidadoId: number;
  especie: EspecieCuidado;
  categoria: CategoriaCuidado;
  titulo: string;
  resumen: string;
  cuerpo: string;
}

/** Un refugio es un usuario con TipoUsuario 'refugio', no una tabla aparte. */
export interface RefugioResumen extends UsuarioResumen {
  avatarBust?: number | null;
  zonaDescripcion: string | null;
}

/** El otro lado de una charla, con su mensaje personal estilo MSN. */
export interface ChatOtro extends UsuarioResumen {
  avatarBust?: number | null;
  mensajePersonal: string | null;
}

export interface ChatMensaje {
  mensajeId: number;
  userIdEmisor: number;
  texto: string;
  /**
   * El zumbido y el sticker viajan como mensaje para quedar en el historial.
   * En un sticker, `texto` es el id del dibujo (ver src/chat/stickers.tsx),
   * no un mensaje escrito.
   */
  tipo: 'texto' | 'zumbido' | 'sticker';
  createdAt: string;
}

export interface ChatConversacion {
  conversacionId: number;
  ultimoMensajeEn: string | null;
  ultimoTexto: string | null;
  ultimoTipo: 'texto' | 'zumbido' | 'sticker' | null;
  noLeidos: number;
  otro: ChatOtro;
}

export interface ChatDetalle {
  conversacionId: number;
  /** Para el que recibe puede ser una solicitud aunque para el otro sea activa. */
  estado: 'activa' | 'solicitud' | 'archivada';
  otro: ChatOtro | null;
  mensajes: ChatMensaje[];
}

/** Los badges del riel de flotantes; salen todos de un solo endpoint. */
export interface Contadores {
  notificaciones: number;
  mascotas: number;
  mensajes: number;
  solicitudesChat: number;
  solicitudesSeguir: number;
}

export interface TipoUsuarioCatalogoItem {
  tipoUsuarioId: number;
  codigo: string;
  nombre: string;
}

export interface NoticiaExterna {
  noticiaExternaId: number;
  fuente: string;
  urlOriginal: string;
  titulo: string;
  resumen: string | null;
  imagenUrl: string | null;
  publicadoEn: string | null;
}

export interface VerificacionEstado {
  estadoRevision: 'sin_enviar' | 'pendiente' | 'aprobado' | 'rechazado';
  motivoRechazo: string | null;
  tieneDniFrente: boolean;
  tieneDniDorso: boolean;
  tieneSelfie: boolean;
  autoScore?: number | null;
  faceMatchScore?: number | null;
  autoMetodo?: string | null;
  kycEstado?: string | null;
  problemas?: string[];
  checks?: {
    esDniFrente: boolean;
    esDniDorso: boolean;
    documentoLegible: boolean;
    selfieTieneRostro: boolean;
    faceMatchScore: number | null;
  } | null;
}

export type ReporteTipo = 'mejora' | 'falla';

export type Sexo = 'macho' | 'hembra';

export interface RazaCatalogoItem {
  razaId: number;
  nombre: string;
}

export interface MascotaFoto {
  mascotaFotoId: number;
  path: string;
  orden: number;
}

export interface Mascota {
  mascotaId: number;
  userId: number;
  nombre: string;
  sexo: Sexo;
  edadAnios: number | null;
  edadMeses: number | null;
  especie: Especie;
  razaId: number | null;
  razaTexto: string | null;
  raza: string | null;
  descripcion: string | null;
  modoBanner?: 'portada' | 'banner';
  bannerPath?: string | null;
  bannerFocusY?: number;
  carnetDisponible: boolean;
  carnetVisibilidad: Visibilidad;
  tengoAccesoCarnet: boolean;
  esDueno: boolean;
  disponibleParaMatch: boolean;
  estado: 'A' | 'I';
  createdAt: string;
  fotos?: MascotaFoto[];
}

export interface UsuarioResumen {
  userId: number;
  username: string | null;
  nombreCompleto: string;
  avatarPath: string | null;
  planCodigo?: string | null;
}

export interface PerfilPublico {
  userId: number;
  username: string | null;
  nombreCompleto: string;
  zonaDescripcion: string | null;
  avatarPath: string | null;
  avatarBust?: number | null;
  whatsappNumero: string | null;
  whatsappVisibilidad: Visibilidad;
  totalSeguidores: number;
  totalSeguidos: number;
  siguiendoYo: boolean;
  esUnoMismo: boolean;
  planCodigo?: string | null;
}

export interface BusquedaResultado {
  usuarios: UsuarioResumen[];
  mascotas: Mascota[];
}

export type ReaccionTipo =
  | 'like'
  | 'me_divierte'
  | 'amor'
  | 'asombro'
  | 'triste'
  | 'abrazo'
  | 'huella'
  | 'apoyo'
  | 'guau'
  | 'michi';

export interface PostFoto {
  postFotoId: number;
  path: string;
  orden: number;
}

export interface PostConteos {
  like: number;
  meDivierte: number;
  amor: number;
  asombro: number;
  triste: number;
  abrazo: number;
  huella: number;
  apoyo: number;
  guau: number;
  michi: number;
}

export interface Post {
  postId: number;
  autor: UsuarioResumen | null;
  autorSeguido: boolean;
  texto: string | null;
  fotos: PostFoto[];
  videoPath: string | null;
  duracionSegundos: number | null;
  conteos: PostConteos;
  miReaccion: ReaccionTipo | null;
  esDueno: boolean;
  estado: 'A' | 'I';
  createdAt: string;
  origen?: 'seguido' | 'recomendado';
}

export type TipoMediaHistoria = 'foto' | 'video';

export interface Historia {
  historiaId: number;
  userId: number;
  tipoMedia: TipoMediaHistoria;
  mediaPath: string;
  duracionSegundos: number | null;
  overlay?: {
    filter?: string;
    texts?: Array<{
      id: string;
      text: string;
      x: number;
      y: number;
      color: string;
      scale: number;
      rotation?: number;
      fontId?: string;
    }>;
    paths?: Array<{ id: string; color: string; width: number; points: { x: number; y: number }[] }>;
    stickers?: Array<{ id: string; emoji: string; x: number; y: number; scale: number; rotation?: number }>;
    interactivo?:
      | { kind: 'encuesta'; x: number; y: number; pregunta: string; opcionA: string; opcionB: string }
      | { kind: 'pregunta'; x: number; y: number; texto: string }
      | null;
  } | null;
  /** Recorte no destructivo: el reproductor arranca y corta acá. */
  recorteInicioSeg: number | null;
  recorteFinSeg: number | null;
  sinAudio: boolean;
  /** 0.5 = cámara lenta, 1 = normal, 2 = cámara rápida. También no destructivo. */
  velocidad: number;
  cadena: HistoriaCadena | null;
  encuesta: HistoriaEncuesta | null;
  pregunta: HistoriaPreguntaBox | null;
  esAutor: boolean;
  /** Sólo llega si sos el autor. */
  totalVistas: number | null;
  createdAt: string;
  expiraEn: string;
  vista: boolean;
  /** Sólo en el detalle de una cadena, donde las historias son de varios. */
  autor?: UsuarioResumen;
}

/** Datos de la cadena vistos desde una historia, con su posición en el hilo. */
export interface HistoriaCadena {
  cadenaId: number;
  tema: string;
  descripcion: string | null;
  /** "3º de 7" — se calcula al leer, así que se recorre solo al vencer una. */
  posicion: number;
  total: number;
}

export interface HistoriaEncuesta {
  encuestaId: number;
  pregunta: string;
  opcionA: string;
  opcionB: string;
  votosA: number;
  votosB: number;
  miVoto: 'A' | 'B' | null;
}

export interface HistoriaPreguntaBox {
  preguntaId: number;
  texto: string;
  totalRespuestas: number;
}

export interface HistoriaVistaItem extends UsuarioResumen {
  vistaEn: string;
}

export interface HistoriaUsuarioResumen {
  autor: UsuarioResumen;
  todasVistas: boolean;
  historias: Historia[];
}

/**
 * Cadena de historias: alguien propone un tema y el resto lo continúa.
 * La cadena no expira aunque sus historias sí — por eso `totalHistorias`
 * cuenta sólo las vigentes y puede bajar con el tiempo.
 */
export interface Cadena {
  cadenaId: number;
  tema: string;
  descripcion: string | null;
  creador: UsuarioResumen | null;
  totalParticipantes: number;
  totalHistorias: number;
  participantesPreview: UsuarioResumen[];
  yaParticipa: boolean;
  ultimaActividad: string | null;
  createdAt: string;
}

export interface CadenaDetalle {
  cadena: Cadena;
  participantes: UsuarioResumen[];
  historias: Historia[];
}

export type TipoPregunta = 'texto' | 'si_no' | 'opcion_multiple';
export type EstadoAdopcion = 'disponible' | 'en_proceso' | 'adoptado';

export interface AdopcionPreguntaOpcion {
  adopcionPreguntaOpcionId: number;
  texto: string;
  orden: number;
}

export interface AdopcionPregunta {
  adopcionPreguntaId: number;
  tipo: TipoPregunta;
  texto: string;
  orden: number;
  opciones?: AdopcionPreguntaOpcion[];
}

export interface AdopcionFoto {
  adopcionFotoId: number;
  path: string;
  orden: number;
}

export interface Adopcion {
  adopcionId: number;
  autor: UsuarioResumen;
  whatsappNumero: string | null;
  zonaDescripcion: string | null;
  nombre: string;
  sexo: Sexo;
  edadAnios: number | null;
  edadMeses: number | null;
  especie: Especie;
  razaId: number | null;
  razaTexto: string | null;
  raza: string | null;
  descripcion: string | null;
  fotos: AdopcionFoto[];
  estadoAdopcion: EstadoAdopcion;
  esFavorito: boolean;
  esDueno: boolean;
  estado: 'A' | 'I';
  createdAt: string;
  preguntas?: AdopcionPregunta[];
  totalPostulaciones?: number;
  editable?: boolean;
  motivoNoEditable?: string | null;
}

/** Pregunta nueva en el builder de creación, antes de tener un ID real. */
export interface PreguntaBorrador {
  tipo: TipoPregunta;
  texto: string;
  opciones: string[];
}

/** Respuesta que arma el adoptante en el formulario de postulación. */
export interface RespuestaBorrador {
  preguntaId: number;
  texto?: string;
  opcionId?: number;
}

export interface AdopcionRespuestaPublica {
  preguntaTexto: string;
  preguntaTipo: TipoPregunta;
  respuesta: string | null;
}

export interface AdopcionPostulacionRecibida {
  adopcionPostulacionId: number;
  adoptante: UsuarioResumen;
  estadoRevision: string;
  createdAt: string;
  respuestas: AdopcionRespuestaPublica[];
}

export interface AdopcionPostulacionPropia {
  adopcionPostulacionId: number;
  estadoRevision: string;
  createdAt: string;
  adopcionId: number;
  nombre: string;
  especie: Especie;
  estadoAdopcion: EstadoAdopcion;
  fotos: AdopcionFoto[];
}

export type TipoCampania = 'castracion' | 'vacunacion';

export interface Campania {
  campaniaId: number;
  autor: UsuarioResumen;
  tipo: TipoCampania;
  titulo: string;
  descripcion: string | null;
  fechaDesde: string;
  fechaHasta: string | null;
  /** Calle y numero del lugar del evento; puede faltar (una plaza, un parque). */
  direccion: string | null;
  zonaDescripcion: string;
  zonaLat: number;
  zonaLng: number;
  requiereInscripcion: boolean;
  cupoMaximo: number | null;
  esDueno: boolean;
  estado: 'A' | 'I';
  createdAt: string;
  totalInscriptos?: number;
  /** null = cupo ilimitado. */
  cupoDisponible?: number | null;
  estoyInscripto?: boolean;
  /** Lo que hay que llevar, avisos de último momento, etc. */
  mensajeAviso?: string | null;
  /** Horas antes del comienzo hasta las que se admite la baja. null = siempre. */
  bajaLimiteHoras?: number | null;
  preguntas?: CampaniaPregunta[];
  miInscripcion?: MiInscripcionCampania | null;
  /** El equipo que la organiza, o null si la organiza una persona. */
  equipo?: CampaniaEquipo | null;
  /** A quién se califica al terminar: el equipo o la persona que la cargó. */
  organizador?: {
    tipo: 'usuario' | 'equipo';
    id: number;
    reputacion: Reputacion;
  };
  termino?: boolean;
  /** Los admins del equipo administran la campaña aunque no la hayan cargado. */
  puedoAdministrar?: boolean;
}

/** Resumen del equipo organizador, tal como viaja dentro de una campaña. */
export interface CampaniaEquipo {
  equipoId: number;
  nombre: string;
  avatarPath: string | null;
  verificado: boolean;
  tipo: TipoEquipo;
}

export type EstadoInscripcion = 'confirmada' | 'lista_espera' | 'cancelada' | 'ausente';

export interface MiInscripcionCampania {
  campaniaInscripcionId: number;
  estado: EstadoInscripcion;
  posicion: number;
  puedeDarseBaja: boolean;
}

export type TipoPreguntaCampania = 'texto' | 'si_no' | 'opcion_multiple';

export interface CampaniaPreguntaOpcion {
  campaniaPreguntaOpcionId: number;
  texto: string;
}

export interface CampaniaPregunta {
  campaniaPreguntaId: number;
  tipo: TipoPreguntaCampania;
  texto: string;
  obligatoria: boolean;
  orden: number;
  opciones: CampaniaPreguntaOpcion[];
}

/** Una respuesta del formulario, tal como la manda la pantalla. */
export interface RespuestaCampania {
  campaniaPreguntaId: number;
  texto?: string;
  campaniaPreguntaOpcionId?: number;
}

export interface CampaniaInscripcionAdmin {
  campaniaInscripcionId: number;
  estado: EstadoInscripcion;
  posicion: number;
  createdAt: string;
  canceladaEn: string | null;
  avisoAusenciaEn: string | null;
  notaAusencia: string | null;
  usuario: UsuarioResumen & { whatsappNumero: string | null; avatarBust?: number | null };
  respuestas: { pregunta: string; respuesta: string | null }[];
  /** null = todavia no se paso lista. No es lo mismo que "no vino". */
  asistio: 'si' | 'no' | null;
  reputacion: Reputacion;
  asistencias: Asistencias;
  /** Lo que el organizador ya le puso, si le puso algo. */
  miCalificacion: { puntaje: number; comentario: string | null } | null;
}

export interface CampaniaPanel {
  campania: {
    campaniaId: number;
    titulo: string;
    tipo: TipoCampania;
    fechaDesde: string;
    fechaHasta: string | null;
    mensajeAviso: string | null;
    cupoMaximo: number | null;
    bajaLimiteHoras: number | null;
    requiereInscripcion: boolean;
  };
  resumen: {
    confirmadas: number;
    listaEspera: number;
    ausentes: number;
    canceladas: number;
    cupoMaximo: number | null;
    lugaresLibres: number | null;
  };
  preguntas: CampaniaPregunta[];
  inscripciones: CampaniaInscripcionAdmin[];
}

export interface CampaniaInscripcionPropia {
  campaniaInscripcionId: number;
  createdAt: string;
  campaniaId: number;
  tipo: TipoCampania;
  titulo: string;
  fechaDesde: string;
  fechaHasta: string | null;
  zonaDescripcion: string;
}

export interface CampaniaInscripto {
  campaniaInscripcionId: number;
  createdAt: string;
  usuario: UsuarioResumen;
}

export type TipoPerdido = 'perdido' | 'encontrado';
export type EstadoPerdido = 'activo' | 'reencontrado';

export interface PerdidoFoto {
  perdidoFotoId: number;
  path: string;
  orden: number;
}

export interface Perdido {
  perdidoId: number;
  tipo: TipoPerdido;
  autor: UsuarioResumen;
  whatsappNumero: string | null;
  mascotaId: number | null;
  nombre: string;
  sexo: Sexo;
  especie: Especie;
  razaId: number | null;
  razaTexto: string | null;
  raza: string | null;
  descripcion: string | null;
  fotos: PerdidoFoto[];
  ultimoLugarDescripcion: string;
  ultimoLugarLat: number;
  ultimoLugarLng: number;
  fechaSuceso: string;
  estadoPerdido: EstadoPerdido;
  esDueno: boolean;
  estado: 'A' | 'I';
  createdAt: string;
  /** Sólo viene si esDueno: false cuando ya está marcado como reencontrado. */
  editable?: boolean;
  motivoNoEditable?: string | null;
}

export type TipoTransito = 'necesito' | 'ofrezco';
/** Lo marca el dueño a mano; 'acordado' bloquea la edición. */
export type EstadoTransito = 'disponible' | 'acordado';

export interface TransitoFoto {
  transitoFotoId: number;
  path: string;
  orden: number;
}

export interface Transito {
  transitoId: number;
  tipo: TipoTransito;
  autor: UsuarioResumen;
  whatsappNumero: string | null;
  mascotaId: number | null;
  nombre: string | null;
  sexo: Sexo | null;
  especie: Especie | null;
  razaId: number | null;
  razaTexto: string | null;
  raza: string | null;
  descripcion: string | null;
  duracionDias: number | null;
  fotos: TransitoFoto[];
  zonaDescripcion: string;
  zonaLat: number;
  zonaLng: number;
  distanciaKm: number | null;
  esDueno: boolean;
  estadoTransito: EstadoTransito;
  estado: 'A' | 'I';
  createdAt: string;
  /** Sólo viene si esDueno: false cuando está marcado como acordado. */
  editable?: boolean;
  motivoNoEditable?: string | null;
}

export type TipoDonacion = 'necesito' | 'ofrezco';
/** Lo marca el dueño a mano; 'acordado' bloquea la edición. */
export type EstadoDonacion = 'disponible' | 'acordado';
export type CategoriaDonacion = 'alimento' | 'insumo' | 'ropa';

export interface DonacionFoto {
  donacionFotoId: number;
  path: string;
  orden: number;
}

export interface Donacion {
  donacionId: number;
  tipo: TipoDonacion;
  categoria: CategoriaDonacion;
  autor: UsuarioResumen;
  whatsappNumero: string | null;
  descripcion: string;
  especie: Especie | null;
  fotos: DonacionFoto[];
  zonaDescripcion: string;
  zonaLat: number;
  zonaLng: number;
  distanciaKm: number | null;
  esDueno: boolean;
  estadoDonacion: EstadoDonacion;
  estado: 'A' | 'I';
  createdAt: string;
  /** Sólo viene si esDueno: false cuando está marcada como acordada. */
  editable?: boolean;
  motivoNoEditable?: string | null;
}

export interface VeterinariaFoto {
  veterinariaFotoId: number;
  path: string;
  orden: number;
}

export interface Veterinaria {
  veterinariaId: number;
  autorUserId: number;
  nombre: string;
  descripcion: string | null;
  telefono: string | null;
  whatsappNumero: string | null;
  horario: string | null;
  fotos: VeterinariaFoto[];
  /** Calle y número. Los lugares públicos sí la muestran exacta. */
  direccion: string | null;
  zonaDescripcion: string;
  zonaLat: number;
  zonaLng: number;
  distanciaKm: number | null;
  esDueno: boolean;
  estado: 'A' | 'I';
  createdAt: string;
}

export type MatchDireccion = 'like' | 'pass';

export interface MatchCandidato extends Mascota {
  distanciaKm: number | null;
}

export interface MatchMensaje {
  mensajeId: number;
  matchId: number;
  userIdEmisor: number;
  texto: string;
  esMio: boolean;
  createdAt: string;
}

export interface MascotaMatch {
  matchId: number;
  mascota: Mascota | null;
  ultimoMensaje: MatchMensaje | null;
  miConsentimiento: boolean;
  whatsappRevelado: boolean;
  estado: 'A' | 'I';
  createdAt: string;
}

export type SuscripcionMetodo = 'mercadopago' | 'manual';

export interface SuscripcionEstado {
  planCodigo: string | null;
  planNombre?: string | null;
  sinComision?: boolean;
  activa: boolean;
  pagaHasta: string | null;
  metodoActivo: SuscripcionMetodo | null;
  ultimoPago: string | null;
}

export interface SuscripcionPlanItem {
  itemId: number;
  texto: string;
  orden: number;
  estado?: string;
}

export interface SuscripcionPlan {
  planId: number;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  montoMensual: number;
  orden: number;
  sinComision: boolean;
  estado: string;
  items: SuscripcionPlanItem[];
}

export type TipoListado = 'producto' | 'servicio';

export interface ProductoCategoriaItem {
  categoriaId: number;
  codigo: string;
  nombre: string;
}

export interface ProductoFoto {
  productoFotoId: number;
  path: string;
  orden: number;
}

export interface Producto {
  productoId: number;
  tipoListado: TipoListado;
  /** Suelto además del objeto `categoria`, para preseleccionar el picker al editar. */
  categoriaId: number;
  categoria: ProductoCategoriaItem | null;
  autor: UsuarioResumen;
  whatsappNumero: string | null;
  nombre: string;
  descripcion: string | null;
  precio: number;
  cantidad: number;
  especie: Especie | null;
  fotos: ProductoFoto[];
  zonaDescripcion: string;
  zonaLat: number;
  zonaLng: number;
  distanciaKm: number | null;
  esDueno: boolean;
  esFavorito: boolean;
  estado: 'A' | 'I';
  createdAt: string;
  /**
   * Sólo viene si esDueno. Hoy Productos nunca se bloquea: los pedidos guardan
   * su propia copia del nombre y el precio, así que editar no los afecta.
   */
  editable?: boolean;
  motivoNoEditable?: string | null;
}

export interface CarritoItemDto {
  carritoItemId: number;
  producto: Producto;
  cantidad: number;
  subtotal: number;
}

export interface CarritoGrupo {
  vendedorUserId: number;
  items: CarritoItemDto[];
  subtotal: number;
}

export interface CarritoPublico {
  grupos: CarritoGrupo[];
  total: number;
}

export type PedidoMetodoPago = 'mercadopago' | 'coordinar';
export type PedidoEstado = 'pendiente' | 'pagado' | 'coordinando' | 'entregado' | 'cancelado';

export interface PedidoItem {
  pedidoItemId: number;
  productoId: number;
  nombreProducto: string;
  precioUnitario: number;
  cantidad: number;
}

export interface Pedido {
  pedidoId: number;
  numeroComprobante: string;
  compradorUserId: number;
  comprador: UsuarioResumen;
  vendedor: UsuarioResumen;
  vendedorWhatsapp: string | null;
  items: PedidoItem[];
  montoProductos: number;
  porcentajeComision: number;
  montoComision: number;
  montoVendedor: number;
  metodoPago: PedidoMetodoPago;
  estado: PedidoEstado;
  comprobanteEnviadoEn: string | null;
  esComprador: boolean;
  esVendedor: boolean;
  createdAt: string;
  initPoint?: string | null;
}

export interface PedidoListaResultado {
  pedidos: Pedido[];
  nextCursor: number | null;
}

export interface MpVendedorEstado {
  conectado: boolean;
  mpEmail: string | null;
  mpNombre?: string | null;
  mpTelefono?: string | null;
  /** true si el servidor tiene Client ID/Secret/redirect listos para OAuth. */
  marketplaceListo?: boolean;
}

export type JuegoAnimo = 'feliz' | 'bien' | 'aburrido' | 'decaido';
export type JuegoAccion = 'alimentar' | 'jugar' | 'banar' | 'dormir';

export interface JuegoStats {
  hambre: number;
  felicidad: number;
  energia: number;
  higiene: number;
}

/** Segundos que faltan para poder repetir cada acción (0 = disponible). */
export type JuegoCooldowns = Record<JuegoAccion, number>;

export interface MascotaJuego {
  mascotaId: number;
  nombre: string;
  especie: Especie;
  /** Raza escrita por el usuario; define el pelaje del dibujo. */
  raza: string | null;
  avatarPath: string | null;
  avatarEsGenerado: boolean;
  stats: JuegoStats;
  animo: JuegoAnimo;
  cooldowns: JuegoCooldowns;
  nivel: number;
  experiencia: number;
  experienciaNivel: number;
  experienciaPorNivel: number;
  rachaDias: number;
}

/** Por qué no se puede generar el avatar IA, si es que no se puede. */
export type JuegoAvatarMotivo = 'no_configurado' | 'sin_foto' | 'limite_usuario' | 'limite_global';

export interface JuegoAvatarEstado {
  disponible: boolean;
  restantesHoy: number;
  tieneFotoOrigen: boolean;
  tieneAvatarGenerado: boolean;
  motivo: JuegoAvatarMotivo | null;
}

/** Fila del selector: no incluye cooldowns porque todavía no se entró a jugar. */
export interface MascotaJuegoResumen {
  mascotaId: number;
  nombre: string;
  especie: Especie;
  avatarPath: string | null;
  stats: JuegoStats;
  animo: JuegoAnimo;
  nivel: number;
  rachaDias: number;
  empezado: boolean;
}

// ---------------------------------------------------------------------------
// Panel de moderación (solo para usuarios con rol 'admin')
// ---------------------------------------------------------------------------

export interface AdminResumen {
  verificacionesPendientes: number;
  denunciasPendientes: number;
  reportesPendientes: number;
}

/** Datos del usuario tal como los ve un moderador (incluye email y estado). */
export interface AdminUsuario {
  userId: number;
  username: string | null;
  nombreCompleto: string;
  email: string;
  avatarPath: string | null;
  estado: 'A' | 'I';
  rol: string;
}

export type VerificacionRevisionEstado = 'pendiente' | 'aprobado' | 'rechazado';
export type VerificacionArchivoTipo = 'dniFrente' | 'dniDorso' | 'selfie';

export interface VerificacionPendiente {
  verificacionId: number;
  userId: number;
  usuario: AdminUsuario | null;
  estadoRevision: VerificacionRevisionEstado;
  motivoRechazo: string | null;
  tieneDniFrente: boolean;
  tieneDniDorso: boolean;
  tieneSelfie: boolean;
  /** Resultado del análisis automático; null si no llegó a correr. */
  autoScore: number | null;
  faceMatchScore: number | null;
  autoMetodo: string | null;
  autoDetalle: string | null;
  dniNumeroExtraido: string | null;
  nombreExtraido: string | null;
  kycEstado: string | null;
  revisadoPor: number | null;
  revisadoEn: string | null;
  createdAt: string | null;
}

export type DenunciaEstado = 'pendiente' | 'revisada' | 'desestimada';

/** Qué contenido se denunció; null si la denuncia es contra el usuario. */
export type DenunciaContenidoTipo =
  | 'publicacion'
  | 'historia'
  | 'adopcion'
  | 'campania'
  | 'perdido'
  | 'transito'
  | 'donacion'
  | 'veterinaria'
  | 'producto';

export interface DenunciaContenido {
  tipo: DenunciaContenidoTipo;
  id: number;
}

export interface DenunciaPendiente {
  denunciaId: number;
  motivo: string;
  detalle: string | null;
  estadoRevision: DenunciaEstado;
  contenido: DenunciaContenido | null;
  denunciante: AdminUsuario | null;
  denunciado: AdminUsuario | null;
  notaAdmin: string | null;
  resueltoEn: string | null;
  createdAt: string;
}

export type ReporteEstado = 'pendiente' | 'resuelto' | 'descartado';

export interface ReportePendiente {
  reporteId: number;
  tipo: ReporteTipo;
  detalle: string;
  pantallaOrigen: string | null;
  estadoRevision: ReporteEstado;
  usuario: AdminUsuario | null;
  notaAdmin: string | null;
  resueltoEn: string | null;
  createdAt: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T | null;
  /**
   * HTTP de la respuesta. Se expone para los casos donde el código importa y
   * no alcanza con success/message — ej. un 402 que tiene que llevar a la
   * pantalla de planes en vez de mostrar un cartel de error.
   */
  status?: number;
}
