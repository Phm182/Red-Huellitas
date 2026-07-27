import { apiGet, apiPost, apiBaseUrl } from './client';
import {
  AdminResumen,
  DenunciaEstado,
  DenunciaPendiente,
  ReportePendiente,
  ReporteEstado,
  ReporteTipo,
  VerificacionArchivoTipo,
  VerificacionRevisionEstado,
  VerificacionPendiente,
} from '../types';

interface ListaParams {
  cursor?: number | null;
  limit?: number;
}

function query(extra: Record<string, unknown>, { cursor, limit = 20 }: ListaParams = {}) {
  return {
    ...extra,
    ...(cursor ? { cursor } : {}),
    limit,
  };
}

export const adminApi = {
  resumen: () => apiGet<AdminResumen>('ajax/admin/resumen.php', undefined, true),

  verificacionesListar: (estado: VerificacionRevisionEstado, params?: ListaParams) =>
    apiGet<{ verificaciones: VerificacionPendiente[]; nextCursor: number | null }>(
      'ajax/admin/verificaciones_listar.php',
      query({ estado }, params),
      true
    ),

  /**
   * URL cruda de una de las imágenes de verificación. Necesita header
   * Authorization, así que no sirve para <Image source={{uri}}> directo:
   * hay que pasarla por fetchAuthenticatedImageUri().
   */
  verificacionArchivoUrl: (userId: number, tipo: VerificacionArchivoTipo) =>
    `${apiBaseUrl()}/ajax/admin/verificacion_archivo.php?userId=${userId}&tipo=${tipo}`,

  verificacionResolver: (userId: number, estado: 'aprobado' | 'rechazado', motivo?: string) =>
    apiPost<{ userId: number; estadoRevision: VerificacionRevisionEstado }>(
      'ajax/admin/verificacion_resolver.php',
      { userId, estado, ...(motivo ? { motivo } : {}) },
      true
    ),

  denunciasListar: (estado: DenunciaEstado, params?: ListaParams) =>
    apiGet<{ denuncias: DenunciaPendiente[]; nextCursor: number | null }>(
      'ajax/admin/denuncias_listar.php',
      query({ estado }, params),
      true
    ),

  denunciaResolver: (
    denunciaId: number,
    estado: 'revisada' | 'desestimada',
    nota?: string,
    accion?: 'baja_contenido' | 'baja_y_advertir' | 'advertir'
  ) =>
    apiPost<{
      denunciaId: number;
      estadoRevision: DenunciaEstado;
      contenidoBajado?: boolean;
      avisoEnviado?: boolean;
    }>('ajax/admin/denuncia_resolver.php', {
      denunciaId,
      estado,
      ...(nota ? { nota } : {}),
      ...(accion ? { accion } : {}),
    }, true),

  reportesListar: (estado: ReporteEstado, tipo: ReporteTipo | null, params?: ListaParams) =>
    apiGet<{ reportes: ReportePendiente[]; nextCursor: number | null }>(
      'ajax/admin/reportes_listar.php',
      query({ estado, ...(tipo ? { tipo } : {}) }, params),
      true
    ),

  reporteResolver: (reporteId: number, estado: 'resuelto' | 'descartado', nota?: string) =>
    apiPost<{ reporteId: number; estadoRevision: ReporteEstado }>(
      'ajax/admin/reporte_resolver.php',
      { reporteId, estado, ...(nota ? { nota } : {}) },
      true
    ),

  usuarioSuspender: (userId: number, suspender: boolean) =>
    apiPost<{ userId: number; estado: 'A' | 'I' }>(
      'ajax/admin/usuario_suspender.php',
      { userId, suspender: suspender ? '1' : '0' },
      true
    ),
};
