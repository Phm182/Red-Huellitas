import { apiGet, apiPost } from './client';
import { CarritoPublico, Pedido } from '../types';

export const carritoApi = {
  ver: () => apiGet<CarritoPublico>('ajax/carrito/ver.php', undefined, true),

  agregar: (productoId: number, cantidad = 1) =>
    apiPost<CarritoPublico>('ajax/carrito/agregar.php', { productoId, cantidad }, true),

  actualizarCantidad: (carritoItemId: number, cantidad: number) =>
    apiPost<CarritoPublico>('ajax/carrito/actualizar_cantidad.php', { carritoItemId, cantidad }, true),

  quitar: (carritoItemId: number) =>
    apiPost<CarritoPublico>('ajax/carrito/quitar.php', { carritoItemId }, true),

  vaciar: () => apiPost<null>('ajax/carrito/vaciar.php', {}, true),

  checkout: () => apiPost<{ pedidos: Pedido[] }>('ajax/carrito/checkout.php', {}, true),
};
