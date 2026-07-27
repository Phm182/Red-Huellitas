import * as Linking from 'expo-linking';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { suscripcionApi } from '../../../src/api/suscripcionApi';
import { perfilApi } from '../../../src/api/perfilApi';
import { mpVendedorApi } from '../../../src/api/mpVendedorApi';
import { MpVendedorEstado, SuscripcionEstado, VerificacionEstado } from '../../../src/types';
import { centeredContent } from '../../../src/theme/layout';
import { useTheme } from '../../../src/theme/ThemeProvider';
import { SkeletonList } from '../../../src/components/ui/Skeleton';

export default function SuscripcionScreen() {
  const { t } = useTranslation();
  const { colors, theme } = useTheme();

  const [verificacion, setVerificacion] = useState<VerificacionEstado | null>(null);
  const [loadingGate, setLoadingGate] = useState(true);
  const [suscripcion, setSuscripcion] = useState<SuscripcionEstado | null>(null);
  const [planes, setPlanes] = useState<import('../../../src/types').SuscripcionPlan[]>([]);
  const [planElegido, setPlanElegido] = useState<number | null>(null);
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

  const [planesError, setPlanesError] = useState<string | null>(null);

  const cargarEstado = useCallback(() => {
    setLoading(true);
    setPlanesError(null);
    Promise.all([suscripcionApi.estado(), suscripcionApi.planes()])
      .then(([resEst, resPlanes]) => {
        if (resEst.success && resEst.data) {
          setSuscripcion(resEst.data.suscripcion);
        }
        if (resPlanes.success && resPlanes.data) {
          const lista = resPlanes.data.planes ?? [];
          setPlanes(lista);
          setPlanElegido((prev) => prev ?? lista[0]?.planId ?? null);
          if (lista.length === 0) {
            setPlanesError(t('suscripcion.sinPlanes'));
          }
        } else {
          setPlanes([]);
          setPlanesError(resPlanes.message || t('suscripcion.sinPlanes'));
        }
        setLoading(false);
      })
      .catch(() => {
        setPlanes([]);
        setPlanesError(t('suscripcion.sinPlanes'));
        setLoading(false);
      });
  }, [t]);

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
        if (res.data.marketplaceListo === false) {
          setMpVendedorError(t('mpVendedor.noConfigurado'));
        } else {
          setMpVendedorError(null);
        }
      }
    });
  }, [t]);

  useFocusEffect(
    useCallback(() => {
      cargarMpVendedor();
    }, [cargarMpVendedor])
  );

  const onSolicitarManual = async () => {
    setEnviandoManual(true);
    const res = await suscripcionApi.solicitarManual(planElegido ?? undefined);
    setEnviandoManual(false);
    if (res.success && res.data) {
      setWhatsappUrl(res.data.whatsappUrl);
      setSolicitudEnviada(true);
    }
  };

  const onPagarMp = async () => {
    setMpError(null);
    setEnviandoMp(true);
    const res = await suscripcionApi.crearPreapprovalMp(planElegido ?? undefined);
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

  const abrirOauthMp = async (forceLogin: boolean) => {
    const res = await mpVendedorApi.conectar(theme, forceLogin);
    if (res.success && res.data?.authorizeUrl) {
      try {
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          window.open(res.data.authorizeUrl, '_blank', 'noopener,noreferrer');
        } else {
          await Linking.openURL(res.data.authorizeUrl);
        }
        return true;
      } catch {
        setMpVendedorError(t('mpVendedor.noSePudoAbrir'));
        return false;
      }
    }
    setMpVendedorError(res.message || t('mpVendedor.noConfigurado'));
    return false;
  };

  const onConectarMp = async () => {
    setMpVendedorError(null);
    setMpVendedorBusy(true);
    await abrirOauthMp(false);
    setMpVendedorBusy(false);
  };

  /** Cambia de cuenta sin desvincular antes: si cancela, sigue con la actual. */
  const onCambiarCuentaMp = async () => {
    setMpVendedorError(null);
    setMpVendedorBusy(true);
    await abrirOauthMp(true);
    setMpVendedorBusy(false);
  };

  const onDesconectarMp = () => {
    const title = t('mpVendedor.desconectarConfirmTitle');
    const message = t('mpVendedor.desconectarConfirmBody');
    const confirmar = async () => {
      setMpVendedorError(null);
      setMpVendedorBusy(true);
      const res = await mpVendedorApi.desconectar();
      setMpVendedorBusy(false);
      if (res.success) {
        setMpVendedor({ conectado: false, mpEmail: null, mpNombre: null, mpTelefono: null });
      } else {
        setMpVendedorError(res.message || t('mpVendedor.noSePudoDesconectar'));
      }
    };

    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.confirm(`${title}\n\n${message}`)) {
        void confirmar();
      }
      return;
    }

    Alert.alert(title, message, [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('mpVendedor.desconectarButton'), style: 'destructive', onPress: () => void confirmar() },
    ]);
  };

  if (loadingGate || loading) {
    return <SkeletonList />;
  }

  const verificada = verificacion?.estadoRevision === 'aprobado';

  return (
    <ScrollView contentContainerStyle={[styles.container, { backgroundColor: colors.background }, centeredContent]}>
      <View style={[styles.estadoCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={{ color: colors.text, fontWeight: '700', fontSize: 18 }}>{t('suscripcion.tituloLista')}</Text>
        {suscripcion?.activa ? (
          <Text style={{ color: colors.success, fontWeight: '600', marginTop: 8 }}>
            {(suscripcion.planNombre || suscripcion.planCodigo || 'HuePlus') +
              ' · ' +
              t('suscripcion.activaHasta', { fecha: suscripcion.pagaHasta })}
          </Text>
        ) : (
          <Text style={{ color: colors.textMuted, marginTop: 8 }}>{t('suscripcion.sinSuscripcion')}</Text>
        )}
      </View>

      {!verificada ? (
        <View style={[styles.estadoCard, { backgroundColor: colors.surface, borderColor: colors.warning }]}>
          <Text style={{ color: colors.text, fontWeight: '600' }}>{t('feed.verificationRequiredTitle')}</Text>
          <Text style={{ color: colors.textMuted, marginTop: 6, marginBottom: 12 }}>
            {t('suscripcion.verificacionParaPagar')}
          </Text>
          <Pressable
            style={[styles.button, { backgroundColor: colors.primary }]}
            onPress={() => router.push('/(app)/ajustes/verificacion-estado')}
          >
            <Text style={{ color: colors.primaryText, fontWeight: '600' }}>{t('feed.goToVerification')}</Text>
          </Pressable>
        </View>
      ) : null}

      {planesError ? (
        <Text style={{ color: colors.danger, marginBottom: 12 }}>{planesError}</Text>
      ) : null}

      {planes.map((plan) => {
        const elegido = planElegido === plan.planId;
        return (
          <Pressable
            key={plan.planId}
            onPress={() => setPlanElegido(plan.planId)}
            style={[
              styles.estadoCard,
              {
                backgroundColor: colors.surface,
                borderColor: elegido ? colors.primary : colors.border,
                borderWidth: elegido ? 2 : 1,
              },
            ]}
          >
            <Text style={{ color: colors.text, fontWeight: '700', fontSize: 17 }}>{plan.nombre}</Text>
            <Text style={{ color: colors.primary, fontWeight: '700', marginTop: 4 }}>
              ${plan.montoMensual.toLocaleString('es-AR')}/mes
            </Text>
            {plan.descripcion ? (
              <Text style={{ color: colors.textMuted, marginTop: 8 }}>{plan.descripcion}</Text>
            ) : null}
            {(plan.items ?? []).map((it) => (
              <Text key={it.itemId} style={{ color: colors.text, marginTop: 6 }}>
                • {it.texto}
              </Text>
            ))}
          </Pressable>
        );
      })}

      <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('suscripcion.pagarCon')}</Text>

      <Pressable
        style={[styles.button, { backgroundColor: colors.primary, opacity: verificada ? 1 : 0.45 }]}
        onPress={onPagarMp}
        disabled={enviandoMp || !verificada || !planElegido}
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
          style={[
            styles.button,
            { borderWidth: 1, borderColor: colors.primary, marginTop: 16, opacity: verificada ? 1 : 0.45 },
          ]}
          onPress={onSolicitarManual}
          disabled={enviandoManual || !verificada || !planElegido}
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
            <Text style={{ color: colors.textMuted, fontSize: 13, marginBottom: 2 }}>
              {t('mpVendedor.conectadoComoLabel')}
            </Text>
            {mpVendedor.mpNombre ? (
              <Text style={{ color: colors.success, fontWeight: '700', marginBottom: 4 }}>
                {mpVendedor.mpNombre}
              </Text>
            ) : null}
            {mpVendedor.mpEmail ? (
              <Text style={{ color: colors.textMuted, marginBottom: 2 }}>{mpVendedor.mpEmail}</Text>
            ) : null}
            {mpVendedor.mpTelefono ? (
              <Text style={{ color: colors.textMuted, marginBottom: 12 }}>{mpVendedor.mpTelefono}</Text>
            ) : (
              <View style={{ height: 12 }} />
            )}
            <View style={styles.mpActions}>
              <Pressable
                style={[styles.button, styles.mpActionBtn, { borderWidth: 1, borderColor: colors.primary }]}
                onPress={onCambiarCuentaMp}
                disabled={mpVendedorBusy}
              >
                {mpVendedorBusy ? (
                  <ActivityIndicator color={colors.primary} />
                ) : (
                  <Text style={{ color: colors.primary, fontWeight: '600', textAlign: 'center' }}>
                    {t('mpVendedor.cambiarCuentaButton')}
                  </Text>
                )}
              </Pressable>
              <Pressable
                style={[styles.button, styles.mpActionBtn, { borderWidth: 1, borderColor: colors.danger }]}
                onPress={onDesconectarMp}
                disabled={mpVendedorBusy}
              >
                <Text style={{ color: colors.danger, fontWeight: '600', textAlign: 'center' }}>
                  {t('mpVendedor.desconectarButton')}
                </Text>
              </Pressable>
            </View>
          </>
        ) : (
          <Pressable
            style={[styles.button, { backgroundColor: colors.primary, opacity: verificada ? 1 : 0.45 }]}
            onPress={onConectarMp}
            disabled={mpVendedorBusy || !verificada}
          >
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
  mpActions: { flexDirection: 'row', gap: 10 },
  mpActionBtn: { flex: 1 },
});
