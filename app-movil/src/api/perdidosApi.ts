import { apiGet, apiPost } from './client';
import { appendImageFile } from '../utils/upload';
import { Especie, EstadoPerdido, Perdido, Sexo, TipoPerdido } from '../types';

interface PerdidoListaResultado {
  reportes: Perdido[];
  nextCursor: number | null;
}

export interface CrearPerdidoParams {
  tipo: TipoPerdido;
  mascotaId?: number | null;
  nombre?: string;
  sexo?: Sexo;
  especie?: Especie;
  razaId?: number | null;
  razaTexto?: string | null;
  descripcion?: string;
  ultimoLugarDescripcion: string;
  ultimoLugarLat: number;
  ultimoLugarLng: number;
  fechaSuceso: string;
  fotos?: string[];
}

async function construirFormPerdido(params: CrearPerdidoParams): Promise<FormData> {
  const form = new FormData();
  form.append('tipo', params.tipo);
  form.append('ultimoLugarDescripcion', params.ultimoLugarDescripcion);
  form.append('ultimoLugarLat', String(params.ultimoLugarLat));
  form.append('ultimoLugarLng', String(params.ultimoLugarLng));
  form.append('fechaSuceso', params.fechaSuceso);

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
  if (params.descripcion) {
    form.append('descripcion', params.descripcion);
  }

  const fotos = params.fotos ?? [];
  for (let i = 0; i < fotos.length; i++) {
    await appendImageFile(form, 'fotos[]', fotos[i], `foto${i}.jpg`);
  }

  return form;
}

export const perdidosApi = {
  crear: async (params: CrearPerdidoParams) => {
    const form = await construirFormPerdido(params);
    return apiPost<{ perdido: Perdido }>('ajax/perdidos/crear.php', form, true);
  },

  listar: (tipo?: TipoPerdido, cursor?: number | null, limit = 15) =>
    apiGet<PerdidoListaResultado>(
      'ajax/perdidos/listar.php',
      { ...(tipo ? { tipo } : {}), ...(cursor ? { cursor } : {}), limit },
      true
    ),

  obtener: (perdidoId: number) =>
    apiGet<{ perdido: Perdido }>('ajax/perdidos/obtener.php', { perdidoId }, true),

  eliminar: (perdidoId: number) => apiPost<null>('ajax/perdidos/eliminar.php', { perdidoId }, true),

  marcarReencontrado: (perdidoId: number) =>
    apiPost<{ estadoPerdido: EstadoPerdido }>('ajax/perdidos/estado_actualizar.php', { perdidoId }, true),
};
