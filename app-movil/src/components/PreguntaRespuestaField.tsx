import React from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { AdopcionPregunta, RespuestaBorrador } from '../types';
import { useTheme } from '../theme/ThemeProvider';

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
      <Text style={[styles.pregunta, { color: colors.text }]}>{pregunta.texto}</Text>

      {pregunta.tipo === 'texto' ? (
        <TextInput
          style={[styles.input, { borderColor: colors.border, color: colors.text }]}
          value={respuesta.texto ?? ''}
          onChangeText={(texto) => onChange({ preguntaId: pregunta.adopcionPreguntaId, texto })}
          multiline
        />
      ) : null}

      {pregunta.tipo === 'si_no' ? (
        <View style={styles.opcionesRow}>
          {(['si', 'no'] as const).map((valor) => {
            const activo = respuesta.texto === valor;
            return (
              <Pressable
                key={valor}
                onPress={() => onChange({ preguntaId: pregunta.adopcionPreguntaId, texto: valor })}
                style={[
                  styles.opcionChip,
                  { borderColor: colors.primary, backgroundColor: activo ? colors.primary : 'transparent' },
                ]}
              >
                <Text style={{ color: activo ? colors.primaryText : colors.primary, fontWeight: '600' }}>
                  {t(valor === 'si' ? 'common.yes' : 'common.no')}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      {pregunta.tipo === 'opcion_multiple' ? (
        <View style={styles.opcionesColumn}>
          {(pregunta.opciones ?? []).map((opcion) => {
            const activo = respuesta.opcionId === opcion.adopcionPreguntaOpcionId;
            return (
              <Pressable
                key={opcion.adopcionPreguntaOpcionId}
                onPress={() => onChange({ preguntaId: pregunta.adopcionPreguntaId, opcionId: opcion.adopcionPreguntaOpcionId })}
                style={[
                  styles.opcionRow,
                  { borderColor: colors.primary, backgroundColor: activo ? colors.primary : 'transparent' },
                ]}
              >
                <Text style={{ color: activo ? colors.primaryText : colors.text, fontWeight: activo ? '700' : '400' }}>
                  {opcion.texto}
                </Text>
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
  pregunta: { fontSize: 15, fontWeight: '600', marginBottom: 8 },
  input: { borderWidth: 1, borderRadius: 8, padding: 12, fontSize: 14, minHeight: 60, textAlignVertical: 'top' },
  opcionesRow: { flexDirection: 'row', gap: 10 },
  opcionChip: { borderWidth: 1, borderRadius: 20, paddingVertical: 8, paddingHorizontal: 20 },
  opcionesColumn: { gap: 8 },
  opcionRow: { borderWidth: 1, borderRadius: 8, padding: 12 },
});
