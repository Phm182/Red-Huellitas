import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { type } from '../../theme/typography';
import { useTheme } from '../../theme/ThemeProvider';

/** Encabezado de sección con acción opcional a la derecha ("Ver todo"). */
export function SectionHeader({
  titulo,
  accionLabel,
  onAccion,
  style,
}: {
  titulo: string;
  accionLabel?: string;
  onAccion?: () => void;
  style?: ViewStyle;
}) {
  const { colors } = useTheme();

  return (
    <View style={[styles.fila, style]}>
      <Text style={[type.titleSm, { color: colors.text, flex: 1 }]}>{titulo}</Text>
      {accionLabel && onAccion ? (
        <Pressable onPress={onAccion} style={styles.accion} hitSlop={8}>
          <Text style={[type.label, { color: colors.primary }]}>{accionLabel}</Text>
          <Ionicons name="chevron-forward" size={14} color={colors.primary} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  fila: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  accion: { flexDirection: 'row', alignItems: 'center', gap: 2 },
});
