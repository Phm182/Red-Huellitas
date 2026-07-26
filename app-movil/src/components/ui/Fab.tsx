import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleProp, StyleSheet, ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { elevation, radii } from '../../theme/elevation';
import { useTheme } from '../../theme/ThemeProvider';
import { hapticLeve } from '../../utils/haptics';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * Botón flotante de "crear".
 *
 * Estaba duplicado en 9 listados, todos con `<Text>+</Text>` en vez de un
 * icono, sin sombra, y anclados a `left: 20` para no chocar con el
 * `FloatingReportButton` global — que se borró y ya no existe. Acá vuelve a
 * la esquina inferior derecha, que es donde la gente lo busca.
 */
export function Fab({
  onPress,
  icon = 'add',
  accessibilityLabel,
  style,
}: {
  onPress: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  accessibilityLabel?: string;
  /** Override de posición (ej. bottom más alto por el tab bar global). */
  style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useTheme();
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={() => {
        hapticLeve();
        onPress();
      }}
      onPressIn={() => {
        scale.value = withSpring(0.9, { damping: 18, stiffness: 340 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 12, stiffness: 220 });
      }}
      style={[styles.fab, elevation.lg, { backgroundColor: colors.primary }, animStyle, style]}
    >
      <Ionicons name={icon} size={26} color={colors.primaryText} />
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 58,
    height: 58,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
  },
});
