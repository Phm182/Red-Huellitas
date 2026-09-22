/**
 * Bus mínimo para avisar "cumpliste un objetivo" desde cualquier lugar.
 *
 * El servidor devuelve `objetivosNuevos` en la respuesta de cada partida (sea
 * solo, duelo, reto del día o trivia); `client.ts` lo detecta ahí y lo emite,
 * y `AvisoObjetivos` (montado una sola vez en la raíz) lo muestra. Así ninguna
 * pantalla de juego tiene que acordarse de mostrarlo.
 */
export type ObjetivoNuevo = { codigo: string; xp: number };
type Oyente = (nuevos: ObjetivoNuevo[]) => void;

const oyentes = new Set<Oyente>();

export function avisarObjetivos(nuevos: ObjetivoNuevo[]): void {
  if (nuevos.length === 0) return;
  oyentes.forEach((o) => o(nuevos));
}

export function escucharObjetivos(o: Oyente): () => void {
  oyentes.add(o);
  return () => {
    oyentes.delete(o);
  };
}
