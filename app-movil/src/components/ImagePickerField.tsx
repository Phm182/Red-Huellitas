import * as ImagePicker from 'expo-image-picker';
import React from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { comprimirImagen } from '../utils/imagen';

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
      <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
      {uri ? (
        <Image source={{ uri }} style={styles.preview} />
      ) : (
        <View style={[styles.placeholder, { borderColor: colors.border, backgroundColor: colors.surface }]}>
          {loading ? <ActivityIndicator color={colors.primary} /> : null}
        </View>
      )}
      <View style={styles.actions}>
        <Pressable
          onPress={tomarFoto}
          style={[styles.button, { borderColor: colors.primary }]}
        >
          <Text style={{ color: colors.primary }}>📷</Text>
        </Pressable>
        <Pressable onPress={elegir} style={[styles.button, { borderColor: colors.primary, flex: 1 }]}>
          <Text style={{ color: colors.primary }}>{uri ? retakeLabel : uploadLabel}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 6 },
  preview: { width: '100%', height: 140, borderRadius: 10, marginBottom: 8 },
  placeholder: {
    width: '100%',
    height: 140,
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: 'dashed',
    marginBottom: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actions: { flexDirection: 'row', gap: 8 },
  button: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
