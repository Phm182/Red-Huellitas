import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { radii } from '../theme/elevation';
import { type } from '../theme/typography';
import { useTheme } from '../theme/ThemeProvider';
import { comprimirImagen } from '../utils/imagen';
import { hapticLeve } from '../utils/haptics';

interface ImagePickerFieldProps {
  label: string;
  uri: string | null;
  onChange: (uri: string) => void;
  uploadLabel: string;
  retakeLabel: string;
  loading?: boolean;
}

export function ImagePickerField({ label, uri, onChange, uploadLabel, retakeLabel, loading }: ImagePickerFieldProps) {
  const { colors } = useTheme();

  const elegir = async () => {
    hapticLeve();
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: true,
    });
    if (!result.canceled && result.assets[0]) {
      const comprimida = await comprimirImagen(result.assets[0].uri);
      onChange(comprimida);
    }
  };

  const tomarFoto = async () => {
    hapticLeve();
    const permiso = await ImagePicker.requestCameraPermissionsAsync();
    if (!permiso.granted) return;
    const result = await ImagePicker.launchCameraAsync({ quality: 0.8, allowsEditing: true });
    if (!result.canceled && result.assets[0]) {
      const comprimida = await comprimirImagen(result.assets[0].uri);
      onChange(comprimida);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={[type.label, { color: colors.textMuted, marginBottom: 8 }]}>{label}</Text>

      {uri ? (
        <Pressable onPress={elegir} style={styles.previewWrap}>
          <Image source={{ uri }} style={styles.preview} contentFit="cover" transition={200} />
          <View style={[styles.previewEditar, { backgroundColor: colors.overlay }]}>
            <Ionicons name="pencil" size={14} color="#fff" />
            <Text style={[type.caption, { color: '#fff' }]}>{retakeLabel}</Text>
          </View>
        </Pressable>
      ) : (
        <Pressable
          onPress={elegir}
          style={[styles.placeholder, { borderColor: colors.border, backgroundColor: colors.surface }]}
        >
          {loading ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <>
              <View style={[styles.placeholderIcono, { backgroundColor: colors.primarySoft }]}>
                <Ionicons name="image-outline" size={22} color={colors.primary} />
              </View>
              <Text style={[type.bodySm, { color: colors.textMuted, marginTop: 8 }]}>{uploadLabel}</Text>
            </>
          )}
        </Pressable>
      )}

      <View style={styles.actions}>
        <Pressable onPress={tomarFoto} style={[styles.button, { borderColor: colors.border }]}>
          <Ionicons name="camera-outline" size={18} color={colors.primary} />
          <Text style={[type.label, { color: colors.primary }]}>Cámara</Text>
        </Pressable>
        <Pressable onPress={elegir} style={[styles.button, { borderColor: colors.border, flex: 1 }]}>
          <Ionicons name="images-outline" size={18} color={colors.primary} />
          <Text style={[type.label, { color: colors.primary }]}>{uri ? retakeLabel : uploadLabel}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 16 },
  previewWrap: { marginBottom: 8, borderRadius: radii.md, overflow: 'hidden' },
  preview: { width: '100%', height: 170 },
  previewEditar: {
    position: 'absolute',
    right: 8,
    bottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: radii.pill,
  },
  placeholder: {
    width: '100%',
    height: 170,
    borderRadius: radii.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    marginBottom: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderIcono: {
    width: 48,
    height: 48,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actions: { flexDirection: 'row', gap: 8 },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: radii.sm,
    paddingVertical: 11,
    paddingHorizontal: 14,
  },
});
