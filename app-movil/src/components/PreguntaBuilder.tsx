import React from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { PreguntaBorrador, TipoPregunta } from '../types';
import { useTheme } from '../theme/ThemeProvider';

const TIPOS: TipoPregunta[] = ['texto', 'si_no', 'opcion_multiple'];
const MAX_PREGUNTAS = 10;

interface PreguntaBuilderProps {
  preguntas: PreguntaBorrador[];
  onChange: (preguntas: PreguntaBorrador[]) => void;
}

export function PreguntaBuilder({ preguntas, onChange }: PreguntaBuilderProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const agregarPregunta = () => {
    if (preguntas.length >= MAX_PREGUNTAS) return;
    onChange([...preguntas, { tipo: 'texto', texto: '', opciones: [] }]);
  };

  const quitarPregunta = (index: number) => {
    onChange(preguntas.filter((_, i) => i !== index));
  };

  const actualizarPregunta = (index: number, cambios: Partial<PreguntaBorrador>) => {
    onChange(preguntas.map((p, i) => (i === index ? { ...p, ...cambios } : p)));
  };

  const agregarOpcion = (index: number) => {
    const pregunta = preguntas[index];
    actualizarPregunta(index, { opciones: [...pregunta.opciones, ''] });
  };

  const actualizarOpcion = (index: number, opcionIndex: number, texto: string) => {
    const pregunta = preguntas[index];
    const opciones = pregunta.opciones.map((o, i) => (i === opcionIndex ? texto : o));
    actualizarPregunta(index, { opciones });
  };

  const quitarOpcion = (index: number, opcionIndex: number) => {
    const pregunta = preguntas[index];
    actualizarPregunta(index, { opciones: pregunta.opciones.filter((_, i) => i !== opcionIndex) });
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: colors.text }]}>{t('adopcion.preguntasTitulo')}</Text>
      <Text style={{ color: colors.textMuted, fontSize: 12, marginBottom: 10 }}>
        {t('adopcion.preguntasAyuda')}
      </Text>

      {preguntas.map((pregunta, index) => (
        <View key={index} style={[styles.preguntaCard, { borderColor: colors.border, backgroundColor: colors.surface }]}>
          <View style={styles.tipoRow}>
            {TIPOS.map((tipo) => {
              const activo = pregunta.tipo === tipo;
              return (
                <Pressable
                  key={tipo}
                  onPress={() => actualizarPregunta(index, { tipo, opciones: tipo === 'opcion_multiple' ? pregunta.opciones : [] })}
                  style={[
                    styles.tipoChip,
                    { borderColor: colors.primary, backgroundColor: activo ? colors.primary : 'transparent' },
                  ]}
                >
                  <Text style={{ color: activo ? colors.primaryText : colors.primary, fontSize: 12, fontWeight: '600' }}>
                    {t(`adopcion.tipoPregunta.${tipo}`)}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <TextInput
            style={[styles.input, { borderColor: colors.border, color: colors.text }]}
            placeholder={t('adopcion.preguntaTextoPlaceholder')}
            placeholderTextColor={colors.textMuted}
            value={pregunta.texto}
            onChangeText={(texto) => actualizarPregunta(index, { texto })}
          />

          {pregunta.tipo === 'opcion_multiple' ? (
            <View style={styles.opciones}>
              {pregunta.opciones.map((opcion, opcionIndex) => (
                <View key={opcionIndex} style={styles.opcionRow}>
                  <TextInput
                    style={[styles.input, styles.opcionInput, { borderColor: colors.border, color: colors.text }]}
                    placeholder={t('adopcion.opcionPlaceholder', { numero: opcionIndex + 1 })}
                    placeholderTextColor={colors.textMuted}
                    value={opcion}
                    onChangeText={(texto) => actualizarOpcion(index, opcionIndex, texto)}
                  />
                  <Pressable onPress={() => quitarOpcion(index, opcionIndex)}>
                    <Text style={{ color: colors.danger, fontSize: 18 }}>✕</Text>
                  </Pressable>
                </View>
              ))}
              <Pressable onPress={() => agregarOpcion(index)}>
                <Text style={{ color: colors.primary, fontWeight: '600' }}>+ {t('adopcion.agregarOpcion')}</Text>
              </Pressable>
            </View>
          ) : null}

          <Pressable onPress={() => quitarPregunta(index)} style={styles.quitarPregunta}>
            <Text style={{ color: colors.danger, fontSize: 12 }}>{t('adopcion.quitarPregunta')}</Text>
          </Pressable>
        </View>
      ))}

      {preguntas.length < MAX_PREGUNTAS ? (
        <Pressable
          style={[styles.agregarButton, { borderColor: colors.primary }]}
          onPress={agregarPregunta}
        >
          <Text style={{ color: colors.primary, fontWeight: '600' }}>+ {t('adopcion.agregarPregunta')}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600' },
  preguntaCard: { borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 10 },
  tipoRow: { flexDirection: 'row', gap: 6, marginBottom: 8 },
  tipoChip: { borderWidth: 1, borderRadius: 16, paddingVertical: 6, paddingHorizontal: 10 },
  input: { borderWidth: 1, borderRadius: 8, padding: 10, fontSize: 14, marginBottom: 8 },
  opciones: { marginTop: 4 },
  opcionRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  opcionInput: { flex: 1, marginBottom: 8 },
  quitarPregunta: { alignSelf: 'flex-end' },
  agregarButton: { borderWidth: 1, borderStyle: 'dashed', borderRadius: 10, padding: 12, alignItems: 'center' },
});
