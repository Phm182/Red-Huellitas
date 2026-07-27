import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { radii } from '../theme/elevation';
import { useTheme } from '../theme/ThemeProvider';

type Variante = 'hue_plus' | 'hue_plus_comercial' | string | null | undefined;

type Props = {
  planCodigo?: Variante;
  size?: number;
  /** Si true, muestra la insignia HuePlus aunque no haya plan (acciones gated). */
  comoAccionPlus?: boolean;
};

/**
 * Insignia de suscripción. HuePlus y HuePlus Comercial se distinguen
 * por color e icono para que se lean distinto al lado del nombre.
 */
export function HuePlusBadge({ planCodigo, size = 16, comoAccionPlus = false }: Props) {
  const { colors } = useTheme();

  const comercial = planCodigo === 'hue_plus_comercial' || planCodigo === 'vitrina_comercial';
  const plus = planCodigo === 'hue_plus' || comercial;
  if (!plus && !comoAccionPlus) return null;

  return (
    <View
      style={[
        styles.badge,
        {
          width: size + 6,
          height: size + 6,
          backgroundColor: comercial ? colors.accent : colors.primary,
        },
      ]}
      accessibilityLabel={comercial ? 'HuePlus Comercial' : 'HuePlus'}
    >
      <Ionicons name={comercial ? 'briefcase' : 'diamond'} size={size * 0.72} color="#fff" />
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
