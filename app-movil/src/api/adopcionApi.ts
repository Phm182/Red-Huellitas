import { apiGet, apiPost } from './client';
import { appendImageFile } from '../utils/upload';
import {
  Adopcion,
  AdopcionPostulacionPropia,
  AdopcionPostulacionRecibida,
  Especie,
  EstadoAdopcion,
  PreguntaBorrador,
  RespuestaBorrador,
  Sexo,
} from '../types';

interface AdopcionListaResultado {
  listados: Adopcion[];
  nextCursor: number | null;
}

export interface CrearAdopcionParams {
  nombre: string;
  sexo: Sexo;
  especie: Especie;
  razaId: number | null;
  razaTexto: string | null;
  edadAnios?: number | null;
  edadMeses?: number | null;
  descripcion?: string;
  fotos: string[];
  preguntas: PreguntaBorrador[];
}

async function construirFormAdopcion(params: CrearAdopcionParams): Promise<FormData> {
  const form = new FormData();
  form.append('nombre', params.nombre);
  form.append('sexo', params.sexo);
  form.append('especie', params.especie);
  if (params.razaId !== null) {
    form.append('razaId', String(params.razaId));
  }
  if (params.razaTexto) {
    form.append('razaTexto', params.razaTexto);
  }
  if (params.edadAnios !== undefined && params.edadAnios !== null) {
    form.append('edadAnios', String(params.edadAnios));
  }
  if (params.edadMeses !== undefined && params.edadMeses !== null) {
    form.append('edadMeses', String(params.edadMeses));
  }
  if (params.descripcion) {
    form.append('descripcion', params.descripcion);
  }

  params.preguntas.forEach((pregunta, index) => {
    form.append(`preguntas[${index}][tipo]`, pregunta.tipo);
    form.append(`preguntas[${index}][texto]`, pregunta.texto);
    pregunta.opciones.forEach((opcion, opcionIndex) => {
      form.append(`preguntas[${index}][opciones][${opcionIndex}]`, opcion);
    });
  });

  for (let i = 0; i < params.fotos.length; i++) {
    await appendImageFile(form, 'fotos[]', params.fotos[i], `foto${i}.jpg`);
  }

  return form;
}

export const adopcionApi = {
  crear: async (params: CrearAdopcionParams) => {
    const form = await construirFormAdopcion(params);
    return apiPost<{ adopcion: Adopcion }>('ajax/adopcion/crear.php', form, true);
  },

  actualizar: async (
    adopcionId: number,
    params: CrearAdopcionParams & { fotosExistentesIds: number[] }
  ) => {
    const form = new FormData();
    form.append('adopcionId', String(adopcionId));
    form.append('nombre', params.nombre);
    form.append('sexo', params.sexo);
    form.append('especie', params.especie);
    if (params.razaId !== null) form.append('razaId', String(params.razaId));
    if (params.razaTexto) form.append('razaTexto', params.razaTexto);
    if (params.edadAnios !== undefined && params.edadAnios !== null) {
      form.append('edadAnios', String(params.edadAnios));
    }
    if (params.edadMeses !== undefined && params.edadMeses !== null) {
      form.append('edadMeses', String(params.edadMeses));
    }
    if (params.descripcion) form.append('descripcion', params.descripcion);

    const orden: string[] = [];
    let nuevaIdx = 0;
    for (let i = 0; i < params.fotos.length; i++) {
      const existenteId = params.fotosExistentesIds[i] ?? 0;
      if (existenteId > 0) {
        orden.push(`e:${existenteId}`);
      } else {
        orden.push(`n:${nuevaIdx}`);
        await appendImageFile(form, 'fotos[]', params.fotos[i], `foto${nuevaIdx}.jpg`);
        nuevaIdx++;
      }
    }
    form.append('ordenFotos', JSON.stringify(orden));

    return apiPost<{ adopcion: Adopcion }>('ajax/adopcion/actualizar.php', form, true);
  },

  listar: (especie?: Especie, cursor?: number | null, limit = 15) =>
    apiGet<AdopcionListaResultado>(
      'ajax/adopcion/listar.php',
      { ...(especie ? { especie } : {}), ...(cursor ? { cursor } : {}), limit },
      true
    ),

  obtener: (adopcionId: number) =>
    apiGet<{ adopcion: Adopcion }>('ajax/adopcion/obtener.php', { adopcionId }, true),

  eliminar: (adopcionId: number) => apiPost<null>('ajax/adopcion/eliminar.php', { adopcionId }, true),

  actualizarEstado: (adopcionId: number, estadoAdopcion: EstadoAdopcion) =>
    apiPost<{ estadoAdopcion: EstadoAdopcion }>(
      'ajax/adopcion/estado_actualizar.php',
      { adopcionId, estadoAdopcion },
      true
    ),

  postular: (adopcionId: number, respuestas: RespuestaBorrador[]) => {
    const body: Record<string, unknown> = { adopcionId };
    respuestas.forEach((r, index) => {
      body[`respuestas[${index}][preguntaId]`] = r.preguntaId;
      if (r.texto !== undefined) {
        body[`respuestas[${index}][texto]`] = r.texto;
      }
      if (r.opcionId !== undefined) {
        body[`respuestas[${index}][opcionId]`] = r.opcionId;
      }
    });
    return apiPost<{ adopcionPostulacionId: number }>('ajax/adopcion/postular.php', body, true);
  },

  misPostulaciones: () =>
    apiGet<{ postulaciones: AdopcionPostulacionPropia[] }>('ajax/adopcion/mis_postulaciones.php', undefined, true),

  postulacionesRecibidas: (adopcionId: number) =>
    apiGet<{ postulaciones: AdopcionPostulacionRecibida[] }>(
      'ajax/adopcion/postulaciones_recibidas.php',
      { adopcionId },
      true
    ),

  favoritoAgregar: (adopcionId: number) =>
    apiPost<null>('ajax/adopcion/favorito_agregar.php', { adopcionId }, true),

  favoritoQuitar: (adopcionId: number) =>
    apiPost<null>('ajax/adopcion/favorito_quitar.php', { adopcionId }, true),

  misFavoritos: () => apiGet<{ favoritos: Adopcion[] }>('ajax/adopcion/mis_favoritos.php', undefined, true),
};
