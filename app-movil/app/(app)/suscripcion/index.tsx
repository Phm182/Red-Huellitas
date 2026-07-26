import * as Linking from 'expo-linking';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { suscripcionApi } from '../../../src/api/suscripcionApi';
import { perfilApi } from '../../../src/api/perfilApi';
import { mpVendedorApi } from '../../../src/api/mpVendedorApi';
import { MpVendedorEstado, SuscripcionEstado, VerificacionEstado } from '../../../src/types';
import { centeredContent } from '../../../src/theme/layout';
import { useTheme } from '../../../src/theme/ThemeProvider';
import { SkeletonList } from '../../../src/components/ui/Skeleton';

export default function SuscripcionScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const [verificacion, setVerificacion] = useState<VerificacionEstado | null>(null);
  const [loadingGate, setLoadingGate] = useState(true);
  const [suscripcion, setSuscripcion] = useState<SuscripcionEstado | null>(null);
  const [loading, setLoading] = useState(true);

  const [enviandoManual, setEnviandoManual] = useState(false);
  const [whatsappUrl, setWhatsappUrl] = useState<string | null>(null);
  const [solicitudEnviada, setSolicitudEnviada] = useState(false);

  const [enviandoMp, setEnviandoMp] = useState(false);
  const [mpError, setMpError] = useState<string | null>(null);
  const [mpInitPoint, setMpInitPoint] = useState<string | null>(null);
  const [resincronizando, setResincronizando] = useState(false);

  const [mpVendedor, setMpVendedor] = useState<MpVendedorEstado | null>(null);
  const [mpVendedorBusy, setMpVendedorBusy] = useState(false);
  const [mpVendedorError, setMpVendedorError] = useState<string | null>(null);

  const cargarEstado = useCallback(() => {
    setLoading(true);
    suscripcionApi.estado().then((res) => {
      if (res.success && res.data) {
        setSuscripcion(res.data.suscripcion);
      }
      setLoading(false);
    });
  }, []);

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

  useFocusEffect(
    useCallback(() => {
      cargarEstado();
    }, [cargarEstado])
  );

  const cargarMpVendedor = useCallback(() => {
    mpVendedorApi.estado().then((res) => {
      if (res.success && res.data) {
        setMpVendedor(res.data);
      }
    });
  }, []);

  useFocusEffect(
    useCallback(() => {
      cargarMpVendedor();
    }, [cargarMpVendedor])
  );

  const onSolicitarManual = async () => {
    setEnviandoManual(true);
    const res = await suscripcionApi.solicitarManual();
    setEnviandoManual(false);
    if (res.success && res.data) {
      setWhatsappUrl(res.data.whatsappUrl);
      setSolicitudEnviada(true);
    }
  };

  const onPagarMp = async () => {
    setMpError(null);
    setEnviandoMp(true);
    const res = await suscripcionApi.crearPreapprovalMp();
    setEnviandoMp(false);
    if (res.success && res.data?.initPoint) {
      setMpInitPoint(res.data.initPoint);
      Linking.openURL(res.data.initPoint);
    } else {
      setMpError(res.message);
    }
  };

  const onResync = async () => {
    setResincronizando(true);
    const res = await suscripcionApi.resyncMp();
    setResincronizando(false);
    if (res.success && res.data) {
      setSuscripcion(res.data.suscripcion);
    } else {
      setMpError(res.message);
    }
  };

  const onConectarMp = async () => {
    setMpVendedorError(null);
    setMpVendedorBusy(true);
    const res = await mpVendedorApi.conectar();
    setMpVendedorBusy(false);
    if (res.success && res.data) {
      Linking.openURL(res.data.authorizeUrl);
    } else {
      setMpVendedorError(res.message);
    }
  };

  const onCambiarCuentaMp = async () => {
    setMpVendedorError(null);
    setMpVendedorBusy(true);
    await mpVendedorApi.desconectar();
    const res = await mpVendedorApi.conectar();
    setMpVendedorBusy(false);
    if (res.success && res.data) {
      setMpVendedor({ conectado: false, mpEmail: null });
      Linking.openURL(res.data.authorizeUrl);
    } else {
      setMpVendedorError(res.message);
    }
  };

  if (loadingGate || loading) {
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
    <ScrollView contentContainerStyle={[styles.container, { backgroundColor: colors.background }, centeredContent]}>
      <View style={[styles.estadoCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={{ color: colors.text, fontWeight: '700', fontSize: 18 }}>{t('suscripcion.tituloLista')}</Text>
        {suscripcion?.activa ? (
          <Text style={{ color: colors.success, fontWeight: '600', marginTop: 8 }}>
            {t('suscripcion.activaHasta', { fecha: suscripcion.pagaHasta })}
          </Text>
        ) : (
          <Text style={{ color: colors.textMuted, marginTop: 8 }}>{t('suscripcion.sinSuscripcion')}</Text>
        )}
      </View>

      <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('suscripcion.pagarCon')}</Text>

      <Pressable
        style={[styles.button, { backgroundColor: colors.primary }]}
        onPress={onPagarMp}
        disabled={enviandoMp}
      >
        {enviandoMp ? (
          <ActivityIndicator color={colors.primaryText} />
        ) : (
          <Text style={{ color: colors.primaryText, fontWeight: '600' }}>{t('suscripcion.pagarMercadoPago')}</Text>
        )}
      </Pressable>
      {mpInitPoint ? (
        <Pressable
          style={[styles.button, { borderWidth: 1, borderColor: colors.primary, marginTop: 8 }]}
          onPress={onResync}
          disabled={resincronizando}
        >
          {resincronizando ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <Text style={{ color: colors.primary, fontWeight: '600' }}>{t('suscripcion.yaPagueActualizar')}</Text>
          )}
        </Pressable>
      ) : null}
      {mpError ? <Text style={{ color: colors.danger, marginTop: 8 }}>{mpError}</Text> : null}

      {!solicitudEnviada ? (
        <Pressable
          style={[styles.button, { borderWidth: 1, borderColor: colors.primary, marginTop: 16 }]}
          onPress={onSolicitarManual}
          disabled={enviandoManual}
        >
          {enviandoManual ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <Text style={{ color: colors.primary, fontWeight: '600' }}>{t('suscripcion.pagarTransferencia')}</Text>
          )}
        </Pressable>
      ) : (
        <View style={[styles.estadoCard, { backgroundColor: colors.surface, borderColor: colors.border, marginTop: 16 }]}>
          <Text style={{ color: colors.text, marginBottom: 12 }}>{t('suscripcion.solicitudEnviada')}</Text>
          {whatsappUrl ? (
            <Pressable
              style={[styles.button, { backgroundColor: colors.primary }]}
              onPress={() => Linking.openURL(whatsappUrl)}
            >
              <Text style={{ color: colors.primaryText, fontWeight: '600' }}>{t('adopcion.contactarWhatsapp')}</Text>
            </Pressable>
          ) : (
            <Text style={{ color: colors.textMuted, fontSize: 12 }}>{t('suscripcion.sinWhatsappSoporte')}</Text>
          )}
        </View>
      )}

      <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 24 }]}>{t('mpVendedor.tituloSeccion')}</Text>
      <View style={[styles.estadoCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={{ color: colors.textMuted, marginBottom: 12 }}>{t('mpVendedor.descripcion')}</Text>
        {mpVendedor?.conectado ? (
          <>
            <Text style={{ color: colors.success, fontWeight: '600', marginBottom: 12 }}>
              {t('mpVendedor.conectadoComo', { email: mpVendedor.mpEmail })}
            </Text>
            <Pressable
              style={[styles.button, { borderWidth: 1, borderColor: colors.primary }]}
              onPress={onCambiarCuentaMp}
              disabled={mpVendedorBusy}
            >
              {mpVendedorBusy ? (
                <ActivityIndicator color={colors.primary} />
              ) : (
                <Text style={{ color: colors.primary, fontWeight: '600' }}>{t('mpVendedor.cambiarCuentaButton')}</Text>
              )}
            </Pressable>
          </>
        ) : (
          <Pressable style={[styles.button, { backgroundColor: colors.primary }]} onPress={onConectarMp} disabled={mpVendedorBusy}>
            {mpVendedorBusy ? (
              <ActivityIndicator color={colors.primaryText} />
            ) : (
              <Text style={{ color: colors.primaryText, fontWeight: '600' }}>{t('mpVendedor.conectarButton')}</Text>
            )}
          </Pressable>
        )}
        {mpVendedorError ? <Text style={{ color: colors.danger, marginTop: 8 }}>{mpVendedorError}</Text> : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  gateTitle: { fontSize: 18, fontWeight: '700', textAlign: 'center' },
  container: { flexGrow: 1, padding: 24 },
  estadoCard: { borderWidth: 1, borderRadius: 12, padding: 16, marginBottom: 20 },
  sectionTitle: { fontSize: 14, fontWeight: '600', marginBottom: 10 },
  button: { borderRadius: 10, padding: 14, alignItems: 'center' },
});
