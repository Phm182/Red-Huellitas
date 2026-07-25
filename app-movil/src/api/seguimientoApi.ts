import { apiGet, apiPost } from './client';
import { UsuarioResumen } from '../types';

export const seguimientoApi = {
  seguir: (userIdSeguido: number) => apiPost<null>('ajax/seguimiento/seguir.php', { userIdSeguido }, true),

  dejarDeSeguir: (userIdSeguido: number) =>
    apiPost<null>('ajax/seguimiento/dejar_de_seguir.php', { userIdSeguido }, true),

  seguidores: (userId: number) =>
    apiGet<{ usuarios: UsuarioResumen[] }>('ajax/seguimiento/seguidores.php', { userId }, true),

  seguidos: (userId: number) =>
    apiGet<{ usuarios: UsuarioResumen[] }>('ajax/seguimiento/seguidos.php', { userId }, true),
};
