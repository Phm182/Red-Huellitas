import type { TFunction } from 'i18next';

/**
 * Resuelve el título del header a partir del pathname.
 * Orden: match más específico primero.
 */
export function titleForPath(pathname: string, t: TFunction): string {
  const p = pathname;

  const rules: { test: (path: string) => boolean; title: string }[] = [
    { test: (x) => x.includes('/configuracion'), title: t('nav.configuracion') },
    { test: (x) => x.includes('/rescate'), title: t('nav.rescate') },
    { test: (x) => x.includes('/tienda'), title: t('nav.tienda') },
    { test: (x) => x.includes('/salud'), title: t('nav.salud') },
    { test: (x) => x.includes('/refugios'), title: t('refugios.tituloLista') },
    { test: (x) => x.includes('/equipos/nuevo'), title: t('equipos.crear') },
    { test: (x) => /\/equipos\/[^/]+\/editar/.test(x), title: t('equipos.editar') },
    { test: (x) => x.includes('/equipos'), title: t('equipos.tituloLista') },
    { test: (x) => x.includes('/cuidados'), title: t('cuidados.tituloLista') },
    { test: (x) => x.includes('/notificaciones'), title: t('notificaciones.titulo') },
    { test: (x) => x.includes('/chat'), title: t('chat.titulo') },
    { test: (x) => x.includes('/ajustes/whatsapp'), title: 'WhatsApp' },
    { test: (x) => x.includes('/ajustes/verificacion'), title: 'Verificación' },
    { test: (x) => x.includes('/buscar'), title: t('busqueda.navLabel') },
    { test: (x) => x.includes('/seguidores'), title: t('perfil.followers') },
    { test: (x) => x.includes('/seguidos'), title: t('perfil.following') },
    { test: (x) => x.includes('/mascotas/nueva'), title: t('mascotas.addPet') },
    { test: (x) => x.includes('/editar'), title: t('mascotas.editButton') },
    { test: (x) => x.includes('/mascotas'), title: t('mascotas.title') },
    // Detalle de una mascota (singular). El nombre del animal lo pone la
    // pantalla vía tituloHeaderStore; esto es lo que se ve mientras carga.
    { test: (x) => x.includes('/mascota/'), title: t('mascotas.title') },
    { test: (x) => x.includes('/publicaciones/nueva_video'), title: t('shorts.createTitle') },
    { test: (x) => x.includes('/publicaciones/nueva'), title: t('feed.createTitle') },
    { test: (x) => x.includes('/historia-vistas') || x.includes('/vistas'), title: t('historias.vistasTitulo') },
    { test: (x) => x.includes('/cadenas/nueva'), title: t('cadenas.tituloNueva') },
    { test: (x) => x.includes('/cadenas'), title: t('cadenas.titulo') },
    { test: (x) => x.includes('/adopcion/nueva'), title: t('adopcion.tituloNueva') },
    { test: (x) => x.includes('/postular'), title: t('adopcion.tituloPostular') },
    { test: (x) => x.includes('/postulaciones') && x.includes('/mis-'), title: t('adopcion.misPostulaciones') },
    { test: (x) => x.includes('/postulaciones'), title: t('adopcion.verPostulaciones') },
    { test: (x) => x.includes('/adopcion/favoritos'), title: t('adopcion.misFavoritos') },
    { test: (x) => x.includes('/adopcion/mis-publicaciones'), title: t('adopcion.misPublicaciones') },
    { test: (x) => x.includes('/adopcion/mis-postulaciones'), title: t('adopcion.misPostulaciones') },
    { test: (x) => x.includes('/adopcion'), title: t('adopcion.tituloLista') },
    { test: (x) => x.includes('/campanias/nueva'), title: t('campanias.tituloNueva') },
    { test: (x) => x.includes('/mis-inscripciones'), title: t('campanias.misInscripciones') },
    { test: (x) => x.includes('/inscripciones'), title: t('campanias.verInscriptos') },
    { test: (x) => x.includes('/campanias'), title: t('campanias.tituloLista') },
    { test: (x) => x.includes('/perdidos/nueva'), title: t('perdidos.tituloNueva') },
    { test: (x) => x.includes('/perdidos'), title: t('perdidos.tituloLista') },
    { test: (x) => x.includes('/transito/nueva'), title: t('transito.tituloNueva') },
    { test: (x) => x.includes('/transito'), title: t('transito.tituloLista') },
    { test: (x) => x.includes('/donaciones/nueva'), title: t('donaciones.tituloNueva') },
    { test: (x) => x.includes('/donaciones'), title: t('donaciones.tituloLista') },
    { test: (x) => x.includes('/veterinarias/nueva'), title: t('veterinarias.tituloNueva') },
    { test: (x) => x.includes('/veterinarias'), title: t('veterinarias.tituloLista') },
    { test: (x) => x.includes('/match/matches'), title: t('match.tituloMatches') },
    { test: (x) => x.includes('/match'), title: t('match.tituloLista') },
    { test: (x) => x.includes('/suscripcion'), title: t('suscripcion.tituloLista') },
    { test: (x) => x.includes('/productos/nueva'), title: t('productos.tituloNueva') },
    { test: (x) => x.includes('/productos/favoritos'), title: t('productos.misFavoritos') },
    { test: (x) => x.includes('/productos'), title: t('productos.tituloLista') },
    { test: (x) => x.includes('/carrito'), title: t('carrito.tituloLista') },
    { test: (x) => x.includes('/mis-compras'), title: t('pedidos.misCompras') },
    { test: (x) => x.includes('/mis-ventas'), title: t('pedidos.misVentas') },
    { test: (x) => x.includes('/pedidos'), title: t('pedidos.detalleTitulo') },
    { test: (x) => x.includes('/hueplay'), title: t('nav.hueplay') },
    { test: (x) => x.includes('/juego'), title: t('juego.titulo') },
    { test: (x) => x.includes('/admin/verificaciones'), title: t('admin.verificacionesTitulo') },
    { test: (x) => x.includes('/admin/denuncias'), title: t('admin.denunciasTitulo') },
    { test: (x) => x.includes('/admin/reportes'), title: t('admin.reportesTitulo') },
    { test: (x) => x.includes('/admin'), title: t('admin.titulo') },
    { test: (x) => x.includes('/perfil'), title: t('perfil.myProfile') },
    { test: (x) => x.includes('/noticias'), title: t('noticias.tabTitle') },
    { test: (x) => x.includes('/shorts'), title: t('shorts.tabTitle') },
    // Ojo: NO poner una regla `includes('/mas')` para la vieja solapa "Más".
    // Cazaba también `/mascota/12` —"mascota" contiene "mas"— y el detalle de
    // una mascota terminaba titulado "Configuración". La pantalla ya no existe
    // (se mudó a /configuracion), así que la regla se fue con ella.
  ];

  for (const rule of rules) {
    if (rule.test(p)) return rule.title;
  }

  return t('feed.tabTitle');
}
