import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { radii } from '../../theme/elevation';
import { type } from '../../theme/typography';
import { useTheme } from '../../theme/ThemeProvider';
import { AppButton } from '../AppButton';

interface EmptyStateProps {
  /** Icono de Ionicons; elegir uno que hable del contenido que falta. */
  icon: keyof typeof Ionicons.glyphMap;
  titulo: string;
  descripcion?: string;
  /** CTA opcional. Un vacío con salida es mucho mejor que uno sin salida. */
  accionLabel?: string;
  onAccion?: () => void;
  style?: ViewStyle;
}

/**
 * Estado vacío con icono, título y salida.
 *
 * Reemplaza al `<Text>` suelto que hoy usan 20 pantallas como
 * `ListEmptyComponent`. Una lista vacía con una sola línea de texto gris se
 * lee como un error; con un icono y un botón se lee como "todavía no pasó
 * nada, hacé esto".
 */
export function EmptyState({
  icon,
  titulo,
  descripcion,
  accionLabel,
  onAccion,
  style,
}: EmptyStateProps) {
  const { colors } = useTheme();

  return (
    <Animated.View entering={FadeInDown.duration(320)} style={[styles.contenedor, style]}>
      <View style={[styles.iconoCaja, { backgroundColor: colors.primarySoft }]}>
        <Ionicons name={icon} size={30} color={colors.primary} />
      </View>

      <Text style={[type.titleSm, styles.titulo, { color: colors.text }]}>{titulo}</Text>

      {descripcion ? (
        <Text style={[type.bodySm, styles.descripcion, { color: colors.textMuted }]}>
          {descripcion}
        </Text>
      ) : null}

      {accionLabel && onAccion ? (
        <AppButton label={accionLabel} onPress={onAccion} style={styles.boton} />
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  contenedor: { alignItems: 'center', paddingHorizontal: 32, paddingVertical: 48 },
  iconoCaja: {
    width: 68,
    height: 68,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  titulo: { textAlign: 'center' },
  descripcion: { textAlign: 'center', marginTop: 6 },
  boton: { marginTop: 20, alignSelf: 'stretch' },
});
