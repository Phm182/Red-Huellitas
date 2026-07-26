import React, { useEffect } from 'react';
import { DimensionValue, StyleSheet, View, ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { radii } from '../../theme/elevation';
import { useTheme } from '../../theme/ThemeProvider';

/**
 * Placeholder con pulso mientras carga el contenido.
 *
 * Reemplaza al `<ActivityIndicator />` centrado que hoy está repetido en 42
 * pantallas: un spinner en el medio de la pantalla vacía es lo que más delata
 * "app vieja", porque no anticipa nada de lo que va a aparecer. Mostrar la
 * silueta del contenido hace que la espera se sienta más corta aunque tarde
 * exactamente lo mismo.
 */

interface SkeletonProps {
  width?: DimensionValue;
  height?: number;
  radius?: number;
  style?: ViewStyle;
}

export function Skeleton({ width = '100%', height = 16, radius = radii.sm, style }: SkeletonProps) {
  const { colors } = useTheme();
  const progreso = useSharedValue(0);

  useEffect(() => {
    // Ida y vuelta infinita. Se anima la opacidad y no la posición de un
    // gradiente porque un translateX sobre decenas de filas a la vez tiene un
    // costo real en gama baja, y el pulso se lee igual de bien.
    progreso.value = withRepeat(
      withTiming(1, { duration: 900, easing: Easing.inOut(Easing.quad) }),
      -1,
      true
    );
  }, [progreso]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: 0.4 + progreso.value * 0.35,
  }));

  return (
    <Animated.View
      style={[
        { width, height, borderRadius: radius, backgroundColor: colors.border },
        animStyle,
        style,
      ]}
    />
  );
}

/** Silueta de una tarjeta de listado (foto cuadrada + dos líneas de texto). */
export function SkeletonCard() {
  const { colors } = useTheme();

  return (
    <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface }]}>
      <Skeleton width={64} height={64} radius={radii.sm} />
      <View style={styles.cardTexto}>
        <Skeleton width="70%" height={15} />
        <Skeleton width="45%" height={12} style={{ marginTop: 8 }} />
        <Skeleton width="30%" height={12} style={{ marginTop: 8 }} />
      </View>
    </View>
  );
}

/** Varias `SkeletonCard` seguidas, para el estado de carga de un listado. */
export function SkeletonList({ cantidad = 5 }: { cantidad?: number }) {
  return (
    <View style={styles.lista}>
      {Array.from({ length: cantidad }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </View>
  );
}

/** Silueta de una publicación del feed (autor + imagen grande + acciones). */
export function SkeletonPost() {
  const { colors } = useTheme();

  return (
    <View style={[styles.post, { borderColor: colors.border, backgroundColor: colors.surface }]}>
      <View style={styles.postAutor}>
        <Skeleton width={40} height={40} radius={radii.pill} />
        <View style={{ flex: 1 }}>
          <Skeleton width="45%" height={14} />
          <Skeleton width="25%" height={11} style={{ marginTop: 6 }} />
        </View>
      </View>
      <Skeleton width="100%" height={260} radius={0} style={{ marginTop: 12 }} />
      <View style={styles.postAcciones}>
        <Skeleton width={70} height={14} />
        <Skeleton width={70} height={14} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  lista: { padding: 16, gap: 12 },
  card: {
    flexDirection: 'row',
    gap: 12,
    borderWidth: 1,
    borderRadius: radii.md,
    padding: 12,
  },
  cardTexto: { flex: 1, justifyContent: 'center' },
  post: { borderWidth: 1, borderRadius: radii.lg, overflow: 'hidden', marginBottom: 16 },
  postAutor: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12 },
  postAcciones: { flexDirection: 'row', gap: 16, padding: 12 },
});
