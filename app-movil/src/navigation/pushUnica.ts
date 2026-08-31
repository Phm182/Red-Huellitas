import { router } from 'expo-router';

/**
 * Limpia una ruta declarada (con grupos `(app)`) al mismo formato que
 * devuelve `usePathname()`, para poder compararlas.
 */
function limpiar(ruta: string): string {
  const sinGrupos = ruta.replace(/\/\([^/)]*\)/g, '');
  const normalizada = sinGrupos.replace(/\/{2,}/g, '/').replace(/\/$/, '');
  return normalizada === '' ? '/' : normalizada;
}

/**
 * `router.push` que no apila una copia si ya estás exactamente en esa
 * pantalla.
 *
 * Sin esto, tocar dos veces seguidas el mismo ícono de navegación (el de
 * notificaciones, un hub de la barra de abajo, un ítem del menú de
 * mantener-apretado…) apilaba una pantalla idéntica cada vez, y "atrás" había
 * que darlo tantas veces como toques para volver a donde ya se estaba —
 * confuso, porque visualmente nada cambiaba entre toque y toque.
 *
 * La comparación es por pathname resuelto (mismo formato que
 * `usePathname()`), sin importar los grupos de ruta (`(app)`) — así una ruta
 * declarada como `/(app)/notificaciones` matchea contra el `/notificaciones`
 * que devuelve el router en tiempo real.
 *
 * Rutas con query string (`?solapa=...`) se dejan pasar siempre: ahí el query
 * es lo que cambia una pestaña DENTRO de la misma pantalla (ej. Huelligram),
 * y `usePathname()` nunca lo incluye — no hay forma de comparar sin arriesgar
 * saltarse un cambio de pestaña real.
 */
export function pushUnica(pathnameActual: string, ruta: string): void {
  if (!ruta.includes('?') && limpiar(pathnameActual) === limpiar(ruta)) return;
  router.push(ruta as never);
}
