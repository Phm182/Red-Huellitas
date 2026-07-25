import { apiGet, apiPost } from './client';
import { MpVendedorEstado } from '../types';

export const mpVendedorApi = {
  estado: () => apiGet<MpVendedorEstado>('ajax/mp/vendedor_estado.php', undefined, true),

  conectar: () => apiPost<{ authorizeUrl: string }>('ajax/mp/vendedor_conectar.php', {}, true),

  desconectar: () => apiPost<null>('ajax/mp/vendedor_desconectar.php', {}, true),
};
