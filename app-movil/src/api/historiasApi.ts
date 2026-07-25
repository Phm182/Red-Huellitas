import { apiGet, apiPost } from './client';
import { appendImageFile, appendVideoFile } from '../utils/upload';
import { Historia, HistoriaUsuarioResumen, TipoMediaHistoria } from '../types';

export const historiasApi = {
  crear: async (
    tipoMedia: TipoMediaHistoria,
    mediaUri: string,
    duracionSegundos?: number,
    mimeType?: string
  ) => {
    const form = new FormData();
    form.append('tipoMedia', tipoMedia);
    if (tipoMedia === 'video') {
      form.append('duracionSegundos', String(duracionSegundos ?? 0));
      const ext = mimeType === 'video/quicktime' ? 'mov' : 'mp4';
      await appendVideoFile(form, 'media', mediaUri, `historia.${ext}`, mimeType ?? 'video/mp4');
    } else {
      await appendImageFile(form, 'media', mediaUri, 'historia.jpg');
    }
    return apiPost<{ historia: Historia }>('ajax/historias/crear.php', form, true);
  },

  feed: () => apiGet<{ usuarios: HistoriaUsuarioResumen[] }>('ajax/historias/feed.php', undefined, true),

  ver: (userId: number) => apiGet<{ historias: Historia[] }>('ajax/historias/ver.php', { userId }, true),

  marcarVista: (historiaId: number) =>
    apiPost<null>('ajax/historias/marcar_vista.php', { historiaId }, true),

  eliminar: (historiaId: number) => apiPost<null>('ajax/historias/eliminar.php', { historiaId }, true),
};
