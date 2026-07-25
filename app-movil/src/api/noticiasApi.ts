import { apiGet } from './client';
import { NoticiaExterna, Post, TipoUsuarioCatalogoItem } from '../types';

interface NoticiasResultado {
  noticias: NoticiaExterna[];
  nextCursor: number | null;
}

interface PostsResultado {
  posts: Post[];
  nextCursor: number | null;
}

export const noticiasApi = {
  tipos: () => apiGet<{ tipos: TipoUsuarioCatalogoItem[] }>('ajax/noticias/tipos.php', undefined, true),

  listar: (cursor?: number | null, limit = 20) =>
    apiGet<NoticiasResultado>('ajax/noticias/listar.php', { ...(cursor ? { cursor } : {}), limit }, true),

  listarPorTipo: (tipoUsuarioCodigo: string, cursor?: number | null, limit = 15) =>
    apiGet<PostsResultado>(
      'ajax/noticias/listar_por_tipo.php',
      { tipoUsuarioCodigo, ...(cursor ? { cursor } : {}), limit },
      true
    ),
};
