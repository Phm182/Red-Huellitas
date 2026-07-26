import { useSyncExternalStore } from 'react';

/**
 * Store de preview del avatar fuera de React.
 * Sobrevive remounts de pantallas/modales; la foto nueva no puede
 * “volverse atrás” porque un GET o un unmount limpie el state.
 *
 * IMPORTANTE: getSnapshot debe devolver la MISMA referencia si no cambió
 * nada — si no, useSyncExternalStore entra en loop infinito.
 */
type Snapshot = { uri: string | null; path: string | null; version: number };

let snapshot: Snapshot = { uri: null, path: null, version: 0 };
const listeners = new Set<() => void>();

function emit(next: Snapshot) {
  snapshot = next;
  listeners.forEach((l) => l());
}

export function setAvatarDisplay(nextUri: string, nextPath?: string | null): void {
  const path = nextPath !== undefined ? nextPath : snapshot.path;
  if (snapshot.uri === nextUri && snapshot.path === path) {
    return;
  }
  emit({ uri: nextUri, path, version: snapshot.version + 1 });
}

export function clearAvatarDisplay(): void {
  if (snapshot.uri === null && snapshot.path === null) {
    return;
  }
  emit({ uri: null, path: null, version: snapshot.version + 1 });
}

export function getAvatarDisplaySnapshot(): Snapshot {
  return snapshot;
}

export function subscribeAvatarDisplay(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useAvatarDisplay(): Snapshot {
  return useSyncExternalStore(subscribeAvatarDisplay, getAvatarDisplaySnapshot, getAvatarDisplaySnapshot);
}
