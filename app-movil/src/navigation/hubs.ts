import type { Ionicons } from '@expo/vector-icons';

export type IconName = keyof typeof Ionicons.glyphMap;

export type HubItem = {
  key: string;
  labelKey: string;
  route: string;
  icon: IconName;
  /** Una línea de qué hace, para la grilla del hub. */
  descKey?: string;
};

export type Hub = {
  key: string;
  labelKey: string;
  /** A dónde va el toque corto. */
  route: string;
  icon: IconName;
  iconActive: IconName;
  /** ¿Qué pathname prende este ítem en la barra? */
  match: (pathname: string) => boolean;
  /** Sub-funciones: la grilla del hub y el menú de mantener apretado leen esto. */
  items: HubItem[];
};

const limpio = (p: string) => p.replace(/\/$/, '') || '/';

/** Cualquier ruta bajo /(tabs) sin sub-ruta propia. */
function esHuelligram(pathname: string): boolean {
  const p = limpio(pathname);
  return (
    p === '/' ||
    p.endsWith('/(tabs)') ||
    p.endsWith('/(app)') ||
    /\/\(tabs\)\/?$/.test(p) ||
    /\/\(tabs\)\/index$/.test(p)
  );
}

/**
 * Los 6 hubs de la barra inferior y todo lo que cuelga de cada uno.
 *
 * **Esto es la fuente única.** La barra, el menú de mantener apretado y la
 * pantalla de cada hub leen de acá. Cuando la lista vivía repetida en la barra
 * y en `mas.tsx` se desincronizaba sola: había funciones que estaban en un lado
 * y no en el otro.
 *
 * Donaciones aparece en Rescate y en Salud a propósito: es de las dos cosas.
 */
export const HUBS: Hub[] = [
  {
    key: 'huelligram',
    labelKey: 'nav.huelligram',
    route: '/(app)/(tabs)',
    icon: 'paw-outline',
    iconActive: 'paw',
    match: esHuelligram,
    items: [
      { key: 'publicaciones', labelKey: 'huelligram.publicaciones', route: '/(app)/(tabs)?solapa=publicaciones', icon: 'images-outline' },
      { key: 'noticias', labelKey: 'huelligram.noticias', route: '/(app)/(tabs)?solapa=noticias', icon: 'newspaper-outline' },
      { key: 'huetube', labelKey: 'huelligram.huetube', route: '/(app)/(tabs)?solapa=huetube', icon: 'play-circle-outline' },
      { key: 'cadenas', labelKey: 'cadenas.titulo', route: '/(app)/cadenas', icon: 'link-outline' },
    ],
  },
  {
    key: 'buscar',
    labelKey: 'nav.buscar',
    route: '/(app)/buscar',
    icon: 'search-outline',
    iconActive: 'search',
    match: (p) => p.includes('/buscar'),
    items: [
      { key: 'buscar', labelKey: 'nav.buscar', route: '/(app)/buscar', icon: 'search-outline' },
      { key: 'perfil', labelKey: 'perfil.myProfile', route: '/(app)/perfil', icon: 'person-outline' },
    ],
  },
  {
    key: 'rescate',
    labelKey: 'nav.rescate',
    route: '/(app)/rescate',
    icon: 'heart-outline',
    iconActive: 'heart',
    match: (p) =>
      /\/(rescate|adopcion|transito|perdidos|match)(\/|$)/.test(p) ||
      (p.includes('/donaciones') && p.includes('rescate')),
    items: [
      { key: 'adopcion', labelKey: 'adopcion.tituloLista', route: '/(app)/adopcion', icon: 'home-outline' },
      { key: 'transito', labelKey: 'transito.tituloLista', route: '/(app)/transito', icon: 'car-outline' },
      { key: 'perdidos', labelKey: 'perdidos.tituloLista', route: '/(app)/perdidos', icon: 'alert-circle-outline' },
      { key: 'donaciones', labelKey: 'donaciones.tituloLista', route: '/(app)/donaciones', icon: 'gift-outline' },
      { key: 'match', labelKey: 'match.tituloLista', route: '/(app)/match', icon: 'heart-half-outline' },
      { key: 'matches', labelKey: 'match.tituloMatches', route: '/(app)/match/matches', icon: 'chatbubbles-outline' },
    ],
  },
  {
    key: 'tienda',
    labelKey: 'nav.tienda',
    route: '/(app)/tienda',
    icon: 'storefront-outline',
    iconActive: 'storefront',
    match: (p) => /\/(tienda|productos|carrito|pedidos|suscripcion)(\/|$)/.test(p),
    items: [
      { key: 'productos', labelKey: 'productos.tituloLista', route: '/(app)/productos', icon: 'pricetags-outline' },
      { key: 'vender', labelKey: 'productos.tituloNueva', route: '/(app)/productos/nueva', icon: 'add-circle-outline' },
      { key: 'carrito', labelKey: 'carrito.tituloLista', route: '/(app)/carrito', icon: 'cart-outline' },
      { key: 'compras', labelKey: 'pedidos.misCompras', route: '/(app)/pedidos/mis-compras', icon: 'bag-handle-outline' },
      { key: 'ventas', labelKey: 'pedidos.misVentas', route: '/(app)/pedidos/mis-ventas', icon: 'receipt-outline' },
      { key: 'favoritos', labelKey: 'productos.misFavoritos', route: '/(app)/productos/favoritos', icon: 'heart-outline' },
    ],
  },
  {
    key: 'salud',
    labelKey: 'nav.salud',
    route: '/(app)/salud',
    icon: 'medkit-outline',
    iconActive: 'medkit',
    match: (p) => /\/(salud|veterinarias|refugios|cuidados|campanias|equipos)(\/|$)/.test(p),
    items: [
      { key: 'veterinarias', labelKey: 'veterinarias.tituloLista', route: '/(app)/veterinarias', icon: 'medkit-outline' },
      { key: 'refugios', labelKey: 'refugios.tituloLista', route: '/(app)/refugios', icon: 'business-outline' },
      { key: 'equipos', labelKey: 'equipos.tituloLista', route: '/(app)/equipos', icon: 'people-outline' },
      { key: 'cuidados', labelKey: 'cuidados.tituloLista', route: '/(app)/cuidados', icon: 'book-outline' },
      { key: 'campanias', labelKey: 'campanias.tituloLista', route: '/(app)/campanias', icon: 'megaphone-outline' },
      { key: 'donaciones', labelKey: 'donaciones.tituloLista', route: '/(app)/donaciones', icon: 'gift-outline' },
    ],
  },
  {
    key: 'hueplay',
    labelKey: 'nav.hueplay',
    route: '/(app)/juego',
    icon: 'game-controller-outline',
    iconActive: 'game-controller',
    match: (p) => p.includes('/juego'),
    items: [
      { key: 'juego', labelKey: 'nav.hueplay', route: '/(app)/juego', icon: 'game-controller-outline' },
      { key: 'mascotas', labelKey: 'mascotas.title', route: '/(app)/mascotas', icon: 'paw-outline' },
    ],
  },
];

export function hubPorKey(key: string): Hub | undefined {
  return HUBS.find((h) => h.key === key);
}
