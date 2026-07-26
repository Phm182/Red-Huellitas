import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { AppInput } from '../components/AppInput';
import { radii } from '../theme/elevation';
import { type } from '../theme/typography';
import { hapticLeve } from '../utils/haptics';
import { StoryInteractivo, STORY_STICKERS } from './storyEditorTypes';

type Props = {
  onAgregarSticker: (emoji: string) => void;
  onAgregarInteractivo: (interactivo: StoryInteractivo) => void;
  yaHayInteractivo: boolean;
  onCerrar: () => void;
};

type Pestania = 'stickers' | 'encuesta' | 'pregunta';

/**
 * Panel de stickers: emoji sueltos, encuesta y caja de preguntas.
 *
 * Encuesta y pregunta se limitan a **una por historia**: dos stickers
 * interactivos encimados no se leen y complican el conteo de votos.
 */
export function StoryStickerPanel({
  onAgregarSticker,
  onAgregarInteractivo,
  yaHayInteractivo,
  onCerrar,
}: Props) {
  const [pestania, setPestania] = useState<Pestania>('stickers');

  const [encuestaPregunta, setEncuestaPregunta] = useState('');
  const [opcionA, setOpcionA] = useState('');
  const [opcionB, setOpcionB] = useState('');
  const [preguntaTexto, setPreguntaTexto] = useState('');

  const agregarEncuesta = () => {
    const p = encuestaPregunta.trim();
    const a = opcionA.trim() || 'Sí';
    const b = opcionB.trim() || 'No';
    if (!p) return;
    onAgregarInteractivo({ kind: 'encuesta', x: 0.5, y: 0.6, pregunta: p, opcionA: a, opcionB: b });
  };

  const agregarPregunta = () => {
    const texto = preguntaTexto.trim();
    if (!texto) return;
    onAgregarInteractivo({ kind: 'pregunta', x: 0.5, y: 0.6, texto });
  };

  const pestanias: { id: Pestania; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { id: 'stickers', label: 'Stickers', icon: 'happy-outline' },
    { id: 'encuesta', label: 'Encuesta', icon: 'stats-chart-outline' },
    { id: 'pregunta', label: 'Preguntas', icon: 'help-circle-outline' },
  ];

  return (
    <Animated.View entering={FadeInDown.springify().damping(18)} style={styles.panel}>
      <View style={styles.encabezado}>
        <View style={styles.tabs}>
          {pestanias.map((p) => {
            const activa = pestania === p.id;
            return (
              <Pressable
                key={p.id}
                onPress={() => {
                  hapticLeve();
                  setPestania(p.id);
                }}
                style={[styles.tab, activa && styles.tabActiva]}
              >
                <Ionicons name={p.icon} size={15} color={activa ? '#111' : '#fff'} />
                <Text style={[type.caption, { color: activa ? '#111' : '#fff' }]}>{p.label}</Text>
              </Pressable>
            );
          })}
        </View>
        <Pressable onPress={onCerrar} hitSlop={10}>
          <Ionicons name="close" size={22} color="#fff" />
        </Pressable>
      </View>

      {pestania === 'stickers' ? (
        <ScrollView contentContainerStyle={styles.grid} showsVerticalScrollIndicator={false}>
          {STORY_STICKERS.map((emoji) => (
            <Pressable
              key={emoji}
              onPress={() => {
                hapticLeve();
                onAgregarSticker(emoji);
              }}
              style={styles.stickerBtn}
            >
              <Text style={styles.stickerEmoji}>{emoji}</Text>
            </Pressable>
          ))}
        </ScrollView>
      ) : null}

      {pestania === 'encuesta' ? (
        <View style={styles.form}>
          {yaHayInteractivo ? (
            <Text style={[type.bodySm, styles.aviso]}>
              Ya hay una encuesta o pregunta en esta historia. Sacala para poner otra.
            </Text>
          ) : (
            <>
              <AppInput
                placeholder="¿Qué querés preguntar?"
                value={encuestaPregunta}
                onChangeText={setEncuestaPregunta}
                style={styles.input}
              />
              <View style={styles.opciones}>
                <AppInput placeholder="Sí" value={opcionA} onChangeText={setOpcionA} style={[styles.input, { flex: 1 }]} />
                <AppInput placeholder="No" value={opcionB} onChangeText={setOpcionB} style={[styles.input, { flex: 1 }]} />
              </View>
              <Pressable
                onPress={agregarEncuesta}
                disabled={!encuestaPregunta.trim()}
                style={[styles.agregar, !encuestaPregunta.trim() && styles.agregarDisabled]}
              >
                <Text style={[type.button, { color: '#111' }]}>Agregar encuesta</Text>
              </Pressable>
            </>
          )}
        </View>
      ) : null}

      {pestania === 'pregunta' ? (
        <View style={styles.form}>
          {yaHayInteractivo ? (
            <Text style={[type.bodySm, styles.aviso]}>
              Ya hay una encuesta o pregunta en esta historia. Sacala para poner otra.
            </Text>
          ) : (
            <>
              <AppInput
                placeholder="Preguntame lo que quieras"
                value={preguntaTexto}
                onChangeText={setPreguntaTexto}
                style={styles.input}
              />
              <Pressable
                onPress={agregarPregunta}
                disabled={!preguntaTexto.trim()}
                style={[styles.agregar, !preguntaTexto.trim() && styles.agregarDisabled]}
              >
                <Text style={[type.button, { color: '#111' }]}>Agregar caja de preguntas</Text>
              </Pressable>
            </>
          )}
        </View>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  panel: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: '55%',
    backgroundColor: 'rgba(15,18,17,0.97)',
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    paddingTop: 12,
    paddingBottom: 24,
  },
  encabezado: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  tabs: { flexDirection: 'row', gap: 8, flex: 1 },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: radii.pill,
    paddingVertical: 7,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  tabActiva: { backgroundColor: '#fff' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingHorizontal: 16 },
  stickerBtn: {
    width: 54,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.sm,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  stickerEmoji: { fontSize: 30 },
  form: { paddingHorizontal: 16, gap: 4 },
  input: { backgroundColor: 'rgba(255,255,255,0.1)' },
  opciones: { flexDirection: 'row', gap: 8 },
  agregar: {
    backgroundColor: '#fff',
    borderRadius: radii.md,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 4,
  },
  agregarDisabled: { opacity: 0.4 },
  aviso: { color: 'rgba(255,255,255,0.7)', textAlign: 'center', paddingVertical: 20 },
});
