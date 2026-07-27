import { apiGet, apiPost } from './client';
import { Contadores, Notificacion, SolicitudSeguimiento } from '../types';

export const notificacionesApi = {
  listar: (cursor?: number | null, mascotaId?: number) =>
    apiGet<{ notificaciones: Notificacion[]; nextCursor: number | null }>(
      'ajax/notificaciones/listar.php',
      {
        ...(cursor ? { cursor } : {}),
        ...(mascotaId ? { mascotaId } : {}),
      },
      true
    ),

  /** Los tres badges del riel de flotantes, en una sola request. */
  contadores: () => apiGet<Contadores>('ajax/notificaciones/contadores.php', undefined, true),

  marcarLeidas: (params?: { mascotaId?: number; notificacionId?: number }) =>
    apiPost<Contadores>('ajax/notificaciones/marcar_leidas.php', { ...(params ?? {}) }, true),
};

export const solicitudesApi = {
  listar: (cursor?: number | null) =>
    apiGet<{ solicitudes: SolicitudSeguimiento[]; nextCursor: number | null }>(
      'ajax/seguimiento/solicitudes_listar.php',
      cursor ? { cursor } : undefined,
      true
    ),

  resolver: (solicitudId: number, accion: 'aceptar' | 'rechazar') =>
    apiPost<{ estado: string }>('ajax/seguimiento/solicitud_resolver.php', { solicitudId, accion }, true),
};

export const privacidadApi = {
  guardar: (perfilPrivado: boolean) =>
    apiPost<{ perfilPrivado: boolean; solicitudesPendientes: number }>(
      'ajax/perfil/privacidad_guardar.php',
      { perfilPrivado: perfilPrivado ? '1' : '0' },
      true
    ),
};
