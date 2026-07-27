import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  FadeIn,
  ZoomIn,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { radii } from '../theme/elevation';
import { type } from '../theme/typography';
import { useTheme } from '../theme/ThemeProvider';
import { comprimirImagen } from '../utils/imagen';
import { hapticLeve } from '../utils/haptics';

const MAX_FOTOS = 6;
const SLOT_SIZE = 96;
const GAP = 8;
const COLUMNAS = 3;

interface MultiImagePickerFieldProps {
  label: string;
  uris: string[];
  onChange: (uris: string[]) => void;
  addLabel: string;
}

/**
 * Galería multi-foto. La primera es portada. Long-press + arrastre reordena.
 */
export function MultiImagePickerField({ label, uris, onChange, addLabel }: MultiImagePickerFieldProps) {
  const { colors } = useTheme();

  const agregar = async () => {
    if (uris.length >= MAX_FOTOS) return;
    hapticLeve();
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsMultipleSelection: true,
      selectionLimit: MAX_FOTOS - uris.length,
    });
    if (result.canceled || result.assets.length === 0) return;

    const comprimidas = await Promise.all(result.assets.map((a) => comprimirImagen(a.uri)));
    onChange([...uris, ...comprimidas].slice(0, MAX_FOTOS));
  };

  const quitar = (index: number) => {
    hapticLeve();
    onChange(uris.filter((_, i) => i !== index));
  };

  const reordenar = (from: number, to: number) => {
    if (from === to || from < 0 || to < 0 || from >= uris.length || to >= uris.length) return;
    const next = [...uris];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    onChange(next);
    hapticLeve();
  };

  return (
    <View style={styles.container}>
      <View style={styles.encabezado}>
        <Text style={[type.label, { color: colors.textMuted }]}>{label}</Text>
        <Text style={[type.caption, { color: colors.textMuted }]}>
          {uris.length}/{MAX_FOTOS}
        </Text>
      </View>
      <Text style={[type.caption, { color: colors.textMuted, marginBottom: 8 }]}>
        Mantené apretada una foto y arrastrala para cambiar el orden. La primera es la portada.
      </Text>

      <View style={styles.grid}>
        {uris.map((uri, index) => (
          <FotoDraggable
            key={`${uri}-${index}`}
            uri={uri}
            index={index}
            total={uris.length}
            esPortada={index === 0}
            onReorder={reordenar}
            onRemove={() => quitar(index)}
          />
        ))}

        {uris.length < MAX_FOTOS ? (
          <Animated.View entering={FadeIn}>
            <Pressable
              onPress={agregar}
              style={[
                styles.slot,
                styles.addSlot,
                { borderColor: colors.border, backgroundColor: colors.surface },
              ]}
            >
              <Ionicons name="add" size={24} color={colors.primary} />
              <Text style={[type.caption, { color: colors.primary, marginTop: 2 }]} numberOfLines={1}>
                {addLabel}
              </Text>
            </Pressable>
          </Animated.View>
        ) : null}
      </View>
    </View>
  );
}

function FotoDraggable({
  uri,
  index,
  total,
  esPortada,
  onReorder,
  onRemove,
}: {
  uri: string;
  index: number;
  total: number;
  esPortada: boolean;
  onReorder: (from: number, to: number) => void;
  onRemove: () => void;
}) {
  const { colors } = useTheme();
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const activo = useSharedValue(0);

  const gesto = Gesture.Pan()
    .activateAfterLongPress(220)
    .onStart(() => {
      activo.value = 1;
    })
    .onUpdate((e) => {
      tx.value = e.translationX;
      ty.value = e.translationY;
    })
    .onEnd((e) => {
      const colDelta = Math.round(e.translationX / (SLOT_SIZE + GAP));
      const rowDelta = Math.round(e.translationY / (SLOT_SIZE + GAP));
      const to = Math.max(0, Math.min(total - 1, index + rowDelta * COLUMNAS + colDelta));
      if (to !== index) {
        runOnJS(onReorder)(index, to);
      }
    })
    .onFinalize(() => {
      tx.value = withSpring(0);
      ty.value = withSpring(0);
      activo.value = 0;
    });

  const animStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: tx.value },
      { translateY: ty.value },
      { scale: 1 + activo.value * 0.06 },
    ],
    zIndex: activo.value ? 20 : 1,
    opacity: activo.value ? 0.92 : 1,
  }));

  return (
    <GestureDetector gesture={gesto}>
      <Animated.View entering={ZoomIn.springify().damping(16)} style={[styles.slot, animStyle]}>
        <Image source={{ uri }} style={styles.thumb} contentFit="cover" transition={180} />
        {esPortada ? (
          <View style={[styles.portada, { backgroundColor: colors.overlay }]}>
            <Text style={[type.caption, { color: '#fff' }]}>Portada</Text>
          </View>
        ) : null}
        <Pressable
          onPress={onRemove}
          hitSlop={6}
          style={[styles.removeBadge, { backgroundColor: colors.danger }]}
        >
          <Ionicons name="close" size={13} color="#fff" />
        </Pressable>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 16 },
  encabezado: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: GAP },
  slot: { width: SLOT_SIZE, height: SLOT_SIZE, borderRadius: radii.sm, overflow: 'hidden' },
  thumb: { width: '100%', height: '100%' },
  addSlot: {
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  portada: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    paddingVertical: 3,
  },
  removeBadge: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 22,
    height: 22,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
