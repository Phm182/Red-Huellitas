import { UsuarioResumen } from './index';

/**
 * Un equipo es una organización con miembros: refugio, protectora,
 * veterinaria, ONG u organismo público. No es un tipo de cuenta — la persona
 * conserva su usuario y pertenece al equipo.
 */

export type RolEquipo = 'dueno' | 'admin' | 'miembro';
export type EstadoMembresia = 'pendiente' | 'activo' | 'rechazado' | 'salio';

/** Lo que define la insignia. Ícono y color vienen del catálogo del backend. */
export interface TipoEquipo {
  codigo: string;
  nombre: string;
  /** Nombre de ícono de Ionicons. */
  icono: string;
  color: string;
}

export interface Reputacion {
  total: number;
  /** null = todavía nadie lo calificó. No es lo mismo que cero estrellas. */
  promedio: number | null;
}

export interface Asistencias {
  asistio: number;
  /** Se anotó, no avisó y no fue: el número que mira un organizador. */
  faltasSinAviso: number;
  faltasConAviso: number;
  avisosDeAusencia: number;
}

export interface EquipoMiembro {
  equipoMiembroId: number;
  rol: RolEquipo;
  estado: EstadoMembresia;
  mensaje: string | null;
  desde: string;
  usuario: UsuarioResumen;
}

export interface EquipoCampaniaResumen {
  campaniaId: number;
  tipo: string;
  titulo: string;
  fechaDesde: string;
  fechaHasta: string | null;
  zonaDescripcion: string;
}

export interface Equipo {
  equipoId: number;
  nombre: string;
  descripcion: string | null;
  avatarPath: string | null;
  email: string | null;
  telefono: string | null;
  sitioWeb: string | null;
  tipo: TipoEquipo;
  direccion: string | null;
  zonaDescripcion: string | null;
  zonaLat: number | null;
  zonaLng: number | null;
  distanciaKm: number | null;
  /** Lo pone moderación; no es autoservicio. */
  verificado: boolean;
  totalMiembros: number;
  /** Rol del que mira, o null si no es miembro activo. */
  miRol: RolEquipo | null;
  miEstadoMembresia: EstadoMembresia | null;
  puedoAdministrar: boolean;
  estado: 'A' | 'I';
  createdAt: string;
  reputacion?: Reputacion;
  miembros?: EquipoMiembro[];
  solicitudesPendientes?: EquipoMiembro[];
  campanias?: EquipoCampaniaResumen[];
}

/** Quién califica o es calificado: una persona o un equipo. */
export interface CalificacionAutor {
  tipo: 'usuario' | 'equipo';
  id: number;
  nombre: string;
  username: string | null;
  avatarPath: string | null;
}

export interface Calificacion {
  calificacionId: number;
  contexto: 'campania';
  contextoId: number;
  autor: CalificacionAutor | null;
  puntaje: number;
  comentario: string | null;
  createdAt: string;
}

/** Una campaña terminada a la que fui y todavía no califiqué. */
export interface CalificacionPendienteParticipante {
  campaniaId: number;
  titulo: string;
  tipo: string;
  fecha: string;
  organizador: CalificacionAutor;
}

/** Una campaña que organicé con gente sin calificar o sin pasar lista. */
export interface CalificacionPendienteOrganizador {
  campaniaId: number;
  titulo: string;
  tipo: string;
  fecha: string;
  totalParticipantes: number;
  sinAsistencia: number;
  sinCalificar: number;
}
