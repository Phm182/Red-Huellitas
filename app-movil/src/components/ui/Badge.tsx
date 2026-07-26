import React from 'react';
import { StyleSheet, Text, ViewStyle } from 'react-native';
import { View } from 'react-native';
import { radii } from '../../theme/elevation';
import { type } from '../../theme/typography';
import { useTheme } from '../../theme/ThemeProvider';

export type BadgeTono = 'neutral' | 'primary' | 'accent' | 'success' | 'warning' | 'danger';

/**
 * Píldora de estado: "Disponible", "Entregado", "Pendiente", el tipo de una
 * publicación. Antes cada pantalla se armaba la suya con colores a mano, y
 * los mismos estados terminaban de distinto color según dónde los miraras.
 */
export function Badge({
  label,
  tono = 'neutral',
  style,
}: {
  label: string;
  tono?: BadgeTono;
  style?: ViewStyle;
}) {
  const { colors } = useTheme();

  const fondos: Record<BadgeTono, string> = {
    neutral: colors.backgroundAlt,
    primary: colors.primarySoft,
    accent: colors.accentSoft,
    success: colors.accentSoft,
    warning: colors.primarySoft,
    danger: colors.primarySoft,
  };
  const textos: Record<BadgeTono, string> = {
    neutral: colors.textMuted,
    primary: colors.primary,
    accent: colors.accent,
    success: colors.success,
    warning: colors.warning,
    danger: colors.danger,
  };

  return (
    <View style={[styles.badge, { backgroundColor: fondos[tono] }, style]}>
      <Text style={[type.caption, { color: textos[tono] }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: radii.pill,
    paddingVertical: 4,
    paddingHorizontal: 10,
    alignSelf: 'flex-start',
  },
});
