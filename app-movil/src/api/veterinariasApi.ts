import { apiGet, apiPost } from './client';
import { appendImageFile } from '../utils/upload';
import { Veterinaria } from '../types';

interface VeterinariaListaResultado {
  listados: Veterinaria[];
  nextCursor: number | null;
}

export interface CrearVeterinariaParams {
  nombre: string;
  descripcion?: string;
  telefono?: string;
  whatsappNumero?: string;
  horario?: string;
  zonaDescripcion: string;
  zonaLat: number;
  zonaLng: number;
  fotos?: string[];
}

async function construirFormVeterinaria(params: CrearVeterinariaParams): Promise<FormData> {
  const form = new FormData();
  form.append('nombre', params.nombre);
  form.append('zonaDescripcion', params.zonaDescripcion);
  form.append('zonaLat', String(params.zonaLat));
  form.append('zonaLng', String(params.zonaLng));
  if (params.descripcion) {
    form.append('descripcion', params.descripcion);
  }
  if (params.telefono) {
    form.append('telefono', params.telefono);
  }
  if (params.whatsappNumero) {
    form.append('whatsappNumero', params.whatsappNumero);
  }
  if (params.horario) {
    form.append('horario', params.horario);
  }

  const fotos = params.fotos ?? [];
  for (let i = 0; i < fotos.length; i++) {
    await appendImageFile(form, 'fotos[]', fotos[i], `foto${i}.jpg`);
  }

  return form;
}

export const veterinariasApi = {
  crear: async (params: CrearVeterinariaParams) => {
    const form = await construirFormVeterinaria(params);
    return apiPost<{ veterinaria: Veterinaria }>('ajax/veterinarias/crear.php', form, true);
  },

  listar: (radioKm?: 20 | 50 | 100 | null, cursor?: number | null, limit = 15) =>
    apiGet<VeterinariaListaResultado>(
      'ajax/veterinarias/listar.php',
      {
        ...(radioKm ? { radioKm } : {}),
        ...(!radioKm && cursor ? { cursor } : {}),
        limit,
      },
      true
    ),

  obtener: (veterinariaId: number) =>
    apiGet<{ veterinaria: Veterinaria }>('ajax/veterinarias/obtener.php', { veterinariaId }, true),

  eliminar: (veterinariaId: number) => apiPost<null>('ajax/veterinarias/eliminar.php', { veterinariaId }, true),
};
