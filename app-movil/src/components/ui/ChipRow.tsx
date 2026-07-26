import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { radii } from '../../theme/elevation';
import { type } from '../../theme/typography';
import { useTheme } from '../../theme/ThemeProvider';
import { hapticLeve } from '../../utils/haptics';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface FilterChipProps {
  label: string;
  activo: boolean;
  onPress: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
}

/**
 * Píldora de filtro con press animado.
 *
 * El mismo bloque estaba copiado a mano en 19 pantallas, con el estilo
 * `{ borderWidth: 1, borderRadius: 20, paddingVertical: 8 }` redefinido en
 * cada `StyleSheet.create`. Acá vive una sola vez.
 */
export function FilterChip({ label, activo, onPress, icon }: FilterChipProps) {
  const { colors } = useTheme();
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <AnimatedPressable
      onPress={() => {
        hapticLeve();
        onPress();
      }}
      onPressIn={() => {
        scale.value = withSpring(0.94, { damping: 18, stiffness: 340 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 14, stiffness: 240 });
      }}
      style={[
        styles.chip,
        {
          borderColor: activo ? colors.primary : colors.border,
          backgroundColor: activo ? colors.primary : colors.surface,
        },
        animStyle,
      ]}
    >
      {icon ? (
        <Ionicons
          name={icon}
          size={14}
          color={activo ? colors.primaryText : colors.textMuted}
          style={{ marginRight: 6 }}
        />
      ) : null}
      <Text style={[type.label, { color: activo ? colors.primaryText : colors.text }]}>{label}</Text>
    </AnimatedPressable>
  );
}

export interface ChipOption<T> {
  valor: T;
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
}

interface ChipRowProps<T> {
  opciones: ChipOption<T>[];
  seleccionado: T;
  onSelect: (valor: T) => void;
  /** Con muchas opciones conviene scrollear en vez de que hagan wrap. */
  scrollable?: boolean;
  style?: ViewStyle;
}

/** Fila de chips excluyentes. */
export function ChipRow<T>({
  opciones,
  seleccionado,
  onSelect,
  scrollable = true,
  style,
}: ChipRowProps<T>) {
  const contenido = opciones.map((op) => (
    <FilterChip
      key={String(op.valor)}
      label={op.label}
      icon={op.icon}
      activo={op.valor === seleccionado}
      onPress={() => onSelect(op.valor)}
    />
  ));

  if (!scrollable) {
    return <View style={[styles.wrap, style]}>{contenido}</View>;
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={[styles.fila, style]}
    >
      {contenido}
    </ScrollView>
  );
}

export type RadioKm = 20 | 50 | 100 | null;

/**
 * El filtro de radio geográfico que comparten Tránsito, Donaciones,
 * Veterinarias, Productos y Match. `null` = sin límite de distancia.
 */
export function RadioChips({
  valor,
  onSelect,
  labelTodos,
}: {
  valor: RadioKm;
  onSelect: (valor: RadioKm) => void;
  labelTodos: string;
}) {
  const opciones: ChipOption<RadioKm>[] = [
    { valor: 20, label: '20 km', icon: 'location-outline' },
    { valor: 50, label: '50 km', icon: 'location-outline' },
    { valor: 100, label: '100 km', icon: 'location-outline' },
    { valor: null, label: labelTodos, icon: 'globe-outline' },
  ];

  return <ChipRow opciones={opciones} seleccionado={valor} onSelect={onSelect} />;
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: radii.pill,
    paddingVertical: 9,
    paddingHorizontal: 14,
  },
  fila: { gap: 8, paddingHorizontal: 16, paddingVertical: 4 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
