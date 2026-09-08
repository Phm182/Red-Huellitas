import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

/** Negras para el retador, marfil para el retado — mismo criterio que Damas: el color es la ficha, no un rosa/azul genérico. */
export const COLOR_FICHA_REVERSI: Record<1 | 2, string> = {
  1: '#262421',
  2: '#F4F1E6',
};

type Props = {
  lado: 1 | 2;
  tamano: number;
};

/**
 * Una ficha de HueReversi.
 *
 * A diferencia de `PiezaDamas`, acá la posición nunca cambia — una ficha
 * colocada no se mueve, sólo cambia de color al ser flanqueada. Por eso no
 * anima traslación: anima un achicado en X (el disco "de canto") y recién en
 * el punto más angosto cambia el color mostrado, simulando el volteo real de
 * la ficha física. La primera vez que se monta (se acaba de colocar) hace un
 * pop de entrada.
 */
export function PiezaReversi({ lado, tamano }: Props) {
  const escalaX = useSharedValue(1);
  const escalaPop = useSharedValue(0);
  const [colorLado, setColorLado] = useState(lado);
  const primeraVez = useRef(true);

  useEffect(() => {
    escalaPop.value = withSpring(1, { damping: 10, stiffness: 220 });
    // Sólo al montar: el pop de "ficha recién colocada".
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (primeraVez.current) {
      primeraVez.current = false;
      setColorLado(lado);
      return;
    }
    if (colorLado === lado) return;
    escalaX.value = withSequence(
      withTiming(0, { duration: 130, easing: Easing.in(Easing.quad) }, (terminado) => {
        if (terminado) runOnJS(setColorLado)(lado);
      }),
      withTiming(1, { duration: 130, easing: Easing.out(Easing.quad) })
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lado]);

  const estilo = useAnimatedStyle(() => ({
    transform: [{ scale: escalaPop.value }, { scaleX: escalaX.value }],
  }));

  const radio = tamano * 0.4;

  return (
    <Animated.View style={[styles.wrap, { width: tamano, height: tamano }, estilo]} pointerEvents="none">
      <Svg width={tamano} height={tamano} viewBox={`0 0 ${tamano} ${tamano}`}>
        <Circle
          cx={tamano / 2}
          cy={tamano / 2}
          r={radio}
          fill={COLOR_FICHA_REVERSI[colorLado]}
          stroke="rgba(0,0,0,0.3)"
          strokeWidth={1.5}
        />
      </Svg>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', top: 0, left: 0, alignItems: 'center', justifyContent: 'center' },
});
