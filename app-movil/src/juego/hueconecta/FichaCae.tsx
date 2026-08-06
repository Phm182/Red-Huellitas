import React, { useEffect, useRef } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

type Props = {
  /** '0' vacío, '1' retador, '2' retado. */
  valor: string;
  fila: number;
  lado: number;
  /** La celda es parte de la línea de 4 que ganó. */
  ganadora: boolean;
  children: React.ReactNode;
};

/**
 * Envuelve una casilla de HueConecta para que la ficha caiga.
 *
 * La caída se dispara al detectar la transición de vacío a ocupado, y arranca
 * desde arriba de TODO el tablero, no desde la celda de al lado: la distancia
 * depende de la fila donde termina apoyada, que es lo que hace que una ficha
 * que llega al piso caiga más que una que se apila arriba.
 *
 * El rebote corto al final es lo que la hace sentir física; sin él la ficha
 * frena en seco y parece pegada.
 */
export function FichaCae({ valor, fila, lado, ganadora, children }: Props) {
  const anterior = useRef(valor);
  const caida = useSharedValue(0);
  const brillo = useSharedValue(0);

  useEffect(() => {
    const antes = anterior.current;
    anterior.current = valor;

    if (antes === '0' && valor !== '0') {
      // +1 para que arranque por encima del borde del tablero, no en la fila 0.
      caida.value = -(fila + 1);
      caida.value = withSpring(0, { damping: 12, stiffness: 170, mass: 0.7 });
    }
  }, [valor, fila, caida]);

  useEffect(() => {
    // Las 4 de la línea ganadora laten, para que se vea POR QUÉ se ganó y no
    // sólo que la partida terminó.
    brillo.value = ganadora
      ? withSequence(
          withTiming(1, { duration: 260 }),
          withTiming(0.35, { duration: 420 }),
          withTiming(1, { duration: 420 })
        )
      : withTiming(0, { duration: 160 });
  }, [ganadora, brillo]);

  const estilo = useAnimatedStyle(() => ({
    transform: [
      { translateY: caida.value * lado },
      { scale: 1 + brillo.value * 0.12 },
    ],
  }));

  return <Animated.View style={[styles.wrap, estilo]}>{children}</Animated.View>;
}

const styles = StyleSheet.create({
  wrap: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
});
