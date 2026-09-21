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
   * Abre por conversación o por usuario. Por usuario NO crea la charla si
   * todavía no existe: devuelve `conversacionId` 0 y se crea al mandar el primer mensaje.
   * `desdeMensajeId` es lo que usa el polling para traer sólo lo nuevo.
   */
  abrir: (params: { conversacionId?: number; userId?: number; desdeMensajeId?: number }) =>
    apiGet<ChatDetalle>('ajax/chat/abrir.php', { ...params }, true),

  /**
   * Con `conversacionId` en 0 hay que pasar `userId`: es el primer mensaje a
   * esa persona y recién ahí el servidor crea la conversación.
   */
  enviar: (
    conversacionId: number,
    texto: string,
    tipo: 'texto' | 'zumbido' | 'sticker' = 'texto',
    userId?: number
  ) =>
    apiPost<{ mensajeId: number; conversacionId: number; tipo: string }>(
      'ajax/chat/enviar.php',
      { conversacionId, texto, tipo, ...(userId ? { userId } : {}) },
      true
    ),

  marcarLeida: (conversacionId: number) =>
    apiPost<null>('ajax/chat/marcar_leida.php', { conversacionId }, true),

  resolverSolicitud: (conversacionId: number, accion: 'aceptar' | 'rechazar') =>
    apiPost<{ estado: string }>('ajax/chat/solicitud_resolver.php', { conversacionId, accion }, true),
};
