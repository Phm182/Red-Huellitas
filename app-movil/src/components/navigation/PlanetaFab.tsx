import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform, Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { hapticMedio } from '../../utils/haptics';

/** Ancho del hueco que el botón ocupa dentro de la fila de hubs. */
export const PLANETA_HUECO = 74;

type Props = {
  /** Mismo posicionamiento que la barra: fixed en web, absolute en nativo. */
  positionStyle: ViewStyle;
  /** A qué altura queda, para que sobresalga por encima de la barra. */
  bottom: number;
  activo: boolean;
};

/**
 * El planeta: entrada al mapa, en el centro de la barra y sobresaliendo.
 *
 * Sobresale porque es la acción más importante de la app y tiene que leerse
 * como distinta de los 6 hubs, no como uno más de la fila.
 *
 * El anillo que gira es lento (6 s por vuelta) a propósito: un botón que está
 * siempre a la vista, en todas las pantallas, con una animación rápida cansa a
 * los cinco minutos. Tiene que sugerir movimiento, no pedir atención.
 */
export function PlanetaFab({ positionStyle, bottom, activo }: Props) {
  const { t } = useTranslation();
  const giro = useSharedValue(0);

  useEffect(() => {
    giro.value = withRepeat(
      withTiming(1, { duration: 6000, easing: Easing.linear }),
      -1,
      false
    );
  }, [giro]);

  const anilloStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${giro.value * 360}deg` }],
  }));

  return (
    <View
      style={[styles.capa, positionStyle, { bottom }]}
      pointerEvents="box-none"
    >
      <Pressable
        onPress={() => {
          hapticMedio();
          router.push('/(app)/mapa' as never);
        }}
        style={styles.boton}
        accessibilityRole="button"
        accessibilityLabel={t('mapa.titulo')}
      >
        {/* Halo difuso detrás */}
        <View style={styles.halo} />

        {/* Anillo orbital girando */}
        <Animated.View style={[styles.anillo, anilloStyle]}>
          <View style={styles.anilloPunto} />
        </Animated.View>

        <LinearGradient
          colors={activo ? ['#7B61FF', '#4CC9F0'] : ['#4CC9F0', '#7B61FF']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.esfera}
        >
          <Ionicons name="planet" size={27} color="#fff" />
        </LinearGradient>
      </Pressable>

      <Text style={styles.etiqueta} numberOfLines={1}>
        {t('mapa.titulo')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  capa: { alignItems: 'center', zIndex: 45 },
  boton: { alignItems: 'center', justifyContent: 'center', width: 62, height: 62 },

  halo: {
    position: 'absolute',
    width: 74,
    height: 74,
    borderRadius: 37,
    backgroundColor: 'rgba(76,201,240,0.22)',
    ...Platform.select({
      web: { filter: 'blur(9px)' } as object,
      default: {},
    }),
  },

  esfera: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#4CC9F0',
    shadowOpacity: 0.75,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 12,
  },

  anillo: {
    position: 'absolute',
    width: 66,
    height: 66,
    borderRadius: 33,
    borderWidth: 1.4,
    borderColor: 'rgba(123,97,255,0.55)',
    borderStyle: 'dashed',
    alignItems: 'center',
  },
  anilloPunto: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#4CC9F0',
    marginTop: -2.5,
  },

  etiqueta: {
    marginTop: 2,
    fontSize: 10,
    fontWeight: '700',
    color: '#4CC9F0',
  },
});
