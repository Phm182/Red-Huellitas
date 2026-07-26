import { apiBaseUrl, apiGet, apiPost } from './client';
import { Visibilidad, VerificacionEstado } from '../types';
import { appendImageFile } from '../utils/upload';

export const perfilApi = {
  guardarWhatsapp: (whatsappNumero: string, visibilidad?: Visibilidad) =>
    apiPost<{ whatsappNumero: string; whatsappVisibilidad: Visibilidad }>(
      'ajax/perfil/whatsapp_guardar.php',
      visibilidad ? { whatsappNumero, visibilidad } : { whatsappNumero },
      true
    ),

  estadoVerificacion: () => apiGet<VerificacionEstado>('ajax/perfil/verificacion_estado.php', undefined, true),

  verificacionArchivoUrl: (tipo: 'dniFrente' | 'dniDorso' | 'selfie') =>
    `${apiBaseUrl()}/ajax/perfil/verificacion_archivo.php?tipo=${tipo}`,

  subirVerificacion: async (files: { dniFrente?: string; dniDorso?: string; selfie?: string }) => {
    const form = new FormData();
    if (files.dniFrente) {
      await appendImageFile(form, 'dniFrente', files.dniFrente, 'dni_frente.jpg');
    }
    if (files.dniDorso) {
      await appendImageFile(form, 'dniDorso', files.dniDorso, 'dni_dorso.jpg');
    }
    if (files.selfie) {
      await appendImageFile(form, 'selfie', files.selfie, 'selfie.jpg');
    }
    return apiPost<VerificacionEstado>('ajax/perfil/verificacion_subir.php', form, true);
  },

  subirAvatar: async (uri: string) => {
    const form = new FormData();
    await appendImageFile(form, 'avatar', uri, 'avatar.jpg');
    return apiPost<{ avatarPath?: string; avatarUrl?: string; avatarBust?: number | null }>(
      'ajax/perfil/avatar_subir.php',
      form,
      true
    );
  },

  guardarPushToken: (expoPushToken: string) =>
    apiPost<null>('ajax/perfil/push_token_guardar.php', { expoPushToken }, true),

  guardarNotificacionProximidad: (activo: boolean) =>
    apiPost<{ notificarProximidad: boolean }>(
      'ajax/perfil/notificacion_proximidad_guardar.php',
      { activo: activo ? '1' : '0' },
      true
    ),
};
