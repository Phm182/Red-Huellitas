import { apiGet, apiPost } from './client';
import { appendImageFile } from '../utils/upload';
import { CategoriaDonacion, Donacion, Especie, TipoDonacion } from '../types';

interface DonacionListaResultado {
  listados: Donacion[];
  nextCursor: number | null;
}

export interface CrearDonacionParams {
  tipo: TipoDonacion;
  categoria: CategoriaDonacion;
  descripcion: string;
  especie?: Especie | null;
  zonaDescripcion: string;
  zonaLat: number;
  zonaLng: number;
  fotos?: string[];
}

async function construirFormDonacion(params: CrearDonacionParams): Promise<FormData> {
  const form = new FormData();
  form.append('tipo', params.tipo);
  form.append('categoria', params.categoria);
  form.append('descripcion', params.descripcion);
  form.append('zonaDescripcion', params.zonaDescripcion);
  form.append('zonaLat', String(params.zonaLat));
  form.append('zonaLng', String(params.zonaLng));
  if (params.especie) {
    form.append('especie', params.especie);
  }

  const fotos = params.fotos ?? [];
  for (let i = 0; i < fotos.length; i++) {
    await appendImageFile(form, 'fotos[]', fotos[i], `foto${i}.jpg`);
  }

  return form;
}

export const donacionesApi = {
  crear: async (params: CrearDonacionParams) => {
    const form = await construirFormDonacion(params);
    return apiPost<{ donacion: Donacion }>('ajax/donaciones/crear.php', form, true);
  },

  listar: (
    tipo?: TipoDonacion,
    categoria?: CategoriaDonacion,
    radioKm?: 20 | 50 | 100 | null,
    cursor?: number | null,
    limit = 15
  ) =>
    apiGet<DonacionListaResultado>(
      'ajax/donaciones/listar.php',
      {
        ...(tipo ? { tipo } : {}),
        ...(categoria ? { categoria } : {}),
        ...(radioKm ? { radioKm } : {}),
        ...(!radioKm && cursor ? { cursor } : {}),
        limit,
      },
      true
    ),

  obtener: (donacionId: number) =>
    apiGet<{ donacion: Donacion }>('ajax/donaciones/obtener.php', { donacionId }, true),

  eliminar: (donacionId: number) => apiPost<null>('ajax/donaciones/eliminar.php', { donacionId }, true),
};
