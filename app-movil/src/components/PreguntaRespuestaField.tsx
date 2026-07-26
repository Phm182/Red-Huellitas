import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AdopcionPregunta, RespuestaBorrador } from '../types';
import { radii } from '../theme/elevation';
import { type } from '../theme/typography';
import { useTheme } from '../theme/ThemeProvider';
import { hapticLeve } from '../utils/haptics';
import { AppInput } from './AppInput';
import { FilterChip } from './ui/ChipRow';

interface PreguntaRespuestaFieldProps {
  pregunta: AdopcionPregunta;
  respuesta: RespuestaBorrador;
  onChange: (respuesta: RespuestaBorrador) => void;
}

export function PreguntaRespuestaField({ pregunta, respuesta, onChange }: PreguntaRespuestaFieldProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      <Text style={[type.section, { color: colors.text, marginBottom: 10 }]}>{pregunta.texto}</Text>

      {pregunta.tipo === 'texto' ? (
        <AppInput
          value={respuesta.texto ?? ''}
          onChangeText={(texto) => onChange({ preguntaId: pregunta.adopcionPreguntaId, texto })}
          multiline
          style={styles.input}
        />
      ) : null}

      {pregunta.tipo === 'si_no' ? (
        <View style={styles.opcionesRow}>
          {(['si', 'no'] as const).map((valor) => (
            <FilterChip
              key={valor}
              label={t(valor === 'si' ? 'common.yes' : 'common.no')}
              icon={valor === 'si' ? 'checkmark-circle-outline' : 'close-circle-outline'}
              activo={respuesta.texto === valor}
              onPress={() => onChange({ preguntaId: pregunta.adopcionPreguntaId, texto: valor })}
            />
          ))}
        </View>
      ) : null}

      {pregunta.tipo === 'opcion_multiple' ? (
        <View style={styles.opcionesColumn}>
          {(pregunta.opciones ?? []).map((opcion) => {
            const activo = respuesta.opcionId === opcion.adopcionPreguntaOpcionId;
            return (
              <Pressable
                key={opcion.adopcionPreguntaOpcionId}
                onPress={() => {
                  hapticLeve();
                  onChange({
                    preguntaId: pregunta.adopcionPreguntaId,
                    opcionId: opcion.adopcionPreguntaOpcionId,
                  });
                }}
                style={[
                  styles.opcionRow,
                  {
                    borderColor: activo ? colors.primary : colors.border,
                    backgroundColor: activo ? colors.primarySoft : colors.surface,
                  },
                ]}
              >
                {/* Radio dibujado a mano: no hay librería de forms en el
                    proyecto y un check suelto no comunica "elegí una". */}
                <View style={[styles.radio, { borderColor: activo ? colors.primary : colors.border }]}>
                  {activo ? <View style={[styles.radioPunto, { backgroundColor: colors.primary }]} /> : null}
                </View>
                <Text style={[type.body, { color: activo ? colors.primary : colors.text, flex: 1 }]}>
                  {opcion.texto}
                </Text>
                {activo ? <Ionicons name="checkmark" size={18} color={colors.primary} /> : null}
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 20 },
  input: { minHeight: 80, textAlignVertical: 'top' },
  opcionesRow: { flexDirection: 'row', gap: 10 },
  opcionesColumn: { gap: 8 },
  opcionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderRadius: radii.md,
    padding: 14,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: radii.pill,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioPunto: { width: 10, height: 10, borderRadius: radii.pill },
});
