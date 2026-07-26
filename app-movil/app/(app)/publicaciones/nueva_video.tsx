import * as ImagePicker from 'expo-image-picker';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { perfilApi } from '../../../src/api/perfilApi';
import { shortsApi } from '../../../src/api/shortsApi';
import { VerificacionEstado } from '../../../src/types';
import { centeredContent } from '../../../src/theme/layout';
import { useTheme } from '../../../src/theme/ThemeProvider';
import { SkeletonList } from '../../../src/components/ui/Skeleton';

export default function NuevoShortScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const [verificacion, setVerificacion] = useState<VerificacionEstado | null>(null);
  const [loadingGate, setLoadingGate] = useState(true);

  const [texto, setTexto] = useState('');
  const [videoUri, setVideoUri] = useState<string | null>(null);
  const [duracionSegundos, setDuracionSegundos] = useState(0);
  const [mimeType, setMimeType] = useState('video/mp4');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let activo = true;
      setLoadingGate(true);
      perfilApi.estadoVerificacion().then((res) => {
        if (activo && res.success && res.data) {
          setVerificacion(res.data);
        }
        if (activo) setLoadingGate(false);
      });
      return () => {
        activo = false;
      };
    }, [])
  );

  const elegirVideo = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['videos'],
      videoMaxDuration: 60,
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setVideoUri(asset.uri);
      setDuracionSegundos(Math.round((asset.duration ?? 0) / 1000));
      setMimeType(asset.mimeType ?? 'video/mp4');
    }
  };

  const puedePublicar = videoUri !== null && duracionSegundos > 0;

  const onPublicar = async () => {
    if (!puedePublicar || !videoUri) return;
    setError(null);
    setSubmitting(true);
    const res = await shortsApi.crear(texto.trim() || undefined, videoUri, duracionSegundos, mimeType);
    setSubmitting(false);
    if (res.success) {
      router.replace('/(app)/(tabs)/shorts');
    } else {
      setError(res.message);
    }
  };

  if (loadingGate) {
    return <SkeletonList />;
  }

  if (verificacion?.estadoRevision !== 'aprobado') {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background, padding: 32 }]}>
        <Text style={[styles.gateTitle, { color: colors.text }]}>{t('feed.verificationRequiredTitle')}</Text>
        <Text style={{ color: colors.textMuted, textAlign: 'center', marginTop: 8, marginBottom: 24 }}>
          {t('feed.verificationRequiredBody')}
        </Text>
        <Pressable
          style={[styles.button, { backgroundColor: colors.primary }]}
          onPress={() => router.push('/(app)/ajustes/verificacion-estado')}
        >
          <Text style={{ color: colors.primaryText, fontWeight: '600' }}>{t('feed.goToVerification')}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={[styles.container, { backgroundColor: colors.background }]}>
      {videoUri ? (
        <View style={[styles.videoPreview, { backgroundColor: '#000' }]}>
          <Text style={{ color: '#fff' }}>🎬 {duracionSegundos}s</Text>
        </View>
      ) : null}

      <Pressable style={[styles.pickButton, { borderColor: colors.primary }]} onPress={elegirVideo}>
        <Text style={{ color: colors.primary, fontWeight: '600' }}>
          {videoUri ? t('shorts.retakeVideo') : t('shorts.pickVideo')}
        </Text>
      </Pressable>

      <TextInput
        style={[styles.textarea, { borderColor: colors.border, color: colors.text }]}
        placeholder={t('feed.captionPlaceholder')}
        placeholderTextColor={colors.textMuted}
        value={texto}
        onChangeText={setTexto}
        multiline
      />

      {error ? <Text style={{ color: colors.danger, marginBottom: 12 }}>{error}</Text> : null}

      <Pressable
        style={[styles.button, { backgroundColor: puedePublicar ? colors.primary : colors.border }]}
        onPress={onPublicar}
        disabled={!puedePublicar || submitting}
      >
        {submitting ? (
          <ActivityIndicator color={colors.primaryText} />
        ) : (
          <Text style={{ color: colors.primaryText, fontWeight: '600' }}>{t('feed.publishButton')}</Text>
        )}
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  gateTitle: { fontSize: 18, fontWeight: '700', textAlign: 'center' },
  container: { flexGrow: 1, padding: 24, ...centeredContent },
  videoPreview: { width: '100%', height: 200, borderRadius: 10, marginBottom: 12, alignItems: 'center', justifyContent: 'center' },
  pickButton: { borderWidth: 1, borderRadius: 10, padding: 14, alignItems: 'center', marginBottom: 16 },
  textarea: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  button: { borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 8 },
});
