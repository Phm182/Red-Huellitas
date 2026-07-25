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
  onboardingCompleto: boolean;
  aceptoClausulaAntiCriaderos: boolean;
  rol: string;
  tipoUsuarioCodigo: string | null;
  notificarProximidad: boolean;
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
}

export type ReporteTipo = 'mejora' | 'falla';

export type Especie = 'perro' | 'gato' | 'otro';
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
}

export interface PerfilPublico {
  userId: number;
  username: string | null;
  nombreCompleto: string;
  zonaDescripcion: string | null;
  avatarPath: string | null;
  whatsappNumero: string | null;
  whatsappVisibilidad: Visibilidad;
  totalSeguidores: number;
  totalSeguidos: number;
  siguiendoYo: boolean;
  esUnoMismo: boolean;
}

export interface BusquedaResultado {
  usuarios: UsuarioResumen[];
  mascotas: Mascota[];
}

export type ReaccionTipo = 'like' | 'me_divierte';

export interface PostFoto {
  postFotoId: number;
  path: string;
  orden: number;
}

export interface PostConteos {
  like: number;
  meDivierte: number;
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
  createdAt: string;
  expiraEn: string;
  vista: boolean;
}

export interface HistoriaUsuarioResumen {
  autor: UsuarioResumen;
  todasVistas: boolean;
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
  zonaDescripcion: string;
  zonaLat: number;
  zonaLng: number;
  requiereInscripcion: boolean;
  cupoMaximo: number | null;
  esDueno: boolean;
  estado: 'A' | 'I';
  createdAt: string;
  totalInscriptos?: number;
  cupoDisponible?: number | null;
  estoyInscripto?: boolean;
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
}

export type TipoTransito = 'necesito' | 'ofrezco';

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
  estado: 'A' | 'I';
  createdAt: string;
}

export type TipoDonacion = 'necesito' | 'ofrezco';
export type CategoriaDonacion = 'alimento' | 'insumo';

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
  estado: 'A' | 'I';
  createdAt: string;
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
  activa: boolean;
  pagaHasta: string | null;
  metodoActivo: SuscripcionMetodo | null;
  ultimoPago: string | null;
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
}
