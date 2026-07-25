import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { perfilApi } from '../../../src/api/perfilApi';
import { VerificacionEstado } from '../../../src/types';
import { centeredContent } from '../../../src/theme/layout';
import { useTheme } from '../../../src/theme/ThemeProvider';

const estadoLabelKey: Record<VerificacionEstado['estadoRevision'], string> = {
  sin_enviar: 'onboarding.verificationNotSent',
  pendiente: 'onboarding.verificationPending',
  aprobado: 'onboarding.verificationApproved',
  rechazado: 'onboarding.verificationRejected',
};

export default function VerificacionEstadoScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const [estado, setEstado] = useState<VerificacionEstado | null>(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let activo = true;
      setLoading(true);
      perfilApi.estadoVerificacion().then((res) => {
        if (activo && res.success && res.data) {
          setEstado(res.data);
        }
        setLoading(false);
      });
      return () => {
        activo = false;
      };
    }, [])
  );

  if (loading || !estado) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  const colorEstado =
    estado.estadoRevision === 'aprobado'
      ? colors.success
      : estado.estadoRevision === 'rechazado'
        ? colors.danger
        : colors.textMuted;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.label, { color: colors.text }]}>{t('settings.verificationStatusTitle')}</Text>
      <Text style={{ color: colorEstado, fontSize: 18, fontWeight: '700', marginBottom: 16 }}>
        {t(estadoLabelKey[estado.estadoRevision])}
      </Text>

      {estado.motivoRechazo ? (
        <Text style={{ color: colors.danger, marginBottom: 16 }}>{estado.motivoRechazo}</Text>
      ) : null}

      <View style={styles.checklist}>
        <Text style={{ color: colors.text }}>
          {t('onboarding.dniFront')}: {estado.tieneDniFrente ? '✅' : '—'}
        </Text>
        <Text style={{ color: colors.text }}>
          {t('onboarding.dniBack')}: {estado.tieneDniDorso ? '✅' : '—'}
        </Text>
        <Text style={{ color: colors.text }}>
          {t('onboarding.selfie')}: {estado.tieneSelfie ? '✅' : '—'}
        </Text>
      </View>

      <Pressable
        style={[styles.button, { backgroundColor: colors.primary, marginTop: 24 }]}
        onPress={() => router.push('/(onboarding)/verificacion')}
      >
        <Text style={{ color: colors.primaryText, fontWeight: '600' }}>{t('onboarding.retakePhoto')}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, ...centeredContent },
  centered: { alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 16, fontWeight: '600', marginBottom: 8 },
  checklist: { gap: 8 },
  button: { borderRadius: 10, padding: 14, alignItems: 'center' },
});
