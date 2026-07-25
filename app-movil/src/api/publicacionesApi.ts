import { apiGet, apiPost } from './client';
import { appendImageFile } from '../utils/upload';
import { Post, ReaccionTipo } from '../types';

interface FeedResultado {
  posts: Post[];
  nextCursor: number | null;
}

export const publicacionesApi = {
  crear: async (texto: string | undefined, fotos: string[]) => {
    const form = new FormData();
    if (texto) {
      form.append('texto', texto);
    }
    for (let i = 0; i < fotos.length; i++) {
      await appendImageFile(form, 'fotos[]', fotos[i], `foto${i}.jpg`);
    }
    return apiPost<{ post: Post }>('ajax/publicaciones/crear.php', form, true);
  },

  feed: (cursor?: number | null, limit = 15) =>
    apiGet<FeedResultado>(
      'ajax/publicaciones/feed.php',
      { ...(cursor ? { cursor } : {}), limit },
      true
    ),

  listarUsuario: (userId: number, cursor?: number | null, limit = 15) =>
    apiGet<FeedResultado>(
      'ajax/publicaciones/listar_usuario.php',
      { userId, ...(cursor ? { cursor } : {}), limit },
      true
    ),

  obtener: (postId: number) => apiGet<{ post: Post }>('ajax/publicaciones/obtener.php', { postId }, true),

  reaccionar: (postId: number, tipo: ReaccionTipo) =>
    apiPost<{ miReaccion: ReaccionTipo; conteos: Post['conteos'] }>(
      'ajax/publicaciones/reaccionar.php',
      { postId, tipo },
      true
    ),

  quitarReaccion: (postId: number) =>
    apiPost<{ miReaccion: null; conteos: Post['conteos'] }>(
      'ajax/publicaciones/reaccion_quitar.php',
      { postId },
      true
    ),

  eliminar: (postId: number) => apiPost<null>('ajax/publicaciones/eliminar.php', { postId }, true),
};
