import { apiPost } from './client';
import { ReporteTipo } from '../types';

export const reportesApi = {
  crearReporte: (tipo: ReporteTipo, detalle: string, pantallaOrigen?: string) =>
    apiPost<{ reporteId: number }>(
      'ajax/reportes/reporte_crear.php',
      { tipo, detalle, pantallaOrigen: pantallaOrigen ?? '' },
      true
    ),

  crearDenuncia: (
    userIdDenunciado: number,
    motivo: string,
    detalle?: string,
    postId?: number,
    adopcionId?: number,
    campaniaId?: number,
    perdidoId?: number,
    transitoId?: number,
    donacionId?: number,
    veterinariaId?: number,
    productoId?: number
  ) =>
    apiPost<{ denunciaId: number }>(
      'ajax/reportes/denuncia_crear.php',
      {
        userIdDenunciado,
        motivo,
        detalle: detalle ?? '',
        ...(postId ? { postId } : {}),
        ...(adopcionId ? { adopcionId } : {}),
        ...(campaniaId ? { campaniaId } : {}),
        ...(perdidoId ? { perdidoId } : {}),
        ...(transitoId ? { transitoId } : {}),
        ...(donacionId ? { donacionId } : {}),
        ...(veterinariaId ? { veterinariaId } : {}),
        ...(productoId ? { productoId } : {}),
      },
      true
    ),
};
