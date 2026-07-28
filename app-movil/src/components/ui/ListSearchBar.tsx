import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, TextInput, View, ViewStyle } from 'react-native';
import { radii } from '../../theme/elevation';
import { fonts } from '../../theme/typography';
import { useTheme } from '../../theme/ThemeProvider';

type Props = {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  /** Sin márgenes laterales; pensado para ir en una fila junto a chips. */
  embedded?: boolean;
  style?: ViewStyle;
};

/** Buscador compacto para filtrar listas por texto. */
export function ListSearchBar({ value, onChangeText, placeholder, embedded, style }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.wrap,
        embedded && styles.embedded,
        { backgroundColor: colors.surface, borderColor: colors.border },
        style,
      ]}
    >
      <Ionicons name="search-outline" size={embedded ? 16 : 18} color={colors.textMuted} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder ?? t('common.buscarEnLista')}
        placeholderTextColor={colors.textMuted}
        style={[styles.input, embedded && styles.inputEmbedded, { color: colors.text }]}
        autoCapitalize="none"
        autoCorrect={false}
        clearButtonMode="while-editing"
        returnKeyType="search"
      />
      {value.length > 0 ? (
        <Ionicons
          name="close-circle"
          size={18}
          color={colors.textMuted}
          onPress={() => onChangeText('')}
          accessibilityRole="button"
          accessibilityLabel={t('common.clear')}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 8,
    marginTop: 4,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderRadius: radii.lg,
    alignSelf: 'stretch',
    minWidth: 0,
    maxWidth: '100%',
  },
  embedded: {
    marginHorizontal: 0,
    marginTop: 0,
    marginBottom: 0,
    paddingVertical: 8,
    paddingHorizontal: 10,
    flex: 1,
    minWidth: 0,
  },
  input: { flex: 1, minWidth: 0, fontFamily: fonts.body, fontSize: 15, padding: 0 },
  inputEmbedded: { fontSize: 13 },
});
