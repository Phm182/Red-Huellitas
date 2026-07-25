import { apiGet, apiPost } from './client';
import { Pedido, PedidoEstado, PedidoListaResultado } from '../types';

interface ListaParams {
  estado?: PedidoEstado | null;
  cursor?: number | null;
  limit?: number;
}

function listaQuery({ estado, cursor, limit = 15 }: ListaParams = {}) {
  return {
    ...(estado ? { estado } : {}),
    ...(cursor ? { cursor } : {}),
    limit,
  };
}

export const pedidosApi = {
  misCompras: (params?: ListaParams) =>
    apiGet<PedidoListaResultado>('ajax/pedidos/mis_compras.php', listaQuery(params), true),

  misVentas: (params?: ListaParams) =>
    apiGet<PedidoListaResultado>('ajax/pedidos/mis_ventas.php', listaQuery(params), true),

  obtener: (pedidoId: number) => apiGet<{ pedido: Pedido }>('ajax/pedidos/obtener.php', { pedidoId }, true),

  marcarEntregado: (pedidoId: number) => apiPost<null>('ajax/pedidos/marcar_entregado.php', { pedidoId }, true),

  /**
   * Devuelve una URL de un solo uso para abrir el PDF. No se puede pegar
   * directo al endpoint del comprobante porque Linking.openURL() no manda el
   * header Authorization.
   */
  comprobanteLink: (pedidoId: number) =>
    apiPost<{ url: string; numeroComprobante: string }>('ajax/pedidos/comprobante_link.php', { pedidoId }, true),

  reenviarComprobante: (pedidoId: number) =>
    apiPost<null>('ajax/pedidos/reenviar_comprobante.php', { pedidoId }, true),
};
