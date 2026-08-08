import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { COLOR_FICHA_DAMAS } from './PiezaDamas';

type Props = {
  fila: number;
  col: number;
  lado: 1 | 2;
  tamano: number;
  /** Se llama cuando termina el fade — recién ahí el caller la saca del árbol. */
  onTerminada: () => void;
};

/** Una ficha que se está comiendo: se queda quieta en su casilla y se desvanece. */
export function PiezaComida({ fila, col, lado, tamano, onTerminada }: Props) {
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

  const color = COLOR_FICHA_DAMAS[lado];

  return (
    <Animated.View
      style={[
        styles.wrap,
        { width: tamano, height: tamano, left: col * tamano, top: fila * tamano },
        estilo,
      ]}
      pointerEvents="none"
    >
      <Svg width={tamano} height={tamano} viewBox={`0 0 ${tamano} ${tamano}`}>
        <Circle cx={tamano / 2} cy={tamano / 2} r={tamano * 0.38} fill={color} />
      </Svg>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
});
