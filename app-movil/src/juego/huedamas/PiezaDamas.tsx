import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

/** Madera oscura para el retador, madera clara para el retado — no rosa/azul: acá el color es el tablero. */
export const COLOR_FICHA_DAMAS: Record<1 | 2, string> = {
  1: '#6B4226',
  2: '#F1D9A0',
};

type Props = {
  fila: number;
  col: number;
  lado: 1 | 2;
  esDama: boolean;
  tamano: number;
  resaltada?: boolean;
};

/**
 * Una ficha de Damas que se desliza entre casillas.
 *
 * A diferencia de `FichaCae` (que sólo cae en Y porque en Conecta4 las fichas
 * no se mueven una vez puestas), acá la posición cambia en los dos ejes cada
 * vez que la pieza se mueve o come — por eso anima `translateX`/`translateY`
 * juntos en vez de detectar una transición de "vacío a ocupado".
 */
export function PiezaDamas({ fila, col, lado, esDama, tamano, resaltada }: Props) {
  const x = useSharedValue(col * tamano);
  const y = useSharedValue(fila * tamano);
  const escalaCorona = useSharedValue(esDama ? 1 : 0);
  const eraDama = useRef(esDama);

  useEffect(() => {
    x.value = withTiming(col * tamano, { duration: 260, easing: Easing.out(Easing.quad) });
    y.value = withTiming(fila * tamano, { duration: 260, easing: Easing.out(Easing.quad) });
  }, [fila, col, tamano, x, y]);

  useEffect(() => {
    if (!eraDama.current && esDama) {
      // Pop al coronar: crece de golpe y vuelve con un rebote chico.
      escalaCorona.value = withSequence(
        withTiming(1.5, { duration: 180 }),
        withSpring(1, { damping: 9, stiffness: 180 })
      );
    } else {
      escalaCorona.value = esDama ? 1 : 0;
    }
    eraDama.current = esDama;
  }, [esDama, escalaCorona]);

  const estiloPosicion = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }, { translateY: y.value }],
  }));
  const estiloCorona = useAnimatedStyle(() => ({
    opacity: escalaCorona.value,
    transform: [{ scale: escalaCorona.value }],
  }));

  const color = COLOR_FICHA_DAMAS[lado];
  const colorCorona = lado === 1 ? COLOR_FICHA_DAMAS[2] : COLOR_FICHA_DAMAS[1];
  const radio = tamano * 0.38;

  return (
    <Animated.View
      style={[styles.wrap, { width: tamano, height: tamano }, estiloPosicion]}
      pointerEvents="none"
    >
      <Svg width={tamano} height={tamano} viewBox={`0 0 ${tamano} ${tamano}`}>
        <Circle
          cx={tamano / 2}
          cy={tamano / 2}
          r={radio}
          fill={color}
          stroke={resaltada ? '#FFFFFF' : 'rgba(0,0,0,0.25)'}
          strokeWidth={resaltada ? 3 : 1.5}
        />
      </Svg>
      <Animated.View style={[styles.corona, estiloCorona]} pointerEvents="none">
        <Ionicons name="star" size={tamano * 0.34} color={colorCorona} />
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', top: 0, left: 0, alignItems: 'center', justifyContent: 'center' },
  corona: { position: 'absolute' },
});
