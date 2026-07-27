import { apiBaseUrl, apiGet, apiPost } from './client';
import { fetchAuthenticatedImageUri } from '../utils/media';
import { appendImageFile } from '../utils/upload';
import { Especie, Mascota, MascotaFoto, RazaCatalogoItem, Visibilidad } from '../types';

export interface CrearMascotaParams {
  nombre: string;
  sexo: 'macho' | 'hembra';
  especie: Especie;
  razaId: number | null;
  razaTexto: string | null;
  edadAnios?: number | null;
  edadMeses?: number | null;
  descripcion?: string;
  disponibleParaMatch: boolean;
  carnetVisibilidad: Visibilidad;
  fotos: string[];
  carnetUri?: string | null;
}

async function construirFormMascota(params: CrearMascotaParams): Promise<FormData> {
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
  form.append('disponibleParaMatch', params.disponibleParaMatch ? '1' : '0');
  form.append('carnetVisibilidad', params.carnetVisibilidad);

  for (let i = 0; i < params.fotos.length; i++) {
    await appendImageFile(form, 'fotos[]', params.fotos[i], `foto${i}.jpg`);
  }
  if (params.carnetUri) {
    await appendImageFile(form, 'carnet', params.carnetUri, 'carnet.jpg');
  }

  return form;
}

export const mascotasApi = {
  razas: (especie: Especie) => apiGet<{ razas: RazaCatalogoItem[] }>('ajax/mascotas/razas.php', { especie }, true),

  crear: async (params: CrearMascotaParams) => {
    const form = await construirFormMascota(params);
    return apiPost<{ mascota: Mascota }>('ajax/mascotas/crear.php', form, true);
  },

  misMascotas: () => apiGet<{ mascotas: Mascota[] }>('ajax/mascotas/mis_mascotas.php', undefined, true),

  listarUsuario: (userId: number) =>
    apiGet<{ mascotas: Mascota[] }>('ajax/mascotas/listar_usuario.php', { userId }, true),

  obtener: (mascotaId: number) => apiGet<{ mascota: Mascota }>('ajax/mascotas/obtener.php', { mascotaId }, true),

  actualizar: (
    mascotaId: number,
    campos: Omit<CrearMascotaParams, 'fotos' | 'carnetUri' | 'carnetVisibilidad' | 'disponibleParaMatch'> & {
      modoBanner?: 'portada' | 'banner';
      bannerFocusY?: number;
      bannerUri?: string | null;
    }
  ) => {
    const body: Record<string, unknown> = {
      mascotaId,
      nombre: campos.nombre,
      sexo: campos.sexo,
      especie: campos.especie,
      razaId: campos.razaId ?? '',
      razaTexto: campos.razaTexto ?? '',
      edadAnios: campos.edadAnios ?? '',
      edadMeses: campos.edadMeses ?? '',
      descripcion: campos.descripcion ?? '',
    };
    if (campos.modoBanner) body.modoBanner = campos.modoBanner;
    if (campos.bannerFocusY !== undefined) body.bannerFocusY = String(campos.bannerFocusY);

    if (campos.bannerUri) {
      return (async () => {
        const form = new FormData();
        Object.entries(body).forEach(([k, v]) => form.append(k, String(v)));
        await appendImageFile(form, 'banner', campos.bannerUri!, 'banner.jpg');
        return apiPost<{ mascota: Mascota }>('ajax/mascotas/actualizar.php', form, true);
      })();
    }

    return apiPost<{ mascota: Mascota }>('ajax/mascotas/actualizar.php', body, true);
  },

  eliminar: (mascotaId: number) => apiPost<null>('ajax/mascotas/eliminar.php', { mascotaId }, true),

  toggleMatch: (mascotaId: number, disponible: boolean) =>
    apiPost<{ disponibleParaMatch: boolean }>(
      'ajax/mascotas/match_toggle.php',
      { mascotaId, disponible: disponible ? '1' : '0' },
      true
    ),

  subirFoto: async (mascotaId: number, uri: string) => {
    const form = new FormData();
    form.append('mascotaId', String(mascotaId));
    await appendImageFile(form, 'foto', uri, 'foto.jpg');
    return apiPost<{ fotos: MascotaFoto[] }>('ajax/mascotas/foto_subir.php', form, true);
  },

  eliminarFoto: (mascotaFotoId: number) =>
    apiPost<{ fotos: MascotaFoto[] }>('ajax/mascotas/foto_eliminar.php', { mascotaFotoId }, true),

  subirCarnet: async (mascotaId: number, uri: string, visibilidad: Visibilidad) => {
    const form = new FormData();
    form.append('mascotaId', String(mascotaId));
    form.append('visibilidad', visibilidad);
    await appendImageFile(form, 'carnet', uri, 'carnet.jpg');
    return apiPost<{ carnetDisponible: boolean; carnetVisibilidad: Visibilidad }>(
      'ajax/mascotas/carnet_subir.php',
      form,
      true
    );
  },

  cambiarVisibilidadCarnet: (mascotaId: number, visibilidad: Visibilidad) =>
    apiPost<{ carnetVisibilidad: Visibilidad }>(
      'ajax/mascotas/carnet_visibilidad.php',
      { mascotaId, visibilidad },
      true
    ),

  compartirCarnet: (mascotaId: number, userId: number) =>
    apiPost<null>('ajax/mascotas/carnet_compartir.php', { mascotaId, userId }, true),

  revocarCarnet: (mascotaId: number, userId: number) =>
    apiPost<null>('ajax/mascotas/carnet_revocar.php', { mascotaId, userId }, true),

  /** Devuelve un URI mostrable en <Image> o null si no hay acceso (403/404). */
  verCarnetUri: (mascotaId: number, token: string | null) =>
    fetchAuthenticatedImageUri(`${apiBaseUrl()}/ajax/mascotas/carnet_ver.php?mascotaId=${mascotaId}`, token),
};
