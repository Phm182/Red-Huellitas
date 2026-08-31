import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { radii } from '../../theme/elevation';
import { useTheme } from '../../theme/ThemeProvider';
import { ChipRow, ChipOption } from './ChipRow';

const MIN = 3;
const MAX = 10080; // 7 días — mismo tope que valida el backend.

const PRESETS_MINUTOS = [3, 5, 10, 30, 60, 360, 720, 1440, 4320, 10080];

/** "3 min" / "6h" / "3d" — mismo formato corto en todos lados. */
export function formatearPlazo(minutos: number): string {
  if (minutos < 60) return `${minutos} min`;
  if (minutos < 1440) return `${Math.round(minutos / 60)}h`;
  return `${Math.round(minutos / 1440)}d`;
}

type Unidad = 'min' | 'h' | 'd';

/**
 * Elegir cuánto tiempo tiene el rival para responder cada turno.
 *
 * Antes eran 4 chips fijos en horas (1/6/12/24) — ni una partida rápida de
 * unos minutos entre dos personas mirando el celular a la vez, ni una lenta
 * de varios días, entraban ahí. Los chips siguen para el caso común, pero
 * "Personalizado" deja escribir cualquier número en la unidad que se quiera.
 */
export function PlazoTurnoSelector({
  valorMinutos,
  onChange,
}: {
  valorMinutos: number;
  onChange: (minutos: number) => void;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const esPreset = PRESETS_MINUTOS.includes(valorMinutos);
  const [personalizado, setPersonalizado] = useState(!esPreset);
  const [cantidadTexto, setCantidadTexto] = useState(
    esPreset ? '' : String(valorMinutos)
  );
  const [unidad, setUnidad] = useState<Unidad>('min');

  // 0 = sentinel de "Personalizado": nunca es un plazo válido de verdad
  // (el mínimo es 3 minutos), así que sirve para no mezclar un string
  // suelto en un ChipRow<number> y liarse con la angosta de tipos.
  const CUSTOM = 0;
  const opciones: ChipOption<number>[] = [
    ...PRESETS_MINUTOS.map((m) => ({ valor: m, label: formatearPlazo(m) })),
    { valor: CUSTOM, label: t('hueplay.plazoPersonalizado') },
  ];

  const aplicarPersonalizado = (texto: string, u: Unidad) => {
    const n = parseInt(texto, 10);
    if (!Number.isFinite(n) || n <= 0) return;
    const factor = u === 'min' ? 1 : u === 'h' ? 60 : 1440;
    const minutos = Math.max(MIN, Math.min(MAX, n * factor));
    onChange(minutos);
  };

  return (
    <View>
      <ChipRow
        opciones={opciones}
        seleccionado={personalizado ? CUSTOM : valorMinutos}
        onSelect={(v) => {
          if (v === CUSTOM) {
            setPersonalizado(true);
            return;
          }
          setPersonalizado(false);
          onChange(v);
        }}
        scrollable
      />
      {personalizado ? (
        <View style={styles.filaPersonalizado}>
          <TextInput
            value={cantidadTexto}
            onChangeText={(v) => {
              const limpio = v.replace(/[^0-9]/g, '');
              setCantidadTexto(limpio);
              aplicarPersonalizado(limpio, unidad);
            }}
            keyboardType="number-pad"
            placeholder="30"
            placeholderTextColor={colors.textMuted}
            style={[
              styles.input,
              { borderColor: colors.border, color: colors.text, backgroundColor: colors.surface },
            ]}
          />
          {(['min', 'h', 'd'] as const).map((u) => (
            <Pressable
              key={u}
              onPress={() => {
                setUnidad(u);
                aplicarPersonalizado(cantidadTexto, u);
              }}
              style={[
                styles.unidad,
                {
                  borderColor: unidad === u ? colors.primary : colors.border,
                  backgroundColor: unidad === u ? colors.primarySoft : 'transparent',
                },
              ]}
            >
              <Text style={{ color: unidad === u ? colors.primary : colors.text, fontSize: 12 }}>
                {t(`hueplay.unidad.${u}`)}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  filaPersonalizado: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8, paddingHorizontal: 16 },
  input: {
    borderWidth: 1,
    borderRadius: radii.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
    width: 70,
    textAlign: 'center',
  },
  unidad: { borderWidth: 1, borderRadius: radii.pill, paddingHorizontal: 12, paddingVertical: 8 },
});
