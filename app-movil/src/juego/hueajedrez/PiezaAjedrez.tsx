import React, { useEffect, useRef } from 'react';
import { StyleSheet, Text } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';

export type TipoPieza = 'P' | 'N' | 'B' | 'R' | 'Q' | 'K';

/** Glifos Unicode de ajedrez: evitan tener que dibujar 12 iconos a mano y son universalmente reconocibles. */
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
  resaltada?: boolean;
};

/**
 * Una pieza de ajedrez que se desliza entre casillas — mismo patrón que
 * `PiezaDamas` (2 ejes animados con `withTiming`), pero acá el glifo Unicode
 * hace de dibujo en vez de un SVG. `textShadow` le pone un contorno del color
 * contrario para que se vea nítida sobre cualquier casilla, clara u oscura.
 */
export function PiezaAjedrez({ fila, col, lado, tipo, tamano, resaltada }: Props) {
  const x = useSharedValue(col * tamano);
  const y = useSharedValue(fila * tamano);
  const escalaPromocion = useSharedValue(1);
  const tipoAnterior = useRef(tipo);

  useEffect(() => {
    x.value = withTiming(col * tamano, { duration: 260, easing: Easing.out(Easing.quad) });
    y.value = withTiming(fila * tamano, { duration: 260, easing: Easing.out(Easing.quad) });
  }, [fila, col, tamano, x, y]);

  useEffect(() => {
    if (tipoAnterior.current === 'P' && tipo === 'Q') {
      // Pop al coronar: crece de golpe y vuelve con un rebote chico.
      escalaPromocion.value = withSequence(
        withTiming(1.5, { duration: 180 }),
        withSpring(1, { damping: 9, stiffness: 180 })
      );
    }
    tipoAnterior.current = tipo;
  }, [tipo, escalaPromocion]);

  const estiloPosicion = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }, { translateY: y.value }, { scale: escalaPromocion.value }],
  }));

  const color = lado === 1 ? '#F5F0E6' : '#1F1B16';
  const contorno = lado === 1 ? '#1F1B16' : '#F5F0E6';

  return (
    <Animated.View style={[styles.wrap, { width: tamano, height: tamano }, estiloPosicion]} pointerEvents="none">
      <Text
        style={[
          styles.glifo,
          {
            fontSize: tamano * 0.72,
            color,
            textShadowColor: contorno,
            textShadowRadius: resaltada ? 4 : 2,
            textShadowOffset: { width: 0, height: 0 },
          },
        ]}
      >
        {GLIFOS[lado][tipo]}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', top: 0, left: 0, alignItems: 'center', justifyContent: 'center' },
  glifo: { textAlign: 'center' },
});
