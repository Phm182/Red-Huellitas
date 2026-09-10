import React, { useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import { Direccion } from './motor';

type Props = {
  onDireccion: (dir: Direccion) => void;
  color: string;
  colorFondo: string;
  colorPomo: string;
};

const LADO = 128;
const RADIO = LADO / 2;
const POMO = 52;
/** Cuánto hay que alejar el pomo del centro (px) para que cuente como una
 * dirección — con menos que esto no pasa nada (zona muerta), así un toque
 * flojo o un temblor no dispara un giro. */
const ZONA_MUERTA = 16;
const RECORRIDO_MAX = RADIO - POMO / 2;

/**
 * Joystick analógico para HuePacMan: se apoya el dedo en cualquier parte del
 * disco y se arrastra hacia dónde ir — el eje dominante gana. A diferencia
 * de los botones (`DPad.tsx`), NO hay que levantar el dedo para cambiar de
 * dirección: mientras se sostiene, cada movimiento del dedo reevalúa el
 * rumbo (pedido explícito: "para más comodidad y no tener que estar
 * levantando el dedo").
 *
 * El pomo se dibuja con estado local — no dispara re-render del juego, es un
 * `useState` chico de este componente nomás.
 */
export function JoystickPacman({ onDireccion, color, colorFondo, colorPomo }: Props) {
  const [pomo, setPomo] = useState({ x: 0, y: 0 });
  // La última dirección emitida — para no spamear `onDireccion` con la misma
  // en cada frame del arrastre (igual `pedirDireccion` es idempotente, pero
  // así evitamos trabajo al pedo).
  const ultimaRef = useRef<Direccion | null>(null);

  const emitir = (dx: number, dy: number) => {
    const dist = Math.hypot(dx, dy);
    if (dist < ZONA_MUERTA) {
      ultimaRef.current = null;
      return;
    }
    const dir: Direccion = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'derecha' : 'izquierda') : dy > 0 ? 'abajo' : 'arriba';
    if (dir !== ultimaRef.current) {
      ultimaRef.current = dir;
      onDireccion(dir);
    }
  };

  const clampPomo = (dx: number, dy: number) => {
    const dist = Math.hypot(dx, dy);
    if (dist <= RECORRIDO_MAX || dist === 0) return { x: dx, y: dy };
    const k = RECORRIDO_MAX / dist;
    return { x: dx * k, y: dy * k };
  };

  const gesto = Gesture.Pan()
    .minDistance(0)
    .onUpdate((e) => {
      // `translation` es desde donde tocó, no desde el centro — como el dedo
      // se apoya en cualquier lado, alcanza para dar dirección relativa.
      runOnJS(setPomo)(clampPomo(e.translationX, e.translationY));
      runOnJS(emitir)(e.translationX, e.translationY);
    })
    .onEnd(() => {
      runOnJS(setPomo)({ x: 0, y: 0 });
      ultimaRef.current = null;
    });

  return (
    <GestureDetector gesture={gesto}>
      <View style={[styles.base, { backgroundColor: colorFondo, borderColor: color }]}>
        <View style={[styles.cruz, styles.cruzH, { backgroundColor: color }]} />
        <View style={[styles.cruz, styles.cruzV, { backgroundColor: color }]} />
        <View
          style={[
            styles.pomo,
            { backgroundColor: colorPomo, transform: [{ translateX: pomo.x }, { translateY: pomo.y }] },
          ]}
        />
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  base: {
    width: LADO,
    height: LADO,
    borderRadius: RADIO,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cruz: { position: 'absolute', opacity: 0.25, borderRadius: 2 },
  cruzH: { width: LADO * 0.6, height: 3 },
  cruzV: { width: 3, height: LADO * 0.6 },
  pomo: { width: POMO, height: POMO, borderRadius: POMO / 2 },
});
