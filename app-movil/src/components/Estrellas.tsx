import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { hapticLeve } from '../utils/haptics';
import { Reputacion } from '../types/equipo';

type Props = {
  /** 0–5. Acepta decimales para mostrar promedios. */
  valor: number;
  size?: number;
  /** Con onChange se vuelve táctil: sirve para calificar. */
  onChange?: (valor: number) => void;
};

/**
 * Cinco estrellas, en modo lectura o en modo elegir.
 *
 * Es el mismo componente para los dos porque la diferencia real es una sola
 * —si responde al toque— y tener dos copias garantiza que se vean distinto
 * el día que alguien ajuste un tamaño.
 *
 * Los promedios se dibujan con media estrella: redondear 4.4 a 4 esconde
 * justo la diferencia que la gente mira.
 */
export function Estrellas({ valor, size = 16, onChange }: Props) {
  const { colors } = useTheme();
  const editable = typeof onChange === 'function';

  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {[1, 2, 3, 4, 5].map((n) => {
        const nombre = valor >= n ? 'star' : valor >= n - 0.5 ? 'star-half' : 'star-outline';
        const icono = (
          <Ionicons
            name={nombre as never}
            size={size}
            color={valor >= n - 0.5 ? '#F5A524' : colors.border}
          />
        );

        if (!editable) {
          return <View key={n}>{icono}</View>;
        }

        return (
          <Pressable
            key={n}
            onPress={() => {
              hapticLeve();
              onChange!(n);
            }}
            hitSlop={6}
            accessibilityRole="button"
            accessibilityLabel={`${n}`}
          >
            {icono}
          </Pressable>
        );
      })}
    </View>
  );
}

/**
 * Promedio + cantidad, en una línea.
 *
 * Sin calificaciones no muestra estrellas vacías: un equipo nuevo no tiene
 * cero estrellas, no tiene todavía, y dibujarlo en gris lo hunde antes de
 * empezar.
 */
export function ReputacionLinea({
  reputacion,
  size = 14,
  sinDatosLabel = 'Sin calificaciones',
}: {
  reputacion?: Reputacion | null;
  size?: number;
  sinDatosLabel?: string;
}) {
  const { colors } = useTheme();

  if (!reputacion || reputacion.promedio === null) {
    return <Text style={{ color: colors.textMuted, fontSize: size - 2 }}>{sinDatosLabel}</Text>;
  }

  return (
    <View style={styles.linea}>
      <Estrellas valor={reputacion.promedio} size={size} />
      <Text style={{ color: colors.text, fontWeight: '700', fontSize: size - 1 }}>
        {reputacion.promedio.toFixed(1)}
      </Text>
      <Text style={{ color: colors.textMuted, fontSize: size - 2 }}>({reputacion.total})</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  linea: { flexDirection: 'row', alignItems: 'center', gap: 5 },
});
