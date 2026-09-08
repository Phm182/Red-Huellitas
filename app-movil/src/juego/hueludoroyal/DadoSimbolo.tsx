import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { SimboloLudoRoyal } from '../../types/hueplay';

type Props = {
  simbolo: SimboloLudoRoyal | null;
  tirando: boolean;
  tamano?: number;
  color: string;
};

/**
 * El segundo dado de HueLudo Real: mismo cubo blanco con borde que `Dado`
 * (el numérico), pero en vez de puntos muestra un ícono — corona, pluma, o
 * nada en la cara "en blanco". Reutiliza el mismo esquema de animación
 * (gira + rebota al tirar) para que las dos tiradas se vean como un mismo
 * gesto de dos dados sobre la mesa.
 */
export function DadoSimbolo({ simbolo, tirando, tamano = 56, color }: Props) {
  const rotacion = useSharedValue(0);
  const escala = useSharedValue(1);

  useEffect(() => {
    if (tirando) {
      rotacion.value = withTiming(rotacion.value + 360 * 2 + 60, {
        duration: 550,
        easing: Easing.out(Easing.cubic),
      });
      escala.value = withSequence(withTiming(1.15, { duration: 150 }), withTiming(1, { duration: 200 }));
    }
  }, [tirando, rotacion, escala]);

  const estilo = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotacion.value}deg` }, { scale: escala.value }],
  }));

  const icono = simbolo === 'corona' ? 'crown' : simbolo === 'pluma' ? 'feather' : null;

  return (
    <Animated.View
      style={[styles.dado, { width: tamano, height: tamano, borderRadius: tamano * 0.2, borderColor: color }, estilo]}
    >
      {icono ? <MaterialCommunityIcons name={icono} size={tamano * 0.55} color={color} /> : null}
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
});
