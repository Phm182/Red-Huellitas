import React, { useEffect } from 'react';
import { StyleSheet, Text } from 'react-native';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { TipoPieza } from './PiezaAjedrez';

const GLIFOS: Record<1 | 2, Record<TipoPieza, string>> = {
  1: { K: '♔', Q: '♕', R: '♖', B: '♗', N: '♘', P: '♙' },
  2: { K: '♚', Q: '♛', R: '♜', B: '♝', N: '♞', P: '♟' },
};

type Props = {
  fila: number;
  col: number;
  lado: 1 | 2;
  tipo: TipoPieza;
  tamano: number;
  /** Se llama cuando termina el fade — recién ahí el caller la saca del árbol. */
  onTerminada: () => void;
};

/** Una pieza que se está comiendo: se queda quieta en su casilla y se desvanece. */
export function PiezaComida({ fila, col, lado, tipo, tamano, onTerminada }: Props) {
  const opacidad = useSharedValue(1);
  const escala = useSharedValue(1);

  useEffect(() => {
    opacidad.value = withTiming(0, { duration: 320 });
    escala.value = withTiming(0.3, { duration: 320 }, (terminado) => {
      if (terminado) {
        runOnJS(onTerminada)();
      }
    });
    // Se dispara una sola vez al montar: esta pieza vive sólo mientras dura el fade.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const estilo = useAnimatedStyle(() => ({
    opacity: opacidad.value,
    transform: [{ scale: escala.value }],
  }));

  const color = lado === 1 ? '#F5F0E6' : '#1F1B16';
  const contorno = lado === 1 ? '#1F1B16' : '#F5F0E6';

  return (
    <Animated.View
      style={[
        styles.wrap,
        { width: tamano, height: tamano, left: col * tamano, top: fila * tamano },
        estilo,
      ]}
      pointerEvents="none"
    >
      <Text
        style={[
          styles.glifo,
          { fontSize: tamano * 0.72, color, textShadowColor: contorno, textShadowRadius: 2, textShadowOffset: { width: 0, height: 0 } },
        ]}
      >
        {GLIFOS[lado][tipo]}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  glifo: { textAlign: 'center' },
});
