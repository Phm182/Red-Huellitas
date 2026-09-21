import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { elevation, radii } from '../../theme/elevation';
import { type } from '../../theme/typography';
import { useTheme } from '../../theme/ThemeProvider';
import { hapticLeve } from '../../utils/haptics';

export type Atajo = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
};

type Props = {
  items?: Atajo[];
  /** Botón de crear (relleno, destacado). Con `label` se cambia el "Crear" por defecto. */
  crear?: { onPress: () => void; label?: string };
};

/**
 * Barra inferior de una lista: accesos directos ("Publicaciones",
 * "Postulaciones"…) como tarjetas con ícono en círculo, y el botón de crear.
 * Va al pie de la pantalla, por encima del botón redondo del planeta.
 */
export function AtajosBar({ items = [], crear }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  // Con tres o más, cada tarjeta es angosta: ícono arriba y el texto entero abajo.
  const columna = items.length + (crear ? 1 : 0) >= 3;

  return (
    <View style={styles.fila}>
      {crear ? (
        <Pressable
          onPress={() => {
            hapticLeve();
            crear.onPress();
          }}
          style={({ pressed }) => [
            styles.tarjeta,
            columna && styles.tarjetaColumna,
            elevation.sm,
            { backgroundColor: colors.primary, borderColor: colors.primary, opacity: pressed ? 0.88 : 1 },
          ]}
          accessibilityRole="button"
        >
          <View style={[styles.circulo, { backgroundColor: 'rgba(255,255,255,0.25)' }]}>
            <Ionicons name="add" size={22} color={colors.primaryText} />
          </View>
          <Text
            style={[type.label, styles.texto, columna && styles.textoColumna, { color: colors.primaryText }]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.75}
          >
            {crear.label ?? t('common.crear')}
          </Text>
        </Pressable>
      ) : null}
      {items.map((a) => (
        <Pressable
          key={a.label}
          onPress={() => {
            hapticLeve();
            a.onPress();
          }}
          style={({ pressed }) => [
            styles.tarjeta,
            columna && styles.tarjetaColumna,
            elevation.sm,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              opacity: pressed ? 0.85 : 1,
            },
          ]}
          accessibilityRole="button"
          accessibilityLabel={a.label}
        >
          <View style={[styles.circulo, { backgroundColor: colors.primarySoft }]}>
            <Ionicons name={a.icon} size={18} color={colors.primary} />
          </View>
          <Text
            style={[type.label, styles.texto, columna && styles.textoColumna, { color: colors.text }]}
            numberOfLines={columna ? 1 : 2}
            adjustsFontSizeToFit
            minimumFontScale={0.75}
          >
            {a.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  // El padding de abajo deja libre el botón del planeta, que sobresale de la barra.
  fila: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 40 },
  tarjeta: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 52,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: radii.lg,
    borderWidth: 1,
  },
  tarjetaColumna: { flexDirection: 'column', justifyContent: 'center', gap: 6, paddingHorizontal: 6 },
  circulo: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  texto: { flex: 1, fontWeight: '700', fontSize: 13, lineHeight: 16 },
  textoColumna: { textAlign: 'center', flex: 0, alignSelf: 'stretch' },
});
