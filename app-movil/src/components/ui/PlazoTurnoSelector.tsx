import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { radii } from '../../theme/elevation';
import { useTheme } from '../../theme/ThemeProvider';
import { ChipRow, ChipOption } from './ChipRow';

const MIN = 30; // 30 segundos — mismo piso que valida el backend.
const MAX = 604800; // 7 días.

const PRESETS_SEGUNDOS = [30, 60, 300, 600, 1800, 3600, 21600, 43200, 86400, 259200, 604800];

/** "30 seg" / "5 min" / "6h" / "3d" — mismo formato corto en todos lados. */
export function formatearPlazo(segundos: number): string {
  if (segundos < 60) return `${segundos} seg`;
  if (segundos < 3600) return `${Math.round(segundos / 60)} min`;
  if (segundos < 86400) return `${Math.round(segundos / 3600)}h`;
  return `${Math.round(segundos / 86400)}d`;
}

type Unidad = 'seg' | 'min' | 'h' | 'd';

/**
 * Elegir cuánto tiempo tiene el rival para responder cada turno.
 *
 * En segundos: los chips cubren desde 30 seg (partida casi en tiempo real,
 * los dos mirando el celular) hasta 7 días. "Personalizado" deja escribir
 * cualquier número en la unidad que se quiera.
 */
export function PlazoTurnoSelector({
  valorSegundos,
  onChange,
}: {
  valorSegundos: number;
  onChange: (segundos: number) => void;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const esPreset = PRESETS_SEGUNDOS.includes(valorSegundos);
  const [personalizado, setPersonalizado] = useState(!esPreset);
  const [cantidadTexto, setCantidadTexto] = useState(esPreset ? '' : String(valorSegundos));
  const [unidad, setUnidad] = useState<Unidad>('min');

  // 0 = sentinel de "Personalizado": nunca es un plazo válido de verdad
  // (el mínimo es 30 segundos), así que sirve para no mezclar un string
  // suelto en un ChipRow<number> y liarse con la angosta de tipos.
  const CUSTOM = 0;
  const opciones: ChipOption<number>[] = [
    ...PRESETS_SEGUNDOS.map((s) => ({ valor: s, label: formatearPlazo(s) })),
    { valor: CUSTOM, label: t('hueplay.plazoPersonalizado') },
  ];

  const aplicarPersonalizado = (texto: string, u: Unidad) => {
    const n = parseInt(texto, 10);
    if (!Number.isFinite(n) || n <= 0) return;
    const factor = u === 'seg' ? 1 : u === 'min' ? 60 : u === 'h' ? 3600 : 86400;
    const segundos = Math.max(MIN, Math.min(MAX, n * factor));
    onChange(segundos);
  };

  return (
    <View>
      <ChipRow
        opciones={opciones}
        seleccionado={personalizado ? CUSTOM : valorSegundos}
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
          {(['seg', 'min', 'h', 'd'] as const).map((u) => (
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
  unidad: { borderWidth: 1, borderRadius: radii.pill, paddingHorizontal: 10, paddingVertical: 8 },
});
