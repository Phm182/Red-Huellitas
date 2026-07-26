import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { perfilApi } from '../../src/api/perfilApi';
import { useAuth } from '../../src/auth/AuthProvider';
import { AppMessageModal } from '../../src/components/AppMessageModal';
import { ImagePickerField } from '../../src/components/ImagePickerField';
import { centeredContent } from '../../src/theme/layout';
import { useTheme } from '../../src/theme/ThemeProvider';
import { VerificacionEstado } from '../../src/types';
import { fetchAuthenticatedImageUri } from '../../src/utils/media';

type Slot = 'dniFrente' | 'dniDorso' | 'selfie';

type Dialogo = {
  titulo: string;
  cuerpo: string;
  onOk: () => void;
};

export default function VerificacionScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { token } = useAuth();

  const [dniFrente, setDniFrente] = useState<string | null>(null);
  const [dniDorso, setDniDorso] = useState<string | null>(null);
  const [selfie, setSelfie] = useState<string | null>(null);
  const [enServidor, setEnServidor] = useState<Record<Slot, boolean>>({
    dniFrente: false,
    dniDorso: false,
    selfie: false,
  });
  const [dirty, setDirty] = useState<Record<Slot, boolean>>({
    dniFrente: false,
    dniDorso: false,
    selfie: false,
  });
  const [estadoActual, setEstadoActual] = useState<VerificacionEstado | null>(null);
  const [cargandoPrevias, setCargandoPrevias] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState<string | null>(null);
  const [dialogo, setDialogo] = useState<Dialogo | null>(null);

  const mostrarResultado = (titulo: string, cuerpo: string, onOk: () => void) => {
    setDialogo({ titulo, cuerpo, onOk });
  };

  const cerrarDialogo = () => {
    const cb = dialogo?.onOk;
    setDialogo(null);
    cb?.();
  };

  const cargarPrevias = useCallback(async () => {
    setCargandoPrevias(true);
    const res = await perfilApi.estadoVerificacion();
    if (!res.success || !res.data) {
      setCargandoPrevias(false);
      return;
    }

    const est = res.data;
    setEstadoActual(est);
    setEnServidor({
      dniFrente: est.tieneDniFrente,
      dniDorso: est.tieneDniDorso,
      selfie: est.tieneSelfie,
    });

    const slots: Slot[] = ['dniFrente', 'dniDorso', 'selfie'];
    const tiene: Record<Slot, boolean> = {
      dniFrente: est.tieneDniFrente,
      dniDorso: est.tieneDniDorso,
      selfie: est.tieneSelfie,
    };
    const setters: Record<Slot, (uri: string | null) => void> = {
      dniFrente: setDniFrente,
      dniDorso: setDniDorso,
      selfie: setSelfie,
    };

    await Promise.all(
      slots.map(async (slot) => {
        if (!tiene[slot]) return;
        const uri = await fetchAuthenticatedImageUri(perfilApi.verificacionArchivoUrl(slot), token);
        if (uri) setters[slot](uri);
      })
    );

    setDirty({ dniFrente: false, dniDorso: false, selfie: false });
    setCargandoPrevias(false);
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      cargarPrevias();
    }, [cargarPrevias])
  );

  const completo =
    (Boolean(dniFrente) || enServidor.dniFrente) &&
    (Boolean(dniDorso) || enServidor.dniDorso) &&
    (Boolean(selfie) || enServidor.selfie);

  const marcar = (slot: Slot, uri: string) => {
    setDirty((prev) => ({ ...prev, [slot]: true }));
    setExito(null);
    setError(null);
    if (slot === 'dniFrente') setDniFrente(uri);
    if (slot === 'dniDorso') setDniDorso(uri);
    if (slot === 'selfie') setSelfie(uri);
  };

  const onEnviar = async () => {
    if (!completo) {
      const msg = t('onboarding.verificationNeedAllPhotos');
      setError(msg);
      setExito(null);
      mostrarResultado(t('onboarding.verificationTitle'), msg, () => undefined);
      return;
    }
    setError(null);
    setExito(null);
    setSubmitting(true);

    const payload: { dniFrente?: string; dniDorso?: string; selfie?: string } = {};
    // Sólo manda archivos nuevos o, si no hay dirty pero ya están las 3 en
    // servidor, reintenta el análisis automático sin re-subir.
    if (dirty.dniFrente && dniFrente) payload.dniFrente = dniFrente;
    if (dirty.dniDorso && dniDorso) payload.dniDorso = dniDorso;
    if (dirty.selfie && selfie) payload.selfie = selfie;

    const res = await perfilApi.subirVerificacion(payload);
    setSubmitting(false);

    if (res.success && res.data) {
      setEstadoActual(res.data);
      setEnServidor({
        dniFrente: res.data.tieneDniFrente,
        dniDorso: res.data.tieneDniDorso,
        selfie: res.data.tieneSelfie,
      });
      setDirty({ dniFrente: false, dniDorso: false, selfie: false });

      const estado = res.data.estadoRevision;
      const problemas = res.data.problemas ?? [];
      const titulo =
        estado === 'aprobado'
          ? t('onboarding.verificationApproved')
          : estado === 'rechazado'
            ? t('onboarding.verificationRejected')
            : t('onboarding.verificationPending');
      const cuerpoBase =
        estado === 'aprobado'
          ? t('onboarding.verificationAutoOk')
          : estado === 'rechazado'
            ? res.data.motivoRechazo || res.message || t('onboarding.verificationAutoFail')
            : res.message || t('onboarding.verificationAutoPending');
      const cuerpo =
        problemas.length > 0 && estado !== 'aprobado'
          ? `${cuerpoBase}\n\n${problemas.map((p) => `• ${p}`).join('\n')}`
          : cuerpoBase;

      setExito(cuerpo);
      setError(null);
      mostrarResultado(titulo, cuerpo, () => {
        if (estado === 'rechazado' || estado === 'pendiente') {
          router.replace('/(app)/ajustes/verificacion-estado');
        } else {
          router.replace('/(app)/(tabs)');
        }
      });
    } else {
      const msg = res.message || t('onboarding.verificationAutoFail');
      setError(msg);
      setExito(null);
      mostrarResultado(t('onboarding.verificationTitle'), msg, () => undefined);
    }
  };

  const problemas = estadoActual?.problemas ?? [];
  const checks = estadoActual?.checks;

  return (
    <>
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={[styles.container, centeredContent]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[styles.title, { color: colors.text }]}>{t('onboarding.verificationTitle')}</Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>{t('onboarding.verificationSubtitle')}</Text>
        <Text style={[styles.hint, { color: colors.textMuted }]}>{t('onboarding.verificationAutoHint')}</Text>

        {estadoActual && estadoActual.estadoRevision !== 'sin_enviar' ? (
          <View style={[styles.banner, { backgroundColor: colors.primarySoft, borderColor: colors.border }]}>
            <Text style={[styles.bannerTitle, { color: colors.text }]}>
              {t(
                estadoActual.estadoRevision === 'pendiente'
                  ? 'onboarding.verificationPending'
                  : estadoActual.estadoRevision === 'aprobado'
                    ? 'onboarding.verificationApproved'
                    : 'onboarding.verificationRejected'
              )}
            </Text>
            <Text style={[styles.bannerBody, { color: colors.textMuted }]}>
              {t('onboarding.verificationReplaceHint')}
            </Text>
          </View>
        ) : null}

        {cargandoPrevias ? (
          <ActivityIndicator color={colors.primary} style={{ marginVertical: 24 }} />
        ) : (
          <>
            <ImagePickerField
              label={t('onboarding.dniFront')}
              uri={dniFrente}
              onChange={(uri) => marcar('dniFrente', uri)}
              uploadLabel={t('onboarding.uploadPhoto')}
              retakeLabel={t('onboarding.retakePhoto')}
            />
            {checks && !checks.esDniFrente ? (
              <Text style={[styles.checkFail, { color: colors.danger }]}>
                {t('onboarding.verificationCheckFrontFail')}
              </Text>
            ) : null}

            <ImagePickerField
              label={t('onboarding.dniBack')}
              uri={dniDorso}
              onChange={(uri) => marcar('dniDorso', uri)}
              uploadLabel={t('onboarding.uploadPhoto')}
              retakeLabel={t('onboarding.retakePhoto')}
            />
            {checks && !checks.esDniDorso ? (
              <Text style={[styles.checkFail, { color: colors.danger }]}>
                {t('onboarding.verificationCheckBackFail')}
              </Text>
            ) : null}

            <ImagePickerField
              label={t('onboarding.selfie')}
              uri={selfie}
              onChange={(uri) => marcar('selfie', uri)}
              uploadLabel={t('onboarding.uploadPhoto')}
              retakeLabel={t('onboarding.retakePhoto')}
            />
            {checks && !checks.selfieTieneRostro ? (
              <Text style={[styles.checkFail, { color: colors.danger }]}>
                {t('onboarding.verificationCheckSelfieFail')}
              </Text>
            ) : null}
          </>
        )}

        {problemas.length > 0 ? (
          <View style={[styles.problemas, { borderColor: colors.danger }]}>
            <Text style={[styles.problemasTitle, { color: colors.danger }]}>
              {t('onboarding.verificationProblemsTitle')}
            </Text>
            {problemas.map((p) => (
              <Text key={p} style={{ color: colors.text, marginBottom: 4 }}>
                • {p}
              </Text>
            ))}
          </View>
        ) : null}

        {error ? <Text style={[styles.feedback, { color: colors.danger }]}>{error}</Text> : null}
        {exito ? <Text style={[styles.feedback, { color: colors.success }]}>{exito}</Text> : null}

        <Pressable
          style={[styles.button, { backgroundColor: completo && !submitting ? colors.primary : colors.border }]}
          onPress={onEnviar}
          disabled={!completo || submitting || cargandoPrevias}
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

      <AppMessageModal
        visible={dialogo != null}
        title={dialogo?.titulo ?? ''}
        message={dialogo?.cuerpo ?? ''}
        confirmLabel={t('onboarding.ok')}
        onClose={cerrarDialogo}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 24, paddingTop: 60, paddingBottom: 40 },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 8 },
  subtitle: { fontSize: 14, marginBottom: 8, lineHeight: 20 },
  hint: { fontSize: 13, marginBottom: 20, lineHeight: 18 },
  banner: { borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 16 },
  bannerTitle: { fontWeight: '700', marginBottom: 4 },
  bannerBody: { fontSize: 13, lineHeight: 18 },
  checkFail: { fontSize: 12, marginTop: -8, marginBottom: 12 },
  problemas: { borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 12 },
  problemasTitle: { fontWeight: '700', marginBottom: 8 },
  feedback: { marginBottom: 12, lineHeight: 20 },
  button: { borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 8 },
  skipLink: { marginTop: 16, alignItems: 'center' },
});
