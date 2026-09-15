import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Guardado de "partida pausada" para los juegos individuales en tiempo real
 * (HuePacMan/HueTetris/HueColumns). Sólo aplica a partidas SOLO — nunca a
 * duelo 1v1 ni reto del día (`esRetoAjeno`), pedido explícito: esos dos
 * siempre arrancan de cero.
 *
 * El estado de estos motores es JSON-plano salvo excepciones puntuales que
 * cada motor resuelve él mismo antes de llamar a `guardarPausa`/después de
 * `cargarPausa` (por ej. HuePacMan tiene `Set`s, HueTetris/HueColumns tienen
 * un generador de piezas en un `WeakMap` que no viaja con el objeto).
 */
const PREFIJO = '@red_huellitas/pausa/';

export async function guardarPausa<T>(juego: string, estado: T): Promise<void> {
  try {
    await AsyncStorage.setItem(PREFIJO + juego, JSON.stringify(estado));
  } catch {
    // Si falla el guardado no hay drama: la próxima vez arranca de cero.
  }
}

export async function cargarPausa<T>(juego: string): Promise<T | null> {
  try {
    const crudo = await AsyncStorage.getItem(PREFIJO + juego);
    return crudo ? (JSON.parse(crudo) as T) : null;
  } catch {
    return null;
  }
}

export async function borrarPausa(juego: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(PREFIJO + juego);
  } catch {
    // no-op
  }
}
