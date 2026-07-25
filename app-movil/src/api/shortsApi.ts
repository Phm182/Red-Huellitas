import { apiGet, apiPost } from './client';
import { appendVideoFile } from '../utils/upload';
import { Post } from '../types';

interface ShortsFeedResultado {
  posts: Post[];
  nextCursor: number | null;
}

export const shortsApi = {
  crear: async (texto: string | undefined, videoUri: string, duracionSegundos: number, mimeType: string) => {
    const form = new FormData();
    if (texto) {
      form.append('texto', texto);
    }
    form.append('duracionSegundos', String(duracionSegundos));
    const ext = mimeType === 'video/quicktime' ? 'mov' : 'mp4';
    await appendVideoFile(form, 'video', videoUri, `short.${ext}`, mimeType);
    return apiPost<{ post: Post }>('ajax/publicaciones/crear_video.php', form, true);
  },

  feed: (cursor?: number | null, limit = 10) =>
    apiGet<ShortsFeedResultado>(
      'ajax/publicaciones/shorts_feed.php',
      { ...(cursor ? { cursor } : {}), limit },
      true
    ),
};
