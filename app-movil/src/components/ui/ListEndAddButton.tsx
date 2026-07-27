import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { elevation, radii } from '../../theme/elevation';
import { type } from '../../theme/typography';
import { useTheme } from '../../theme/ThemeProvider';
import { hapticLeve } from '../../utils/haptics';

type Props = {
  label: string;
  onPress: () => void;
};

/**
 * CTA al final de un listado: invita a cargar otro registro (además del + del riel).
 */
export function ListEndAddButton({ label, onPress }: Props) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={() => {
        hapticLeve();
        onPress();
      }}
      style={[
        styles.btn,
        elevation.sm,
        { backgroundColor: colors.surface, borderColor: colors.primary },
      ]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <View style={[styles.iconWrap, { backgroundColor: colors.primarySoft }]}>
        <Ionicons name="add" size={22} color={colors.primary} />
      </View>
      <Text style={[type.bodySm, { color: colors.primary, flex: 1 }]}>{label}</Text>
      <Ionicons name="chevron-forward" size={18} color={colors.primary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    marginTop: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: radii.md,
    paddingVertical: 14,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
