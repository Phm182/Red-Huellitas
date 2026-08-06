import React, { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { radii } from '../../theme/elevation';
import { useTheme } from '../../theme/ThemeProvider';
import { Ficha } from '../huematch/Ficha';

type Props = {
  tipo: number;
  lado: number;
  /** Boca arriba: porque la tocaste, o porque ya la resolviste. */
  abierta: boolean;
  hecha: boolean;
  onPress: () => void;
  accessibilityLabel: string;
};

/**
 * Una carta de HueMemo, con el giro real.
 *
 * El giro es una rotación en Y de 180°, no un fundido: la cara de atrás y la de
 * adelante son dos capas que ocupan el mismo lugar y cada una se esconde cuando
 * le toca estar de espaldas. Sin `backfaceVisibility` se verían las dos
 * superpuestas a mitad de camino.
 *
 * El valor animado sigue a `abierta`, así que el "volver a girar" cuando no
 * coinciden sale gratis: la pantalla vuelve a poner `abierta` en false y la
 * carta gira sola para el otro lado.
 */
export function CartaMemo({ tipo, lado, abierta, hecha, onPress, accessibilityLabel }: Props) {
  const { colors } = useTheme();

  const giro = useSharedValue(abierta ? 1 : 0);
  const acierto = useSharedValue(0);

  useEffect(() => {
    // Spring y no timing: el rebote al final es lo que da la sensación de
    // carta física, y es barato.
    giro.value = withSpring(abierta ? 1 : 0, { damping: 14, stiffness: 140 });
  }, [abierta, giro]);

  useEffect(() => {
    if (!hecha) {
      acierto.value = 0;
      return;
    }
    // Al acertar: un golpe de escala y después se aquieta apagada. El delay
    // deja ver la segunda carta dada vuelta antes de celebrar.
    acierto.value = withDelay(
      120,
      withSequence(
        withTiming(1, { duration: 180 }),
        withTiming(0.5, { duration: 260 })
      )
    );
  }, [hecha, acierto]);

  const estiloFrente = useAnimatedStyle(() => ({
    transform: [
      { perspective: 700 },
      { rotateY: `${interpolate(giro.value, [0, 1], [180, 360])}deg` },
      { scale: 1 + acierto.value * 0.14 },
    ],
    opacity: interpolate(giro.value, [0, 0.5, 1], [0, 0, 1]),
  }));

  const estiloDorso = useAnimatedStyle(() => ({
    transform: [
      { perspective: 700 },
      { rotateY: `${interpolate(giro.value, [0, 1], [0, 180])}deg` },
    ],
    opacity: interpolate(giro.value, [0, 0.5, 1], [1, 0, 0]),
  }));

  const estiloCaja = useAnimatedStyle(() => ({
    // Las resueltas se apagan: dejan de ser tocables y no tienen que seguir
    // compitiendo por la atención con las que faltan.
    opacity: hecha ? 0.55 : 1,
  }));

  return (
    <Pressable onPress={onPress} style={styles.toque} accessibilityLabel={accessibilityLabel}>
      <Animated.View style={[styles.caja, estiloCaja]}>
        <Animated.View
          style={[
            styles.cara,
            estiloDorso,
            { backgroundColor: colors.primary, borderColor: colors.border },
          ]}
        >
          <Ionicons name="paw" size={lado * 0.34} color={colors.primaryText} />
        </Animated.View>

        <Animated.View
          style={[
            styles.cara,
            estiloFrente,
            {
              backgroundColor: colors.surface,
              borderColor: hecha ? colors.success : colors.border,
            },
          ]}
        >
          <Ficha tipo={tipo} size={lado * 0.6} />
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  toque: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
  caja: { width: '92%', height: '92%' },
  cara: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: radii.md,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    // Sin esto se ven las dos caras encimadas a mitad del giro.
    backfaceVisibility: 'hidden',
  },
});
