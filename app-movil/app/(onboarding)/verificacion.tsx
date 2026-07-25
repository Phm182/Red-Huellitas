import { router } from 'expo-router';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { perfilApi } from '../../src/api/perfilApi';
import { ImagePickerField } from '../../src/components/ImagePickerField';
import { centeredContent } from '../../src/theme/layout';
import { useTheme } from '../../src/theme/ThemeProvider';

export default function VerificacionScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const [dniFrente, setDniFrente] = useState<string | null>(null);
  const [dniDorso, setDniDorso] = useState<string | null>(null);
  const [selfie, setSelfie] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const completo = Boolean(dniFrente && dniDorso && selfie);

  const onEnviar = async () => {
    if (!completo) {
      setError(t('onboarding.verificationNeedAllPhotos'));
      return;
    }
    setError(null);
    setSubmitting(true);
    const res = await perfilApi.subirVerificacion({
      dniFrente: dniFrente ?? undefined,
      dniDorso: dniDorso ?? undefined,
      selfie: selfie ?? undefined,
    });
    setSubmitting(false);
    if (res.success && res.data) {
      const estado = res.data.estadoRevision;
      const titulo =
        estado === 'aprobado'
          ? t('onboarding.verificationApproved')
          : estado === 'rechazado'
            ? t('onboarding.verificationRejected')
            : t('onboarding.verificationPending');
      const cuerpo =
        estado === 'aprobado'
          ? t('onboarding.verificationAutoOk')
          : estado === 'rechazado'
            ? res.data.motivoRechazo || res.message || t('onboarding.verificationAutoFail')
            : t('onboarding.verificationAutoPending');
      Alert.alert(titulo, cuerpo, [
        {
          text: 'OK',
          onPress: () => {
            if (estado === 'rechazado') {
              router.replace('/(app)/ajustes/verificacion-estado');
            } else {
              router.replace('/(app)/(tabs)');
            }
          },
        },
      ]);
    } else {
      setError(res.message);
    }
  };

  return (
    <ScrollView contentContainerStyle={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text }]}>{t('onboarding.verificationTitle')}</Text>
      <Text style={[styles.subtitle, { color: colors.textMuted }]}>{t('onboarding.verificationSubtitle')}</Text>
      <Text style={[styles.hint, { color: colors.textMuted }]}>{t('onboarding.verificationAutoHint')}</Text>

      <ImagePickerField
        label={t('onboarding.dniFront')}
        uri={dniFrente}
        onChange={setDniFrente}
        uploadLabel={t('onboarding.uploadPhoto')}
        retakeLabel={t('onboarding.retakePhoto')}
      />
      <ImagePickerField
        label={t('onboarding.dniBack')}
        uri={dniDorso}
        onChange={setDniDorso}
        uploadLabel={t('onboarding.uploadPhoto')}
        retakeLabel={t('onboarding.retakePhoto')}
      />
      <ImagePickerField
        label={t('onboarding.selfie')}
        uri={selfie}
        onChange={setSelfie}
        uploadLabel={t('onboarding.uploadPhoto')}
        retakeLabel={t('onboarding.retakePhoto')}
      />

      {error ? <Text style={{ color: colors.danger, marginBottom: 12 }}>{error}</Text> : null}

      <Pressable
        style={[styles.button, { backgroundColor: completo ? colors.primary : colors.border }]}
        onPress={onEnviar}
        disabled={!completo || submitting}
      >
        {submitting ? (
          <ActivityIndicator color={colors.primaryText} />
        ) : (
          <Text style={{ color: colors.primaryText, fontWeight: '600' }}>{t('common.send')}</Text>
        )}
      </Pressable>

      <Pressable style={styles.skipLink} onPress={() => router.replace('/(app)/(tabs)')}>
        <Text style={{ color: colors.textMuted }}>{t('onboarding.skipForNow')}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 24, paddingTop: 60, ...centeredContent },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 8 },
  subtitle: { fontSize: 14, marginBottom: 8, lineHeight: 20 },
  hint: { fontSize: 13, marginBottom: 20, lineHeight: 18 },
  button: { borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 8 },
  skipLink: { marginTop: 16, alignItems: 'center' },
});
