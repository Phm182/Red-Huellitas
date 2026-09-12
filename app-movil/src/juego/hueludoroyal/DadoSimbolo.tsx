import { MaterialCommunityIcons } from '@expo/vector-icons';
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
import { SimboloLudoRoyal } from '../../types/hueplay';

type Props = {
  simbolo: SimboloLudoRoyal | null;
  tirando: boolean;
  tamano?: number;
  color: string;
};

/** Corona en dorado, pluma en celeste — cada símbolo con su propio color de
 * cara en vez del mismo ícono monocromo del color del jugador: así se
 * distinguen de un vistazo, como las caras pintadas del dado físico. */
const TEMA: Record<'corona' | 'pluma', { icono: 'crown' | 'feather'; tinte: string; halo: string }> = {
  corona: { icono: 'crown', tinte: '#B8860B', halo: 'rgba(255,215,0,0.28)' },
  pluma: { icono: 'feather', tinte: '#2E7D9A', halo: 'rgba(94,196,224,0.28)' },
};

/**
 * El segundo dado de HueLudo Real: mismo cubo con volumen que `Dado` (el
 * numérico) — cara marfil con degradé + sombra propia — pero en vez de
 * puntos muestra un ícono con halo de color propio (corona dorada, pluma
 * celeste) o la cara lisa "en blanco". Misma animación de giro+rebote para
 * que las dos tiradas se vean como un mismo gesto de dos dados sobre la mesa.
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

  const tema = simbolo === 'corona' || simbolo === 'pluma' ? TEMA[simbolo] : null;
  const radio = tamano * 0.22;

  return (
    <Animated.View style={[styles.sombraWrap, { width: tamano, height: tamano }, estilo]}>
      <LinearGradient
        colors={['#FFFDF7', '#F1ECDD', '#DFD6BE']}
        locations={[0, 0.55, 1]}
        style={[styles.dado, { width: tamano, height: tamano, borderRadius: radio, borderColor: color }]}
      >
        <View style={[styles.brillo, { width: tamano * 0.6, height: tamano * 0.32, borderRadius: tamano * 0.2, top: tamano * 0.08 }]} />
        {tema ? (
          <View style={[styles.halo, { width: tamano * 0.7, height: tamano * 0.7, borderRadius: tamano * 0.35, backgroundColor: tema.halo }]}>
            <MaterialCommunityIcons name={tema.icono} size={tamano * 0.48} color={tema.tinte} />
          </View>
        ) : null}
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
  halo: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
