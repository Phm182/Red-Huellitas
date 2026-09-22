import { useRef } from 'react';
import { GestureResponderEvent, PanResponder, PanResponderGestureState, PanResponderInstance } from 'react-native';

export type Direccion4 = 'arriba' | 'abajo' | 'izquierda' | 'derecha';

/**
 * Swipe continuo de 4 direcciones (HuePacMan) por `PanResponder`, mismo
 * criterio que `useGestoCaida.ts` de HueTetris/HueColumns: se re-evalúa en
 * CADA movimiento (no sólo al soltar), así un giro a mitad de gesto cambia
 * de intención sin soltar el dedo, y el eje dominante gana apenas supera el
 * umbral — sin pedir precisión.
 *
 * Reemplaza el `Gesture.Pan()` + `GestureDetector` de react-native-gesture-
 * handler que tenía antes: ver la nota larga en `useGestoCaida.ts` sobre por
 * qué gesture-handler no responde a ningún toque en este build y por qué
 * `PanResponder` es la alternativa que sí anda.
 */
export function useGestoDireccion(opts: { umbral?: number; onDireccion: (dir: Direccion4) => void; activo: boolean }): PanResponderInstance {
  const optsRef = useRef(opts);
  optsRef.current = opts;

  const panResponderRef = useRef<PanResponderInstance | null>(null);
  if (!panResponderRef.current) {
    panResponderRef.current = PanResponder.create({
      onStartShouldSetPanResponder: () => optsRef.current.activo,
      onMoveShouldSetPanResponder: () => optsRef.current.activo,
      onPanResponderMove: (_evt: GestureResponderEvent, g: PanResponderGestureState) => {
        const umbral = optsRef.current.umbral ?? 14;
        const { dx, dy } = g;
        if (Math.abs(dx) < umbral && Math.abs(dy) < umbral) return;
        const dir: Direccion4 = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'derecha' : 'izquierda') : dy > 0 ? 'abajo' : 'arriba';
        optsRef.current.onDireccion(dir);
      },
    });
  }

  return panResponderRef.current;
}
