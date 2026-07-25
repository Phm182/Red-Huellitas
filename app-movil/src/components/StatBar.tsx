import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useTheme } from '../theme/ThemeProvider';

interface Props {
  etiqueta: string;
  /** 0-100 */
  valor: number;
  icono: string;
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
    progreso.value = withTiming(valor, { duration: 400 });
  }, [valor, progreso]);

  const estiloFill = useAnimatedStyle(() => ({
    width: `${Math.max(0, Math.min(100, progreso.value))}%`,
  }));

  // El color acompaña el estado: verde bien, ámbar a media máquina, rojo bajo.
  const color = valor >= 60 ? colors.success : valor >= 30 ? colors.warning : colors.danger;

  return (
    <View style={styles.contenedor}>
      <View style={styles.fila}>
        <Text style={{ color: colors.textMuted, fontSize: 12 }}>
          {icono} {etiqueta}
        </Text>
        <Text style={{ color: colors.textMuted, fontSize: 12 }}>{Math.round(valor)}</Text>
      </View>
      <View style={[styles.track, { backgroundColor: colors.border }]}>
        <Animated.View style={[styles.fill, { backgroundColor: color }, estiloFill]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: { marginBottom: 10 },
  fila: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  track: { height: 8, borderRadius: 4, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 4 },
});
