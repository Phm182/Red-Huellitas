import * as ImagePicker from 'expo-image-picker';
import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { comprimirImagen } from '../utils/imagen';

const MAX_FOTOS = 6;

interface MultiImagePickerFieldProps {
  label: string;
  /** URIs locales nuevas (todavía no subidas) que se van a enviar al crear/editar. */
  uris: string[];
  onChange: (uris: string[]) => void;
  addLabel: string;
}

export function MultiImagePickerField({ label, uris, onChange, addLabel }: MultiImagePickerFieldProps) {
  const { colors } = useTheme();

  const agregar = async () => {
    if (uris.length >= MAX_FOTOS) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsMultipleSelection: true,
      selectionLimit: MAX_FOTOS - uris.length,
    });
    if (result.canceled || result.assets.length === 0) return;

    const comprimidas = await Promise.all(result.assets.map((a) => comprimirImagen(a.uri)));
    onChange([...uris, ...comprimidas].slice(0, MAX_FOTOS));
  };

  const quitar = (index: number) => {
    onChange(uris.filter((_, i) => i !== index));
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: colors.text }]}>
        {label} ({uris.length}/{MAX_FOTOS})
      </Text>
      <View style={styles.grid}>
        {uris.map((uri, index) => (
          <View key={uri} style={styles.slot}>
            <Image source={{ uri }} style={styles.thumb} />
            <Pressable
              onPress={() => quitar(index)}
              style={[styles.removeBadge, { backgroundColor: colors.danger }]}
            >
              <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>×</Text>
            </Pressable>
          </View>
        ))}
        {uris.length < MAX_FOTOS ? (
          <Pressable
            onPress={agregar}
            style={[styles.slot, styles.addSlot, { borderColor: colors.border, backgroundColor: colors.surface }]}
          >
            <Text style={{ color: colors.primary, fontSize: 24 }}>+</Text>
            <Text style={{ color: colors.primary, fontSize: 11, marginTop: 2 }}>{addLabel}</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const SLOT_SIZE = 90;

const styles = StyleSheet.create({
  container: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  slot: { width: SLOT_SIZE, height: SLOT_SIZE, borderRadius: 10, overflow: 'hidden' },
  thumb: { width: '100%', height: '100%' },
  addSlot: { borderWidth: 1, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },
  removeBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
