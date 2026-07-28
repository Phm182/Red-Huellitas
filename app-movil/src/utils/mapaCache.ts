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
