import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, Layout } from 'react-native-reanimated';
import { PreguntaBorrador, TipoPregunta } from '../types';
import { radii } from '../theme/elevation';
import { type } from '../theme/typography';
import { useTheme } from '../theme/ThemeProvider';
import { hapticLeve } from '../utils/haptics';
import { AppInput } from './AppInput';
import { ChipOption, ChipRow } from './ui/ChipRow';

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
    hapticLeve();
    onChange([...preguntas, { tipo: 'texto', texto: '', opciones: [] }]);
  };

  const quitarPregunta = (index: number) => {
    hapticLeve();
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

  const opcionesTipo: ChipOption<TipoPregunta>[] = TIPOS.map((tipo) => ({
    valor: tipo,
    label: t(`adopcion.tipoPregunta.${tipo}`),
  }));

  return (
    <View style={styles.container}>
      <Text style={[type.label, { color: colors.textMuted }]}>{t('adopcion.preguntasTitulo')}</Text>
      <Text style={[type.caption, { color: colors.textMuted, marginBottom: 12 }]}>
        {t('adopcion.preguntasAyuda')}
      </Text>

      {preguntas.map((pregunta, index) => (
        <Animated.View
          key={index}
          entering={FadeInDown.springify().damping(16)}
          layout={Layout.springify()}
          style={[styles.preguntaCard, { borderColor: colors.border, backgroundColor: colors.surface }]}
        >
          <View style={styles.cardEncabezado}>
            <View style={[styles.numero, { backgroundColor: colors.primarySoft }]}>
              <Text style={[type.caption, { color: colors.primary }]}>{index + 1}</Text>
            </View>
            <Pressable onPress={() => quitarPregunta(index)} hitSlop={8}>
              <Ionicons name="trash-outline" size={18} color={colors.danger} />
            </Pressable>
          </View>

          <ChipRow
            opciones={opcionesTipo}
            seleccionado={pregunta.tipo}
            onSelect={(tipo) =>
              actualizarPregunta(index, {
                tipo,
                opciones: tipo === 'opcion_multiple' ? pregunta.opciones : [],
              })
            }
            style={{ paddingHorizontal: 0, marginBottom: 10 }}
          />

          <AppInput
            placeholder={t('adopcion.preguntaTextoPlaceholder')}
            value={pregunta.texto}
            onChangeText={(texto) => actualizarPregunta(index, { texto })}
          />

          {pregunta.tipo === 'opcion_multiple' ? (
            <View style={styles.opciones}>
              {pregunta.opciones.map((opcion, opcionIndex) => (
                <View key={opcionIndex} style={styles.opcionRow}>
                  <AppInput
                    placeholder={t('adopcion.opcionPlaceholder', { numero: opcionIndex + 1 })}
                    value={opcion}
                    onChangeText={(texto) => actualizarOpcion(index, opcionIndex, texto)}
                    style={{ flex: 1 }}
                  />
                  <Pressable onPress={() => quitarOpcion(index, opcionIndex)} hitSlop={8} style={styles.quitarOpcion}>
                    <Ionicons name="close-circle" size={20} color={colors.danger} />
                  </Pressable>
                </View>
              ))}
              <Pressable onPress={() => agregarOpcion(index)} style={styles.agregarOpcion}>
                <Ionicons name="add-circle-outline" size={16} color={colors.primary} />
                <Text style={[type.label, { color: colors.primary }]}>{t('adopcion.agregarOpcion')}</Text>
              </Pressable>
            </View>
          ) : null}
        </Animated.View>
      ))}

      {preguntas.length < MAX_PREGUNTAS ? (
        <Pressable style={[styles.agregarButton, { borderColor: colors.primary }]} onPress={agregarPregunta}>
          <Ionicons name="add" size={18} color={colors.primary} />
          <Text style={[type.label, { color: colors.primary }]}>{t('adopcion.agregarPregunta')}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 16 },
  preguntaCard: { borderWidth: 1, borderRadius: radii.md, padding: 14, marginBottom: 10 },
  cardEncabezado: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  numero: {
    width: 24,
    height: 24,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  opciones: { marginTop: 2 },
  opcionRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  quitarOpcion: { paddingTop: 16 },
  agregarOpcion: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4 },
  agregarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: radii.md,
    padding: 14,
  },
});
