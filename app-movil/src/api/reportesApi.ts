import { apiPost } from './client';
import { ReporteTipo } from '../types';

export type CrearDenunciaParams = {
  userIdDenunciado: number;
  motivo: string;
  detalle?: string;
  postId?: number;
  historiaId?: number;
  adopcionId?: number;
  campaniaId?: number;
  perdidoId?: number;
  transitoId?: number;
  donacionId?: number;
  veterinariaId?: number;
  productoId?: number;
};

export const reportesApi = {
  crearReporte: (tipo: ReporteTipo, detalle: string, pantallaOrigen?: string) =>
    apiPost<{ reporteId: number }>(
      'ajax/reportes/reporte_crear.php',
      { tipo, detalle, pantallaOrigen: pantallaOrigen ?? '' },
      true
    ),

  crearDenuncia: (params: CrearDenunciaParams) =>
    apiPost<{ denunciaId: number }>(
      'ajax/reportes/denuncia_crear.php',
      {
        userIdDenunciado: params.userIdDenunciado,
        motivo: params.motivo,
        detalle: params.detalle ?? '',
        ...(params.postId ? { postId: params.postId } : {}),
        ...(params.historiaId ? { historiaId: params.historiaId } : {}),
        ...(params.adopcionId ? { adopcionId: params.adopcionId } : {}),
        ...(params.campaniaId ? { campaniaId: params.campaniaId } : {}),
        ...(params.perdidoId ? { perdidoId: params.perdidoId } : {}),
        ...(params.transitoId ? { transitoId: params.transitoId } : {}),
        ...(params.donacionId ? { donacionId: params.donacionId } : {}),
        ...(params.veterinariaId ? { veterinariaId: params.veterinariaId } : {}),
        ...(params.productoId ? { productoId: params.productoId } : {}),
      },
      true
    ),
};
