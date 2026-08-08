import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

/** Las 7 disposiciones de puntos de un dado (índice = valor, 0 sin usar). */
const PUNTOS: Record<number, [number, number][]> = {
  1: [[1, 1]],
  2: [[0, 0], [2, 2]],
  3: [[0, 0], [1, 1], [2, 2]],
  4: [[0, 0], [0, 2], [2, 0], [2, 2]],
  5: [[0, 0], [0, 2], [1, 1], [2, 0], [2, 2]],
  6: [[0, 0], [0, 2], [1, 0], [1, 2], [2, 0], [2, 2]],
};

type Props = {
  valor: number | null;
  tirando: boolean;
  tamano?: number;
  color: string;
};

/** El dado de HueLudo: gira mientras se tira y muestra los puntos del valor final. */
export function Dado({ valor, tirando, tamano = 56, color }: Props) {
  const rotacion = useSharedValue(0);
  const escala = useSharedValue(1);

  useEffect(() => {
    if (tirando) {
      rotacion.value = withTiming(rotacion.value + 360 * 2 + 40, {
        duration: 550,
        easing: Easing.out(Easing.cubic),
      });
      escala.value = withSequence(
        withTiming(1.15, { duration: 150 }),
        withTiming(1, { duration: 200 })
      );
    }
  }, [tirando, rotacion, escala]);

  const estilo = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotacion.value}deg` }, { scale: escala.value }],
  }));

  const celda = tamano / 3;
  const puntos = valor ? PUNTOS[valor] ?? [] : [];

  return (
    <Animated.View
      style={[
        styles.dado,
        { width: tamano, height: tamano, borderRadius: tamano * 0.2, borderColor: color },
        estilo,
      ]}
    >
      {puntos.map(([f, c], i) => (
        <View
          key={i}
          style={[
            styles.punto,
            {
              backgroundColor: color,
              width: celda * 0.32,
              height: celda * 0.32,
              borderRadius: celda * 0.16,
              top: f * celda + celda * 0.34,
              left: c * celda + celda * 0.34,
            },
          ]}
        />
      ))}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  dado: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  punto: { position: 'absolute' },
});
