import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
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

/**
 * El dado de HueLudo: gira mientras se tira y muestra los puntos del valor
 * final. Cara marfil con degradé sutil (arriba más clara, abajo más oscura)
 * para que lea como un cubo con volumen y no un cuadrado plano; los puntos
 * llevan un pequeño resalto/sombra para simular el hoyo tallado de un dado
 * real en vez de un círculo plano pegado encima.
 */
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
  const radio = tamano * 0.22;

  return (
    <Animated.View style={[styles.sombraWrap, { width: tamano, height: tamano }, estilo]}>
      <LinearGradient
        colors={['#FFFDF7', '#F1ECDD', '#DFD6BE']}
        locations={[0, 0.55, 1]}
        style={[styles.dado, { width: tamano, height: tamano, borderRadius: radio, borderColor: color }]}
      >
        <View style={[styles.brillo, { width: tamano * 0.6, height: tamano * 0.32, borderRadius: tamano * 0.2, top: tamano * 0.08 }]} />
        {puntos.map(([f, c], i) => (
          <View
            key={i}
            style={[
              styles.puntoSombra,
              {
                width: celda * 0.36,
                height: celda * 0.36,
                borderRadius: celda * 0.18,
                top: f * celda + celda * 0.32,
                left: c * celda + celda * 0.32,
              },
            ]}
          >
            <View
              style={[
                styles.punto,
                {
                  backgroundColor: color,
                  width: celda * 0.32,
                  height: celda * 0.32,
                  borderRadius: celda * 0.16,
                },
              ]}
            />
          </View>
        ))}
      </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  sombraWrap: {
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.35,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 4 },
      },
      android: { elevation: 8 },
    }),
  },
  dado: {
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  brillo: {
    position: 'absolute',
    alignSelf: 'center',
    backgroundColor: 'rgba(255,255,255,0.55)',
  },
  puntoSombra: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.12)',
  },
  punto: {},
});
