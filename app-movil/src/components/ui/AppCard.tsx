import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { elevation, radii } from '../../theme/elevation';
import { useTheme } from '../../theme/ThemeProvider';

/**
 * Superficie elevada genérica: bloques de detalle, formularios agrupados,
 * cajas de totales. Es la versión sin foto ni press de `ListCard`.
 */
export function AppCard({
  children,
  padding = 16,
  style,
}: {
  children: React.ReactNode;
  padding?: number;
  style?: ViewStyle;
}) {
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.card,
        elevation.sm,
        { borderColor: colors.border, backgroundColor: colors.surface, padding },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: radii.md, marginBottom: 12 },
});
