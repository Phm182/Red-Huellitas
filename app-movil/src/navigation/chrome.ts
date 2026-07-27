import type { Ionicons } from '@expo/vector-icons';
import { HUBS } from './hubs';

/** Altura del header de app (sin safe area). */
export const APP_HEADER_HEIGHT = 56;

/** Altura del menú inferior (sin safe area). */
export const APP_TAB_BAR_HEIGHT = 64;

export type TabIconName = keyof typeof Ionicons.glyphMap;

export type Chrome = {
  header: boolean;
  tabBar: boolean;
  /** Los 3 flotantes (chat, animales, notificaciones). */
  dock: boolean;
};

/** Rutas inmersivas: la Huellita a pantalla completa se come todo el chrome. */
function esInmersiva(pathname: string): boolean {
  if (pathname.includes('/historias/nueva') || pathname.includes('/historias/ver')) return true;
  // Ruta vieja historias/[userId] (sin /ver/)
  return (
    /\/historias\/[^/]+$/.test(pathname.replace(/\/$/, '')) && !pathname.includes('/historias/nueva')
  );
}

/**
 * Qué chrome corresponde a cada ruta.
 *
 * El dock se apaga en más lugares que el header: cuando estás mirando una
 * foto, un video o una Huellita, tres burbujas flotantes encima del contenido
 * molestan aunque la barra de abajo tenga sentido.
 */
export function chromeForPath(pathname: string): Chrome {
  if (esInmersiva(pathname)) {
    return { header: false, tabBar: false, dock: false };
  }

  const sinDock =
    pathname.includes('/publicaciones/nueva') ||
    pathname.includes('/nueva_video') ||
    pathname.includes('/publicaciones/') ||
    pathname.includes('/mascota/') ||
    pathname.includes('/historia-vistas');

  return { header: true, tabBar: true, dock: !sinDock };
}

/** ¿Estamos en la raíz de un hub? (sin flecha de volver en el header) */
export function isAppTabRoot(pathname: string): boolean {
  const p = pathname.replace(/\/$/, '') || '/';
  return HUBS.some((hub) => {
    const ruta = hub.route.replace('/(app)', '');
    if (ruta === '/(tabs)') return hub.match(p);
    return p === ruta || p.endsWith(ruta);
  });
}

/** Ícono del hub actual, para el header. Null si la ruta no pertenece a ningún hub. */
export function tabIconForPath(pathname: string): TabIconName | null {
  const hub = HUBS.find((h) => h.match(pathname));
  return hub ? hub.iconActive : null;
}
