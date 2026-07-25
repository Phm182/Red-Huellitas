import React, { forwardRef } from 'react';
import { StyleSheet, TextInput, TextInputProps, View, Text } from 'react-native';
import { radii } from '../theme/elevation';
import { fonts, type } from '../theme/typography';
import { useTheme } from '../theme/ThemeProvider';

type Props = TextInputProps & {
  label?: string;
};

export const AppInput = forwardRef<TextInput, Props>(function AppInput({ label, style, ...rest }, ref) {
  const { colors } = useTheme();
  return (
    <View style={styles.wrap}>
      {label ? <Text style={[styles.label, { color: colors.textMuted }]}>{label}</Text> : null}
      <TextInput
        ref={ref}
        placeholderTextColor={colors.textMuted}
        style={[
          styles.input,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            color: colors.text,
          },
          style,
        ]}
        {...rest}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: { marginBottom: 12 },
  label: { ...type.caption, marginBottom: 6, marginLeft: 4 },
  input: {
    borderWidth: 1,
    borderRadius: radii.md,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    fontFamily: fonts.body,
  },
});
