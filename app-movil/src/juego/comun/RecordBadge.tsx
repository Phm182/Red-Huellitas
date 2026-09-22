import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { fonts } from '../../theme/typography';
import { useTheme } from '../../theme/ThemeProvider';

/**
 * "Tu récord: N puntos" arriba de todo, antes de arrancar — 0 si es la
 * primera vez. Mismo componente para los 8 juegos de puntaje de HuePlay.
 */
export function RecordBadge({ record }: { record: number | null }) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  return (
    <View style={[styles.pastilla, { backgroundColor: colors.primarySoft, borderColor: colors.primary }]}>
      <Ionicons name="trophy" size={14} color={colors.primary} />
      {record === null ? (
        <ActivityIndicator size="small" color={colors.primary} />
      ) : (
        <Text style={[styles.texto, { color: colors.primary }]}>
          {t('hueplay.tuRecord', { n: record })}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  pastilla: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'center',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginBottom: 14,
  },
  texto: { fontFamily: fonts.bodySemi, fontSize: 13 },
});
