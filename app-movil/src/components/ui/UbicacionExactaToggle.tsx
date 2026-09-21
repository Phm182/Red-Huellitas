import React from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../theme/ThemeProvider';

/**
 * Elegir si el mapa muestra la ubicación EXACTA de la publicación o una
 * aproximada (corrida hasta ~500 m, ver `rh_geo_difuminar` en el backend).
 *
 * Aproximada es el default a propósito: para una publicación de una persona la
 * dirección precisa es su casa, así que mostrarla exacta tiene que ser una
 * decisión explícita de quien publica.
 */
export function UbicacionExactaToggle({
  value,
  onChange,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  return (
    <View style={[styles.caja, { borderColor: colors.border, backgroundColor: colors.surface }]}>
      <View style={styles.fila}>
        <Text style={[styles.titulo, { color: colors.text }]}>{t('ubicacionExacta.titulo')}</Text>
        <Switch
          value={value}
          onValueChange={onChange}
          trackColor={{ true: colors.primary, false: colors.border }}
        />
      </View>
      <Text style={[styles.ayuda, { color: colors.textMuted }]}>
        {value ? t('ubicacionExacta.ayudaExacta') : t('ubicacionExacta.ayudaAproximada')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  // `paddingRight` grande: los botones flotantes (notificaciones, chat) tapan el borde derecho de la pantalla.
  caja: { borderWidth: 1, borderRadius: 12, padding: 12, paddingRight: 64, marginTop: 10, marginBottom: 12, gap: 6 },
  fila: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  titulo: { flex: 1, fontSize: 14, fontWeight: '600' },
  ayuda: { fontSize: 12, lineHeight: 17 },
});
