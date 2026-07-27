import type { Ionicons } from '@expo/vector-icons';

export type AccionCrear = {
  icon: keyof typeof Ionicons.glyphMap;
  route: string;
  labelKey: string;
};

/**
 * Qué crea el botón `+` del riel según dónde estés.
 *
 * **Por qué existe**: al sumar el riel de flotantes quedaron dos `+` en la
 * misma esquina — el global de "nueva publicación" y el de cada listado. En
 * Mis Mascotas el más grande y llamativo era el de publicación, así que
 * tocarlo llevaba a crear un post y parecía que la app no dejaba cargar otra
 * mascota. Ahora hay un solo botón y hace lo que la pantalla dice.
 *
 * El orden importa: gana la primera regla que matchea, así que las rutas más
 * específicas van antes.
 */
const REGLAS: { test: (p: string) => boolean; accion: AccionCrear }[] = [
  { test: (p) => /\/mascotas(\/|$)/.test(p), accion: { icon: 'paw', route: '/(app)/mascotas/nueva', labelKey: 'mascotas.addPet' } },
  { test: (p) => /\/adopcion(\/|$)/.test(p), accion: { icon: 'home', route: '/(app)/adopcion/nueva', labelKey: 'adopcion.tituloNueva' } },
  { test: (p) => /\/transito(\/|$)/.test(p), accion: { icon: 'car', route: '/(app)/transito/nueva', labelKey: 'transito.tituloNueva' } },
  { test: (p) => /\/perdidos(\/|$)/.test(p), accion: { icon: 'alert-circle', route: '/(app)/perdidos/nueva', labelKey: 'perdidos.tituloNueva' } },
  { test: (p) => /\/donaciones(\/|$)/.test(p), accion: { icon: 'gift', route: '/(app)/donaciones/nueva', labelKey: 'donaciones.tituloNueva' } },
  { test: (p) => /\/veterinarias(\/|$)/.test(p), accion: { icon: 'medkit', route: '/(app)/veterinarias/nueva', labelKey: 'veterinarias.tituloNueva' } },
  { test: (p) => /\/campanias(\/|$)/.test(p), accion: { icon: 'megaphone', route: '/(app)/campanias/nueva', labelKey: 'campanias.tituloNueva' } },
  { test: (p) => /\/productos(\/|$)/.test(p), accion: { icon: 'pricetag', route: '/(app)/productos/nueva', labelKey: 'productos.tituloNueva' } },
  { test: (p) => /\/cadenas(\/|$)/.test(p), accion: { icon: 'link', route: '/(app)/cadenas/nueva', labelKey: 'cadenas.tituloNueva' } },
];

/** La acción por defecto: publicar en Huelligram. */
const POR_DEFECTO: AccionCrear = {
  icon: 'add',
  route: '/(app)/publicaciones/nueva',
  labelKey: 'feed.createTitle',
};

/** En Huelligram lo que se crea depende de la solapa abierta, no de la ruta. */
const POR_SOLAPA: Record<string, AccionCrear> = {
  huetube: { icon: 'videocam', route: '/(app)/publicaciones/nueva_video', labelKey: 'shorts.createTitle' },
  noticias: POR_DEFECTO,
  publicaciones: POR_DEFECTO,
};

export function accionCrearPara(pathname: string, solapa?: string): AccionCrear {
  if (solapa && POR_SOLAPA[solapa]) {
    return POR_SOLAPA[solapa];
  }
  return REGLAS.find((r) => r.test(pathname))?.accion ?? POR_DEFECTO;
}
