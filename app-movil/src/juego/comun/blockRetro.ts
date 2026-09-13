/**
 * Helpers de color para el look "bloque biselado" de consola de 16 bits
 * (HueTetris/HueColumns, pedido explícito: réplica del Tetris/Columns de
 * Sega Genesis). RN soporta color por lado de borde
 * (`borderTopColor`/`borderLeftColor`/...), así que un bloque con look 3D
 * sale con un solo `View`: relleno del color base, borde superior/izquierdo
 * más CLARO (luz) y borde inferior/derecho más OSCURO (sombra) — sin
 * gradientes ni Svg, barato de renderizar para una grilla de 200 celdas.
 */
function clamp255(n: number): number {
  return Math.max(0, Math.min(255, n));
}

function aRgb(hex: string): [number, number, number] {
  const limpio = hex.replace('#', '');
  return [parseInt(limpio.slice(0, 2), 16), parseInt(limpio.slice(2, 4), 16), parseInt(limpio.slice(4, 6), 16)];
}

function aHex([r, g, b]: [number, number, number]): string {
  return `#${[r, g, b].map((v) => clamp255(Math.round(v)).toString(16).padStart(2, '0')).join('')}`;
}

export function aclarar(hex: string, cantidad: number): string {
  const [r, g, b] = aRgb(hex);
  return aHex([r + (255 - r) * cantidad, g + (255 - g) * cantidad, b + (255 - b) * cantidad]);
}

export function oscurecer(hex: string, cantidad: number): string {
  const [r, g, b] = aRgb(hex);
  return aHex([r * (1 - cantidad), g * (1 - cantidad), b * (1 - cantidad)]);
}
