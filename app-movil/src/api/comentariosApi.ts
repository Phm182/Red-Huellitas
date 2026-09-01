import { apiGet, apiPost } from './client';
import { Comentario } from '../types';

interface ComentariosListaResultado {
  comentarios: Comentario[];
  nextCursor: number | null;
}

export const comentariosApi = {
  listar: (postId: number, cursor?: number | null, limit = 15) =>
    apiGet<ComentariosListaResultado>(
      'ajax/comentarios/listar.php',
      { postId, ...(cursor ? { cursor } : {}), limit },
      true
    ),

  crear: (postId: number, texto: string) =>
    apiPost<{ comentario: Comentario }>('ajax/comentarios/crear.php', { postId, texto }, true),

  eliminar: (comentarioId: number) =>
    apiPost<null>('ajax/comentarios/eliminar.php', { comentarioId }, true),
};
