import { Ionicons } from '@expo/vector-icons';
import React from 'react';
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

/**
 * Accesos directos de una lista ("Mis publicaciones", "Mis postulaciones"…):
 * tarjetas con un ícono en círculo de color, en vez de texto suelto.
 */
export function AtajosBar({ items }: { items: Atajo[] }) {
  const { colors } = useTheme();
  // Con tres o más, cada tarjeta es angosta: ícono arriba y el texto entero abajo.
  const columna = items.length >= 3;
  return (
    <View style={styles.fila}>
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
            style={[type.label, styles.texto, columna && { textAlign: 'center', flex: 0, alignSelf: 'stretch' }, { color: colors.text }]}
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
  fila: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingTop: 12 },
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
});
