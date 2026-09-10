import React from 'react';
import { StyleSheet } from 'react-native';
import Svg, { Line } from 'react-native-svg';
import { Vector } from './motor';

type Props = {
  /** Dirección de tiro (ya normalizada) — hacia dónde sale la blanca. */
  direccion: Vector;
  /** Cuánto se aleja la punta del taco de la bola — crece con la potencia
   * cargada (ver `MesaPool.tsx`, se recalcula en cada `onUpdate` del
   * arrastre, igual que antes se recalculaba para `FlechaTiro`). */
  separacion: number;
  /** Centro de la bola blanca, en unidades de mesa. */
  base: Vector;
  px: (x: number) => number;
  py: (y: number) => number;
  lado: number;
  alto: number;
};

const LARGO = 150;
const RADIO_BOLA_PX_MARGEN = 2; // separación mínima de la punta a la bola, aunque `separacion` sea 0

/**
 * Taco de billar: aparece mientras se carga el tiro (arrastre) y se aleja
 * de la blanca a más potencia — reemplaza a la vieja `FlechaTiro` (ver
 * `MesaPool.tsx`): ya comunica dirección (su orientación) y potencia (la
 * separación) de forma más real, una flecha al lado sería redundante.
 *
 * Es sólo la VARA — la animación de golpe (acercarse rápido a la bola al
 * soltar) vive en `MesaPool.tsx` vía un `useSharedValue` que anima
 * `separacion` hacia 0 con `withTiming`, no acá: este componente sólo
 * dibuja con los números que le pasan, sea cual sea su origen.
 */
export function TacoBillar({ direccion, separacion, base, px, py, lado, alto }: Props) {
  const cx = px(base.x);
  const cy = py(base.y);
  // La punta mira HACIA la bola (dirección opuesta al tiro), a `separacion`
  // de distancia; el resto de la vara se extiende hacia atrás desde ahí.
  const puntaX = cx - direccion.x * (RADIO_BOLA_PX_MARGEN + separacion);
  const puntaY = cy - direccion.y * (RADIO_BOLA_PX_MARGEN + separacion);
  const colaX = puntaX - direccion.x * LARGO;
  const colaY = puntaY - direccion.y * LARGO;
  // Punto intermedio, cerca de la punta: ahí termina la "suela" clara y
  // arranca la madera — mismo criterio que un taco real (contera clara,
  // cuerpo de madera).
  const suelaX = puntaX - direccion.x * 10;
  const suelaY = puntaY - direccion.y * 10;

  return (
    <Svg width={lado} height={alto} style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* Cuerpo de madera: una línea ancha oscura de base + una angosta clara
          encima, desplazada, simulando una veta/brillo lateral. */}
      <Line x1={suelaX} y1={suelaY} x2={colaX} y2={colaY} stroke="#6B4226" strokeWidth={9} strokeLinecap="round" />
      <Line x1={suelaX} y1={suelaY} x2={colaX} y2={colaY} stroke="#C89B6B" strokeWidth={4} strokeLinecap="round" opacity={0.8} />
      {/* Suela/contera: clara, corta, en la punta. */}
      <Line x1={puntaX} y1={puntaY} x2={suelaX} y2={suelaY} stroke="#EAD9C0" strokeWidth={7} strokeLinecap="round" />
    </Svg>
  );
}
