import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { JuegoAnimo } from '../../../types';
import { AccionMascota } from '../../../components/MascotaAvatar';
import { InteractivePet } from '../components/InteractivePet';
import { buildAppearance } from '../appearance';
import { PetAppearance } from '../types';
import { useTheme } from '../../../theme/ThemeProvider';
import { fonts } from '../../../theme/typography';

type Props = {
  especie: string;
  animo: JuegoAnimo;
  accion?: AccionMascota;
  disparo?: number;
  tamano?: number;
  appearance?: Partial<PetAppearance>;
  /** Reservado: URL .riv futura (hoy no se carga Rive en el bundle). */
  riveUrl?: string | null;
};

/**
 * Stage HueGotchi — personaje clay interactivo (sin Rive en runtime por ahora,
 * para no romper web). Cuando haya .riv estable se reintroduce con lazy import.
 */
export function HueGotchiStage(props: Props) {
  void props.riveUrl;
  return <InteractivePet {...props} />;
}

type AppearancePanelProps = {
  value: Partial<PetAppearance>;
  onChange: (next: Partial<PetAppearance>) => void;
};

export function AppearancePanel({ value, onChange }: AppearancePanelProps) {
  const { colors } = useTheme();
  const a = useMemo(() => buildAppearance('gato', value), [value]);

  const bump = (key: 'tamano' | 'peso' | 'longitud', delta: number) => {
    const next = Math.round((a[key] + delta) * 100) / 100;
    onChange({ ...value, [key]: next });
  };

  const coats = [
    { id: 'coat_default', label: 'Base', tint: undefined as string | undefined },
    { id: 'coat_orange', label: 'Naranja', tint: '#E8A05A' },
    { id: 'coat_gray', label: 'Gris', tint: '#9AA3AE' },
    { id: 'coat_black', label: 'Negro', tint: '#2B2F36' },
    { id: 'coat_cream', label: 'Crema', tint: '#F3E2C7' },
  ];

  return (
    <View style={[styles.panel, { borderColor: colors.border, backgroundColor: colors.surface }]}>
      <Text style={[styles.titulo, { color: colors.text }]}>Personalizar</Text>

      {(
        [
          ['Tamaño', 'tamano', 0.05],
          ['Peso', 'peso', 0.08],
          ['Largo', 'longitud', 0.04],
        ] as const
      ).map(([label, key, step]) => (
        <View key={key} style={styles.row}>
          <Text style={{ color: colors.text, width: 64, fontSize: 13 }}>{label}</Text>
          <Pressable
            onPress={() => bump(key, -step)}
            style={[styles.chip, { borderColor: colors.border }]}
          >
            <Text style={{ color: colors.text, fontFamily: fonts.bodySemi }}>−</Text>
          </Pressable>
          <Text style={{ color: colors.textMuted, minWidth: 40, textAlign: 'center' }}>
            {a[key].toFixed(2)}
          </Text>
          <Pressable
            onPress={() => bump(key, step)}
            style={[styles.chip, { borderColor: colors.border }]}
          >
            <Text style={{ color: colors.text, fontFamily: fonts.bodySemi }}>+</Text>
          </Pressable>
        </View>
      ))}

      <Text style={[styles.sub, { color: colors.textMuted }]}>Pelaje</Text>
      <View style={styles.filaWrap}>
        {coats.map((c) => {
          const on = (value.capas?.coat ?? 'coat_default') === c.id;
          return (
            <Pressable
              key={c.id}
              onPress={() =>
                onChange({
                  ...value,
                  capas: { ...value.capas, coat: c.id },
                  colorPiel: c.tint,
                })
              }
              style={[
                styles.coat,
                {
                  borderColor: on ? colors.primary : colors.border,
                  backgroundColor: c.tint ?? colors.backgroundAlt,
                },
              ]}
            >
              <Text style={{ fontSize: 10, color: on && c.id === 'coat_black' ? '#fff' : colors.text }}>
                {c.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
    gap: 8,
    width: '100%',
  },
  titulo: { fontFamily: fonts.bodySemi, fontSize: 14, marginBottom: 4 },
  sub: { fontSize: 12, marginTop: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  chip: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  filaWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  coat: {
    borderWidth: 1.5,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    minWidth: 64,
    alignItems: 'center',
  },
});
