import { apiGet, apiPost } from './client';
import { appendImageFile } from '../utils/upload';
import { Especie, Sexo, Transito, TipoTransito } from '../types';

interface TransitoListaResultado {
  listados: Transito[];
  nextCursor: number | null;
}

export interface CrearTransitoParams {
  tipo: TipoTransito;
  mascotaId?: number | null;
  nombre?: string;
  sexo?: Sexo;
  especie?: Especie;
  razaId?: number | null;
  razaTexto?: string | null;
  descripcion?: string;
  duracionDias?: number | null;
  zonaDescripcion: string;
  zonaLat: number;
  zonaLng: number;
  fotos?: string[];
}

async function construirFormTransito(params: CrearTransitoParams): Promise<FormData> {
  const form = new FormData();
  form.append('tipo', params.tipo);
  form.append('zonaDescripcion', params.zonaDescripcion);
  form.append('zonaLat', String(params.zonaLat));
  form.append('zonaLng', String(params.zonaLng));
  if (params.descripcion) {
    form.append('descripcion', params.descripcion);
  }
  if (params.duracionDias) {
    form.append('duracionDias', String(params.duracionDias));
  }

  if (params.mascotaId) {
    form.append('mascotaId', String(params.mascotaId));
    return form;
  }

  if (params.nombre) {
    form.append('nombre', params.nombre);
  }
  if (params.sexo) {
    form.append('sexo', params.sexo);
  }
  if (params.especie) {
    form.append('especie', params.especie);
  }
  if (params.razaId) {
    form.append('razaId', String(params.razaId));
  }
  if (params.razaTexto) {
    form.append('razaTexto', params.razaTexto);
  }

  const fotos = params.fotos ?? [];
  for (let i = 0; i < fotos.length; i++) {
    await appendImageFile(form, 'fotos[]', fotos[i], `foto${i}.jpg`);
  }

  return form;
}

export const transitoApi = {
  crear: async (params: CrearTransitoParams) => {
    const form = await construirFormTransito(params);
    return apiPost<{ transito: Transito }>('ajax/transito/crear.php', form, true);
  },

  listar: (tipo?: TipoTransito, radioKm?: 20 | 50 | 100 | null, cursor?: number | null, limit = 15) =>
    apiGet<TransitoListaResultado>(
      'ajax/transito/listar.php',
      {
        ...(tipo ? { tipo } : {}),
        ...(radioKm ? { radioKm } : {}),
        ...(!radioKm && cursor ? { cursor } : {}),
        limit,
      },
      true
    ),

  obtener: (transitoId: number) =>
    apiGet<{ transito: Transito }>('ajax/transito/obtener.php', { transitoId }, true),

  eliminar: (transitoId: number) => apiPost<null>('ajax/transito/eliminar.php', { transitoId }, true),
};
