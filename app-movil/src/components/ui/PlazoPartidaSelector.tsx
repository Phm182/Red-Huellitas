import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../theme/ThemeProvider';
import { ChipRow, ChipOption } from './ChipRow';

/**
 * Elegir el plazo de la PARTIDA entera — distinto del plazo por turno.
 *
 * Plazo por turno = lo que tiene el rival para responder CADA jugada.
 * Plazo de partida = si nadie ganó cuando llega, el duelo queda en tablas.
 * En un torneo, este es el plazo por ronda.
 *
 * `0` = sin límite (comportamiento por defecto de siempre).
 */
const PRESETS: { min: number; clave: string }[] = [
  { min: 0, clave: 'sinLimite' },
  { min: 30, clave: 'min30' },
  { min: 120, clave: 'h2' },
  { min: 1440, clave: 'd1' },
  { min: 4320, clave: 'd3' },
  { min: 10080, clave: 'sem1' },
];

export function PlazoPartidaSelector({
  valorMinutos,
  onChange,
}: {
  valorMinutos: number;
  onChange: (minutos: number) => void;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const opciones: ChipOption<number>[] = PRESETS.map((p) => ({
    valor: p.min,
    label: t(`hueplay.plazoPartida.${p.clave}`),
  }));

  return (
    <View>
      <ChipRow
        opciones={opciones}
        seleccionado={PRESETS.some((p) => p.min === valorMinutos) ? valorMinutos : 0}
        onSelect={onChange}
        scrollable
      />
      <Text style={[styles.ayuda, { color: colors.textMuted }]}>{t('hueplay.plazoPartida.ayuda')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  ayuda: { fontSize: 12, marginTop: 6, paddingHorizontal: 16 },
});
