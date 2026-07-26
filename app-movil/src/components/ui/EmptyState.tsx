import { Ionicons } from '@expo/vector-icons';
import { usePathname } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, useWindowDimensions, View, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  APP_HEADER_HEIGHT,
  APP_TAB_BAR_HEIGHT,
  chromeForPath,
} from '../../navigation/chrome';
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
  /**
   * Centra el mensaje en el área útil de la pantalla (bajo el header y
   * sobre el menú). Default true. Poné false si va inline dentro de un
   * perfil u otra sección con contenido arriba.
   */
  fillScreen?: boolean;
}

/** Altura útil de contenido bajo el chrome de la app. */
export function useContentAreaHeight(restar = 0): number {
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const chrome = chromeForPath(pathname);
  const header = chrome.header ? APP_HEADER_HEIGHT + insets.top : 0;
  const tab = chrome.tabBar ? APP_TAB_BAR_HEIGHT + Math.max(insets.bottom - 8, 0) : 0;
  // `restar` es para lo que la pantalla dibuja por encima y el chrome no
  // conoce — hoy, la barra de Huellitas y las solapas de Huelligram.
  return Math.max(height - header - tab - restar, 240);
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
  fillScreen = true,
}: EmptyStateProps) {
  const { colors } = useTheme();
  const areaHeight = useContentAreaHeight();

  return (
    <View
      style={[
        styles.contenedor,
        fillScreen ? { minHeight: areaHeight, justifyContent: 'center' } : styles.inline,
        style,
      ]}
    >
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
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: { alignItems: 'center', paddingHorizontal: 32 },
  inline: { paddingVertical: 48 },
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
