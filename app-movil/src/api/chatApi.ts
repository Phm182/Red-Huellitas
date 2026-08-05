import { apiGet, apiPost } from './client';
import { ChatConversacion, ChatDetalle } from '../types';

export const chatApi = {
  conversaciones: (estado: 'activa' | 'solicitud' = 'activa') =>
    apiGet<{ conversaciones: ChatConversacion[] }>(
      'ajax/chat/conversaciones_listar.php',
      { estado },
      true
    ),

  /**
   * Abre por conversación o por usuario (busca-o-crea).
   * `desdeMensajeId` es lo que usa el polling para traer sólo lo nuevo.
   */
  abrir: (params: { conversacionId?: number; userId?: number; desdeMensajeId?: number }) =>
    apiGet<ChatDetalle>('ajax/chat/abrir.php', { ...params }, true),

  enviar: (
    conversacionId: number,
    texto: string,
    tipo: 'texto' | 'zumbido' | 'sticker' = 'texto'
  ) =>
    apiPost<{ mensajeId: number; conversacionId: number; tipo: string }>(
      'ajax/chat/enviar.php',
      { conversacionId, texto, tipo },
      true
    ),

  marcarLeida: (conversacionId: number) =>
    apiPost<null>('ajax/chat/marcar_leida.php', { conversacionId }, true),

  resolverSolicitud: (conversacionId: number, accion: 'aceptar' | 'rechazar') =>
    apiPost<{ estado: string }>('ajax/chat/solicitud_resolver.php', { conversacionId, accion }, true),
};
