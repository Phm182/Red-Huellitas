import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleProp, StyleSheet, ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { elevation, radii } from '../../theme/elevation';
import { useTheme } from '../../theme/ThemeProvider';
import { hapticLeve } from '../../utils/haptics';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * Botón flotante de "crear" **de la pantalla** (nueva adopción, nueva
 * campaña…), distinto del `+` global del `FloatingDock`.
 *
 * Va corrido a la izquierda del riel de flotantes: el dock ocupa desde
 * `right: 14` hasta `right: 62`, así que quedarse en `right: 20` lo dejaba
 * justo debajo del `+` global, con dos botones "crear" pisándose.
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
      style={[styles.fab, elevation.md, { backgroundColor: colors.accent }, animStyle, style]}
    >
      <Ionicons name={icon} size={22} color={colors.primaryText} />
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    // A la izquierda del riel del FloatingDock, que vive en right: 14–62.
    right: 76,
    bottom: 20,
    width: 48,
    height: 48,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
  },
});
