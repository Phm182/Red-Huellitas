import { apiGet } from './client';
import { BusquedaResultado, PerfilPublico } from '../types';

export const usuariosApi = {
  buscar: (q: string, limit = 20) =>
    apiGet<BusquedaResultado>('ajax/usuarios/buscar.php', { q, limit }, true),

  perfilPorUsername: (username: string) =>
    apiGet<PerfilPublico>('ajax/usuarios/perfil.php', { username }, true),

  perfilPorId: (userId: number) => apiGet<PerfilPublico>('ajax/usuarios/perfil.php', { userId }, true),
};
