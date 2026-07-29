/**
 * Look-at con suavizado (lerp) — cabeza/ojos siguen dedo o cursor.
 *
 * En Rive: alimentá inputs Number `lookX` / `lookY` (-1..1) cada frame.
 * En InteractivePet: mismos valores mueven parallax + highlight.
 */

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

/** Convierte punto de pantalla → look local (-1..1) respecto al centro del stage. */
export function screenToLookAt(
  pageX: number,
  pageY: number,
  stage: { x: number; y: number; w: number; h: number }
): { x: number; y: number } {
  const cx = stage.x + stage.w / 2;
  const cy = stage.y + stage.h / 2;
  const nx = (pageX - cx) / (stage.w / 2);
  const ny = (pageY - cy) / (stage.h / 2);
  return {
    x: clamp(nx, -1, 1),
    y: clamp(ny, -1, 1),
  };
}

/** Factor de suavizado típico por frame (~60fps). 0.12 = premium, no nervioso. */
export const LOOK_LERP = 0.14;
