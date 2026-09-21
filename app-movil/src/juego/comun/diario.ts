/**
 * El reto del día de HueTetris y HueColumns dura como máximo 3 minutos.
 *
 * Sin tope, quien no pierde jugaba horas y el reto perdía la gracia: ahora el
 * puntaje del día es lo que se junta en esos 3 minutos (o hasta perder, lo que
 * pase primero). El motor sigue sumando puntos por líneas/combos como siempre;
 * lo único que cambia es cuándo se corta la partida.
 */
export const LIMITE_DIARIO_SEGUNDOS = 180;

/** 3:00, 2:07, 0:09... para mostrar lo que queda. */
export function formatoTiempo(segundos: number): string {
  const s = Math.max(0, Math.ceil(segundos));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
