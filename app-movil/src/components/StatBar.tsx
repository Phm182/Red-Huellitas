import { Ionicons } from '@expo/vector-icons';
import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { radii } from '../theme/elevation';
import { type } from '../theme/typography';
import { useTheme } from '../theme/ThemeProvider';

interface Props {
  etiqueta: string;
  /** 0-100 */
  valor: number;
  /** Icono de Ionicons que representa el stat (comida, juego, higiene…). */
  icono: keyof typeof Ionicons.glyphMap;
}

/**
 * Barra de stat del minijuego. Sigue el patrón track+fill de
 * historias/[userId].tsx (View contenedor con overflow:'hidden' + fill
 * animado), pero con Reanimated en vez de la API Animated legacy.
 */
export function StatBar({ etiqueta, valor, icono }: Props) {
  const { colors } = useTheme();
  const progreso = useSharedValue(valor);

  useEffect(() => {
    // Spring en vez de timing: al alimentar a la mascota la barra "rebota" un
    // poco al llenarse, que es lo que hace que la acción se sienta.
    progreso.value = withSpring(valor, { damping: 15, stiffness: 120 });
  }, [valor, progreso]);

  const estiloFill = useAnimatedStyle(() => ({
    width: `${Math.max(0, Math.min(100, progreso.value))}%`,
  }));

  // El color acompaña el estado: verde bien, ámbar a media máquina, rojo bajo.
  const color = valor >= 60 ? colors.success : valor >= 30 ? colors.warning : colors.danger;

  return (
    <View style={styles.contenedor}>
      <View style={styles.fila}>
        <View style={styles.etiquetaFila}>
          <Ionicons name={icono} size={14} color={color} />
          <Text style={[type.label, { color: colors.text }]}>{etiqueta}</Text>
        </View>
        <Text style={[type.caption, { color: colors.textMuted }]}>{Math.round(valor)}</Text>
      </View>
      <View style={[styles.track, { backgroundColor: colors.border }]}>
        <Animated.View style={[styles.fill, { backgroundColor: color }, estiloFill]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: { marginBottom: 12 },
  fila: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  etiquetaFila: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  track: { height: 10, borderRadius: radii.pill, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: radii.pill },
});
