import { apiGet, apiPost } from './client';
import { Campania, CampaniaInscripcionPropia, CampaniaInscripto, TipoCampania } from '../types';

interface CampaniaListaResultado {
  campanias: Campania[];
  nextCursor: number | null;
}

export interface CrearCampaniaParams {
  tipo: TipoCampania;
  titulo: string;
  descripcion?: string;
  fechaDesde: string;
  fechaHasta?: string | null;
  zonaDescripcion: string;
  zonaLat: number;
  zonaLng: number;
  requiereInscripcion: boolean;
  cupoMaximo?: number | null;
}

export const campaniaApi = {
  crear: (params: CrearCampaniaParams) =>
    apiPost<{ campania: Campania }>(
      'ajax/campanias/crear.php',
      {
        tipo: params.tipo,
        titulo: params.titulo,
        descripcion: params.descripcion ?? '',
        fechaDesde: params.fechaDesde,
        ...(params.fechaHasta ? { fechaHasta: params.fechaHasta } : {}),
        zonaDescripcion: params.zonaDescripcion,
        zonaLat: params.zonaLat,
        zonaLng: params.zonaLng,
        requiereInscripcion: params.requiereInscripcion ? '1' : '0',
        ...(params.requiereInscripcion && params.cupoMaximo ? { cupoMaximo: params.cupoMaximo } : {}),
      },
      true
    ),

  listar: (tipo?: TipoCampania, cursor?: number | null, limit = 15) =>
    apiGet<CampaniaListaResultado>(
      'ajax/campanias/listar.php',
      { ...(tipo ? { tipo } : {}), ...(cursor ? { cursor } : {}), limit },
      true
    ),

  obtener: (campaniaId: number) =>
    apiGet<{ campania: Campania }>('ajax/campanias/obtener.php', { campaniaId }, true),

  eliminar: (campaniaId: number) => apiPost<null>('ajax/campanias/eliminar.php', { campaniaId }, true),

  inscribirme: (campaniaId: number) =>
    apiPost<{ campaniaInscripcionId: number }>('ajax/campanias/inscribirme.php', { campaniaId }, true),

  misInscripciones: () =>
    apiGet<{ inscripciones: CampaniaInscripcionPropia[] }>('ajax/campanias/mis_inscripciones.php', undefined, true),

  inscripcionesRecibidas: (campaniaId: number) =>
    apiGet<{ inscriptos: CampaniaInscripto[] }>(
      'ajax/campanias/inscripciones_recibidas.php',
      { campaniaId },
      true
    ),
};
