import AsyncStorage from '@react-native-async-storage/async-storage';
import type { MapaPunto, MapaTipo } from '../types/mapa';

/**
 * Caché de los puntos del mapa, con vencimiento por día.
 *
 * Entrar y salir del mapa varias veces al día no tiene por qué golpear siete
 * tablas cada vez: las publicaciones no cambian tanto. Se guarda el resultado y
 * se reusa hasta que cambia el día.
 *
 * **Ojo con lo que esto NO ahorra.** Mapbox factura por mapa creado, no por
 * datos, así que este caché no baja el consumo de Mapbox ni un punto — eso lo
 * resuelve reutilizar la instancia del mapa (ver `MapaLienzo.web.tsx`). Lo que
 * sí ahorra es trabajo del servidor propio y hace que el mapa abra al instante.
 */

const PREFIJO = '@red_huellitas/mapa/';

export interface MapaCacheEntrada {
  guardadoEn: number;
  dia: string;
  centro: { lat: number; lng: number };
  puntos: MapaPunto[];
  porTipo: Partial<Record<MapaTipo, number>>;
}

function hoy(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * La clave incluye el centro redondeado a ~1 km, el radio y los tipos.
 *
 * Redondeado y no exacto: con coordenadas al metro, moverse media cuadra
 * generaría una clave nueva y el caché no acertaría nunca. A 2 decimales
 * (~1,1 km) el mismo barrio comparte entrada, que es el comportamiento útil.
 */
export function claveMapa(
  centro: { lat: number; lng: number },
  radioKm: number,
  tipos: MapaTipo[]
): string {
  const lat = centro.lat.toFixed(2);
  const lng = centro.lng.toFixed(2);
  const t = [...tipos].sort().join('-') || 'todos';
  return `${PREFIJO}${lat},${lng}|${radioKm}|${t}`;
}

/** Devuelve lo cacheado si es de hoy; null si no hay o si venció. */
export async function leerCacheMapa(clave: string): Promise<MapaCacheEntrada | null> {
  try {
    const crudo = await AsyncStorage.getItem(clave);
    if (!crudo) return null;
    const entrada = JSON.parse(crudo) as MapaCacheEntrada;
    if (entrada.dia !== hoy()) {
      await AsyncStorage.removeItem(clave);
      return null;
    }
    return entrada;
  } catch {
    // Un caché ilegible no es un error: se pide de nuevo al servidor.
    return null;
  }
}

export async function guardarCacheMapa(
  clave: string,
  datos: Omit<MapaCacheEntrada, 'guardadoEn' | 'dia'>
): Promise<void> {
  try {
    const entrada: MapaCacheEntrada = { ...datos, guardadoEn: Date.now(), dia: hoy() };
    await AsyncStorage.setItem(clave, JSON.stringify(entrada));
  } catch {
    // Sin espacio o storage bloqueado: seguir sin caché, no romper el mapa.
  }
}

/** Borra todo lo cacheado del mapa. Para el "actualizar" manual. */
export async function limpiarCacheMapa(): Promise<void> {
  try {
    const claves = await AsyncStorage.getAllKeys();
    const mias = claves.filter((k) => k.startsWith(PREFIJO));
    if (mias.length > 0) await AsyncStorage.multiRemove(mias);
  } catch {
    // idem
  }
}

// ---------------------------------------------------------------------------
// Ancla de sesión: cuándo vale la pena gastar una carga de mapa
// ---------------------------------------------------------------------------

/**
 * Pedir una sesión de mapa es lo único que **cuesta**: Mapbox factura por mapa
 * creado, no por datos. Así que la sesión se ata a un lugar —el "ancla"— y se
 * reusa mientras el usuario siga cerca.
 *
 * La regla, tal como la pidió el usuario: si nunca te alejás más de 50 km del
 * ancla, **nunca** se pide un mapa nuevo. Las publicaciones sí se refrescan
 * (eso sale del servidor propio y no cuesta nada); lo que se congela es la
 * descarga del mapa en sí, que es lo que se paga.
 *
 * El "actualizar" manual queda como válvula de escape, pero limitado a una vez
 * por semana: sin ese tope, un usuario apretando el botón por costumbre podría
 * gastar el presupuesto mensual de todos en una tarde.
 */

const CLAVE_ANCLA = `${PREFIJO}ancla`;

/** Fuera de este radio se considera que el usuario está en otra ciudad. */
export const RADIO_ANCLA_KM = 50;

/** Un forzado por semana. Es el único camino para bajar mapa sin mudarse. */
export const ESPERA_FORZADO_MS = 7 * 24 * 60 * 60 * 1000;

export interface AnclaMapa {
  lat: number;
  lng: number;
  /** Cuándo se consumió la carga que dejó esta ancla. */
  creadaEn: number;
  /** Último "actualizar" manual, para el tope semanal. */
  ultimoForzadoEn: number | null;
}

/** Distancia en km entre dos puntos (haversine). */
export function distanciaKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

export async function leerAncla(): Promise<AnclaMapa | null> {
  try {
    const crudo = await AsyncStorage.getItem(CLAVE_ANCLA);
    return crudo ? (JSON.parse(crudo) as AnclaMapa) : null;
  } catch {
    return null;
  }
}

async function guardarAncla(ancla: AnclaMapa): Promise<void> {
  try {
    await AsyncStorage.setItem(CLAVE_ANCLA, JSON.stringify(ancla));
  } catch {
    // Sin storage se pierde el ahorro, no la función.
  }
}

/** Deja registrado que se consumió una carga estando en `coords`. */
export async function anclarSesion(coords: { lat: number; lng: number } | null): Promise<void> {
  const previa = await leerAncla();
  await guardarAncla({
    lat: coords?.lat ?? previa?.lat ?? 0,
    lng: coords?.lng ?? previa?.lng ?? 0,
    creadaEn: Date.now(),
    ultimoForzadoEn: previa?.ultimoForzadoEn ?? null,
  });
}

export interface DecisionSesion {
  /** ¿Hay que pedirle una sesión nueva al servidor? */
  pedir: boolean;
  motivo: 'sin_ancla' | 'lejos' | 'forzado' | 'reusa';
  /** Km hasta el ancla, para poder explicarlo en pantalla. */
  distanciaKm: number | null;
}

/**
 * Decide si corresponde gastar una carga de mapa.
 *
 * `forzar` es el botón de actualizar: sólo pasa si ya venció la semana.
 */
export async function decidirSesion(
  coords: { lat: number; lng: number } | null,
  forzar = false
): Promise<DecisionSesion> {
  const ancla = await leerAncla();

  if (!ancla) {
    return { pedir: true, motivo: 'sin_ancla', distanciaKm: null };
  }

  const lejos = coords ? distanciaKm(coords, ancla) : null;

  if (lejos !== null && lejos > RADIO_ANCLA_KM) {
    return { pedir: true, motivo: 'lejos', distanciaKm: lejos };
  }

  if (forzar) {
    const vencio =
      ancla.ultimoForzadoEn === null || Date.now() - ancla.ultimoForzadoEn >= ESPERA_FORZADO_MS;
    if (vencio) {
      return { pedir: true, motivo: 'forzado', distanciaKm: lejos };
    }
  }

  return { pedir: false, motivo: 'reusa', distanciaKm: lejos };
}

/** Marca que se usó el forzado semanal. Se llama sólo si `decidirSesion` lo dejó. */
export async function marcarForzado(): Promise<void> {
  const ancla = await leerAncla();
  if (!ancla) return;
  await guardarAncla({ ...ancla, ultimoForzadoEn: Date.now() });
}

/** Cuándo vuelve a estar disponible el forzado. null = ya está disponible. */
export async function proximoForzado(): Promise<number | null> {
  const ancla = await leerAncla();
  if (!ancla?.ultimoForzadoEn) return null;
  const cuando = ancla.ultimoForzadoEn + ESPERA_FORZADO_MS;
  return cuando > Date.now() ? cuando : null;
}

// ---------------------------------------------------------------------------
// La sesión guardada
// ---------------------------------------------------------------------------

/**
 * La sesión (motor + token + estilo) se guarda en el dispositivo.
 *
 * Sin esto la regla de las 50 km no serviría de nada: cada vez que se abre el
 * mapa habría que preguntarle al servidor cuál es el token, y ese pedido es
 * justamente el que descuenta una carga del presupuesto.
 *
 * El token es el público (`pk.`), el mismo que ya viaja al cliente para dibujar
 * el mapa; guardarlo no expone nada que el usuario no tuviera ya.
 */
const CLAVE_SESION = `${PREFIJO}sesion/`;

export async function leerSesionCache<T>(modo: string): Promise<T | null> {
  try {
    const crudo = await AsyncStorage.getItem(CLAVE_SESION + modo);
    return crudo ? (JSON.parse(crudo) as T) : null;
  } catch {
    return null;
  }
}

export async function guardarSesionCache(modo: string, sesion: unknown): Promise<void> {
  try {
    await AsyncStorage.setItem(CLAVE_SESION + modo, JSON.stringify(sesion));
  } catch {
    // Sin caché se vuelve a pedir; molesto, no roto.
  }
}
