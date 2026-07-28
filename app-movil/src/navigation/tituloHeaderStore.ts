import { useSyncExternalStore } from 'react';

/**
 * Título del header puesto por la pantalla, no deducido de la ruta.
 *
 * `titleForPath()` sólo ve el pathname, así que para `/mascota/12` lo mejor que
 * puede decir es "Mascota". El nombre del animal recién se conoce cuando la
 * pantalla lo trajo del servidor, y es lo que el usuario espera leer arriba.
 *
 * Vive fuera de React —mismo patrón que `avatarDisplayStore`— para que el
 * título no parpadee entre el unmount de una pantalla y el mount de la
 * siguiente.
 *
 * La ruta se guarda junto al título a propósito: si sólo se guardara el texto,
 * al volver atrás quedaría el nombre de la mascota colgado en una pantalla que
 * ya no es esa. El header sólo usa el título si la ruta actual coincide.
 */
type Snapshot = { ruta: string | null; titulo: string | null };

let snapshot: Snapshot = { ruta: null, titulo: null };
const listeners = new Set<() => void>();

/** Fija el título para una ruta. Llamar cuando llegaron los datos. */
export function setTituloHeader(ruta: string, titulo: string): void {
  if (snapshot.ruta === ruta && snapshot.titulo === titulo) {
    return; // misma referencia: useSyncExternalStore entra en loop si cambia sin motivo
  }
  snapshot = { ruta, titulo };
  listeners.forEach((l) => l());
}

export function limpiarTituloHeader(): void {
  if (snapshot.ruta === null && snapshot.titulo === null) return;
  snapshot = { ruta: null, titulo: null };
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): Snapshot {
  return snapshot;
}

/** Devuelve el título puesto a mano si corresponde a esta ruta, o null. */
export function useTituloHeader(pathname: string): string | null {
  const s = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return s.ruta === pathname ? s.titulo : null;
}
