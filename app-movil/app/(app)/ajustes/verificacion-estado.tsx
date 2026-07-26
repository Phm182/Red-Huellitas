import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
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
      <View style={[styles.screen, styles.centered, { backgroundColor: colors.background }]}>
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

  const problemas = estado.problemas ?? [];
  const checks = estado.checks;

  const metodoLabel = (() => {
    const m = estado.autoMetodo;
    if (!m || m === 'gemini_error' || m === 'pendiente') return null;
    if (m === 'gemini' || m === 'automatica') return t('onboarding.verificationMethodAuto');
    if (m === 'gemini+renaper' || m === 'automatica_renaper') {
      return t('onboarding.verificationMethodRenaper');
    }
    if (m === 'manual') return t('onboarding.verificationMethodManual');
    return null;
  })();

  const mostrarScore =
    estado.faceMatchScore != null &&
    metodoLabel != null &&
    estado.autoMetodo !== 'manual' &&
    estado.autoMetodo !== 'gemini_error';

  return (
    <ScrollView
      style={[styles.screen, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.container, centeredContent]}
    >
      <Text style={[styles.label, { color: colors.text }]}>{t('settings.verificationStatusTitle')}</Text>
      <Text style={{ color: colorEstado, fontSize: 18, fontWeight: '700', marginBottom: 16 }}>
        {t(estadoLabelKey[estado.estadoRevision])}
      </Text>

      {estado.motivoRechazo ? (
        <Text
          style={{
            color: estado.estadoRevision === 'rechazado' ? colors.danger : colors.textMuted,
            marginBottom: 16,
            lineHeight: 20,
          }}
        >
          {estado.motivoRechazo}
        </Text>
      ) : null}

      {problemas.length > 0 ? (
        <View style={[styles.problemas, { borderColor: colors.border }]}>
          <Text style={[styles.problemasTitle, { color: colors.text }]}>
            {t('onboarding.verificationProblemsTitle')}
          </Text>
          {problemas.map((p) => (
            <Text key={p} style={{ color: colors.textMuted, marginBottom: 4, lineHeight: 18 }}>
              • {p}
            </Text>
          ))}
        </View>
      ) : null}

      {checks ? (
        <View style={styles.checklist}>
          <Text style={{ color: checks.esDniFrente ? colors.success : colors.danger }}>
            {t('onboarding.dniFront')}: {checks.esDniFrente ? '✓' : '✗'}
          </Text>
          <Text style={{ color: checks.esDniDorso ? colors.success : colors.danger }}>
            {t('onboarding.dniBack')}: {checks.esDniDorso ? '✓' : '✗'}
          </Text>
          <Text style={{ color: checks.selfieTieneRostro ? colors.success : colors.danger }}>
            {t('onboarding.selfie')}: {checks.selfieTieneRostro ? '✓' : '✗'}
          </Text>
        </View>
      ) : (
        <View style={styles.checklist}>
          <Text style={{ color: colors.text }}>
            {t('onboarding.dniFront')}: {estado.tieneDniFrente ? '✓' : '—'}
          </Text>
          <Text style={{ color: colors.text }}>
            {t('onboarding.dniBack')}: {estado.tieneDniDorso ? '✓' : '—'}
          </Text>
          <Text style={{ color: colors.text }}>
            {t('onboarding.selfie')}: {estado.tieneSelfie ? '✓' : '—'}
          </Text>
        </View>
      )}

      {metodoLabel ? (
        <Text style={{ color: colors.textMuted, marginTop: 12, fontSize: 13 }}>
          {t('onboarding.verificationMethod')}: {metodoLabel}
          {mostrarScore
            ? ` · ${t('onboarding.verificationFaceScore')}: ${Math.round((estado.faceMatchScore ?? 0) * 100)}%`
            : ''}
        </Text>
      ) : null}

      {estado.estadoRevision !== 'aprobado' ? (
        <Pressable
          style={[styles.button, { backgroundColor: colors.primary, marginTop: 24 }]}
          onPress={() => router.push('/(onboarding)/verificacion')}
        >
          <Text style={{ color: colors.primaryText, fontWeight: '600' }}>
            {t('onboarding.verificationResubmit')}
          </Text>
        </Pressable>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  container: { flexGrow: 1, padding: 24, paddingBottom: 40 },
  centered: { alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 16, fontWeight: '600', marginBottom: 8 },
  checklist: { gap: 8 },
  problemas: { borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 16 },
  problemasTitle: { fontWeight: '700', marginBottom: 8 },
  button: { borderRadius: 10, padding: 14, alignItems: 'center' },
});
