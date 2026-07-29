import { apiGet, apiPost } from './client';
import { appendImageFile } from '../utils/upload';
import {
  Calificacion,
  CalificacionPendienteOrganizador,
  CalificacionPendienteParticipante,
  Equipo,
  Reputacion,
  RolEquipo,
  TipoEquipo,
  Asistencias,
} from '../types/equipo';

export interface DatosEquipo {
  nombre: string;
  /** Código del catálogo: refugio, protectora, veterinaria, ong, gobierno… */
  tipo: string;
  descripcion?: string;
  email?: string;
  telefono?: string;
  sitioWeb?: string;
  direccion?: string;
  zonaDescripcion?: string;
  zonaLat?: number | null;
  zonaLng?: number | null;
  /** URI local de la imagen elegida. Sin esto, el avatar queda como estaba. */
  avatarUri?: string | null;
}

function cuerpoEquipo(d: DatosEquipo): Record<string, unknown> {
  return {
    nombre: d.nombre,
    tipo: d.tipo,
    descripcion: d.descripcion ?? '',
    email: d.email ?? '',
    telefono: d.telefono ?? '',
    sitioWeb: d.sitioWeb ?? '',
    direccion: d.direccion ?? '',
    zonaDescripcion: d.zonaDescripcion ?? '',
    ...(d.zonaLat != null ? { zonaLat: String(d.zonaLat) } : {}),
    ...(d.zonaLng != null ? { zonaLng: String(d.zonaLng) } : {}),
  };
}

/**
 * Con avatar hay que mandar multipart; sin avatar alcanza con el objeto plano.
 *
 * Se decide acá y no en la pantalla porque las dos —alta y edición— tienen el
 * mismo dilema, y en web `FormData` no entiende el shape `{uri,name,type}` de
 * React Native (ver `appendImageFile`).
 */
async function cuerpoConAvatar(d: DatosEquipo): Promise<Record<string, unknown> | FormData> {
  if (!d.avatarUri) return cuerpoEquipo(d);

  const form = new FormData();
  Object.entries(cuerpoEquipo(d)).forEach(([k, v]) => form.append(k, String(v ?? '')));
  await appendImageFile(form, 'avatar', d.avatarUri, 'avatar.jpg');
  return form;
}

export const equiposApi = {
  listar: (params?: { tipo?: string; q?: string }) =>
    apiGet<{ equipos: Equipo[] }>('ajax/equipos/listar.php', params ?? {}, true),

  obtener: (equipoId: number) =>
    apiGet<{ equipo: Equipo }>('ajax/equipos/obtener.php', { equipoId }, true),

  /** Los equipos donde soy miembro activo, más el catálogo de tipos. */
  mis: () =>
    apiGet<{ equipos: Equipo[]; tipos: TipoEquipo[] }>('ajax/equipos/mis_equipos.php', {}, true),

  crear: async (d: DatosEquipo) =>
    apiPost<{ equipo: Equipo }>('ajax/equipos/crear.php', await cuerpoConAvatar(d), true),

  actualizar: async (equipoId: number, d: DatosEquipo) => {
    const cuerpo = await cuerpoConAvatar(d);
    if (cuerpo instanceof FormData) {
      cuerpo.append('equipoId', String(equipoId));
      return apiPost<{ equipo: Equipo }>('ajax/equipos/actualizar.php', cuerpo, true);
    }
    return apiPost<{ equipo: Equipo }>(
      'ajax/equipos/actualizar.php',
      { equipoId, ...cuerpo },
      true
    );
  },

  unirme: (equipoId: number, mensaje?: string) =>
    apiPost<null>('ajax/equipos/unirme.php', { equipoId, mensaje: mensaje ?? '' }, true),

  resolverSolicitud: (equipoMiembroId: number, accion: 'aceptar' | 'rechazar') =>
    apiPost<null>('ajax/equipos/resolver_solicitud.php', { equipoMiembroId, accion }, true),

  cambiarRol: (equipoMiembroId: number, rol: Exclude<RolEquipo, 'dueno'>) =>
    apiPost<null>('ajax/equipos/miembro_actualizar.php', { equipoMiembroId, rol }, true),

  quitarMiembro: (equipoMiembroId: number) =>
    apiPost<null>('ajax/equipos/miembro_actualizar.php', { equipoMiembroId, quitar: '1' }, true),

  salir: (equipoId: number) => apiPost<null>('ajax/equipos/salir.php', { equipoId }, true),
};

export const calificacionesApi = {
  /** Lo que puedo calificar ahora, de los dos lados. */
  pendientes: () =>
    apiGet<{
      comoParticipante: CalificacionPendienteParticipante[];
      comoOrganizador: CalificacionPendienteOrganizador[];
    }>('ajax/calificaciones/pendientes.php', {}, true),

  listar: (paraTipo: 'usuario' | 'equipo', paraId: number) =>
    apiGet<{
      reputacion: Reputacion;
      calificaciones: Calificacion[];
      /** Sólo viene para personas. */
      asistencias?: Asistencias;
    }>('ajax/calificaciones/listar.php', { paraTipo, paraId }, true),

  calificar: (params: {
    campaniaId: number;
    paraTipo: 'usuario' | 'equipo';
    paraId: number;
    puntaje: number;
    comentario?: string;
  }) =>
    apiPost<{ calificacionId: number; reputacion: Reputacion }>(
      'ajax/calificaciones/calificar.php',
      {
        campaniaId: params.campaniaId,
        paraTipo: params.paraTipo,
        paraId: params.paraId,
        puntaje: params.puntaje,
        comentario: params.comentario ?? '',
      },
      true
    ),

  /**
   * Pasar lista. Se manda todo junto porque se usa desde una lista: de a uno
   * sería un request por persona en una campaña de cincuenta.
   */
  asistencia: (campaniaId: number, asistencias: Record<number, 'si' | 'no'>) => {
    const body: Record<string, unknown> = { campaniaId };
    Object.entries(asistencias).forEach(([userId, valor]) => {
      body[`asistencias[${userId}]`] = valor;
    });
    return apiPost<{ actualizadas: number }>('ajax/campanias/asistencia.php', body, true);
  },
};
