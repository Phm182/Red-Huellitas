import React from 'react';
import { RefreshControl, ScrollView, StyleSheet, View, ViewStyle } from 'react-native';
import { centeredContent } from '../../theme/layout';
import { useTheme } from '../../theme/ThemeProvider';
import { Atmosphere } from '../Atmosphere';

interface ScreenProps {
  children: React.ReactNode;
  /** Envuelve en un ScrollView. Usar `false` cuando adentro hay un FlatList. */
  scroll?: boolean;
  /** Fondo con gradiente. Reservado para hubs y pantallas de entrada. */
  atmosphere?: boolean;
  onRefresh?: () => void;
  refreshing?: boolean;
  padding?: number;
  contentStyle?: ViewStyle;
}

/**
 * Contenedor de pantalla: fondo, ancho máximo centrado (desktop) y
 * pull-to-refresh consistente.
 *
 * Antes cada pantalla repetía `flex:1 + backgroundColor + centeredContent +
 * padding`, y el pull-to-refresh estaba en algunas listas sí y en otras no.
 */
export function Screen({
  children,
  scroll = false,
  atmosphere = false,
  onRefresh,
  refreshing = false,
  padding = 16,
  contentStyle,
}: ScreenProps) {
  const { colors } = useTheme();

  const cuerpo = scroll ? (
    <ScrollView
      contentContainerStyle={[{ padding, flexGrow: 1 }, centeredContent, contentStyle]}
      showsVerticalScrollIndicator={false}
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        ) : undefined
      }
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.flex, centeredContent, contentStyle]}>{children}</View>
  );

  if (atmosphere) {
    return <Atmosphere>{cuerpo}</Atmosphere>;
  }

  return <View style={[styles.flex, { backgroundColor: colors.background }]}>{cuerpo}</View>;
}

const styles = StyleSheet.create({
  flex: { flex: 1, width: '100%' },
});
