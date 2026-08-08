import React, { useEffect } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { celdaDeFicha, COLOR_JUGADOR } from './TableroLudo';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type Props = {
  jugador: number;
  num: number;
  /** -1 corral, 0-50 camino, 51-56 tramo final, 57 meta. Cambiarlo anima el deslizamiento a la nueva casilla. */
  pos: number;
  tamano: number;
  resaltada?: boolean;
  onPress?: () => void;
};

/**
 * Una ficha de HueLudo. Se posiciona sola a partir de `pos` (igual criterio
 * que `PiezaDamas` con fila/col): quien la mueve un tramo largo (varias
 * casillas de una tirada) tiene que ir actualizando `pos` casilla por
 * casilla con una pequeña espera entre medio para que se vea "caminar" —
 * ver `reproducirJugada` en `ludo.tsx`.
 */
export function Ficha({ jugador, num, pos, tamano, resaltada, onPress }: Props) {
  const cell = tamano / 15;
  const [fila, col] = celdaDeFicha(jugador, pos, num);
  // Los 4 corrales tienen 4 fichas fijas por slot, así que ahí nunca se
  // pisan. En el resto del tablero, varias fichas (propias o de otro color)
  // pueden compartir casilla: un offset chico por número de ficha evita que
  // se tapen del todo entre sí.
  const jitterX = pos === -1 ? 0 : (num % 2 === 0 ? -1 : 1) * cell * 0.14;
  const jitterY = pos === -1 ? 0 : (num < 2 ? -1 : 1) * cell * 0.14;

  const x = useSharedValue(col * cell + jitterX);
  const y = useSharedValue(fila * cell + jitterY);
  const escala = useSharedValue(1);

  useEffect(() => {
    x.value = withTiming(col * cell + jitterX, { duration: 260, easing: Easing.out(Easing.quad) });
    y.value = withTiming(fila * cell + jitterY, { duration: 260, easing: Easing.out(Easing.quad) });
  }, [fila, col, cell, jitterX, jitterY, x, y]);

  useEffect(() => {
    if (pos === 57) {
      escala.value = withSequence(
        withTiming(1.6, { duration: 200 }),
        withSpring(1.15, { damping: 8, stiffness: 180 })
      );
    }
  }, [pos, escala]);

  const estilo = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }, { translateY: y.value }, { scale: escala.value }],
  }));

  const radio = cell * 0.32;
  const color = COLOR_JUGADOR[jugador];

  return (
    <AnimatedPressable
      onPress={onPress}
      disabled={!onPress}
      style={[styles.wrap, { width: cell, height: cell }, estilo]}
      pointerEvents={onPress ? 'auto' : 'none'}
    >
      <Svg width={cell} height={cell} viewBox={`0 0 ${cell} ${cell}`}>
        <Circle
          cx={cell / 2}
          cy={cell / 2}
          r={radio}
          fill={color}
          stroke={resaltada ? '#FFFFFF' : 'rgba(0,0,0,0.25)'}
          strokeWidth={resaltada ? 3 : 1.5}
        />
      </Svg>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', top: 0, left: 0, alignItems: 'center', justifyContent: 'center' },
});
