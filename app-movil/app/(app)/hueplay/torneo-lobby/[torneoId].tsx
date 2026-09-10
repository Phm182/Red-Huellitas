import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as Linking from 'expo-linking';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { hueplayApi } from '../../../../src/api/hueplayApi';
import { HuePlayTorneo } from '../../../../src/types/hueplay';
import { radii } from '../../../../src/theme/elevation';
import { centeredContent } from '../../../../src/theme/layout';
import { fonts } from '../../../../src/theme/typography';
import { useTheme } from '../../../../src/theme/ThemeProvider';
import { compartirPost } from '../../../../src/utils/compartir';
import { hapticLeve, hapticMedio } from '../../../../src/utils/haptics';
import { rhAvatarUrl } from '../../../../src/utils/media';

const POLL_MS = 4000;

/** El lobby de inscripción de un torneo: quién se anotó, compartir el código,
 * e iniciar (sólo el creador). Cuando arranca, redirige a la vista de la
 * llave/tabla. */
export default function TorneoLobbyScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const params = useLocalSearchParams<{ torneoId?: string }>();
  const torneoId = params.torneoId ? Number(params.torneoId) : 0;

  const [torneo, setTorneo] = useState<HuePlayTorneo | null>(null);
  const [cargando, setCargando] = useState(true);
  const [accionando, setAccionando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const vivoRef = useRef(true);

  useEffect(() => {
    vivoRef.current = true;
    return () => {
      vivoRef.current = false;
    };
  }, []);

  const cargar = useCallback(async () => {
    if (!torneoId) return;
    const res = await hueplayApi.verTorneo(torneoId);
    if (!vivoRef.current) return;
    if (res.success && res.data) {
      setTorneo(res.data.torneo);
      setError(null);
    } else {
      setError(res.message ?? t('common.error'));
    }
    setCargando(false);
  }, [torneoId, t]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  useEffect(() => {
    if (!torneo || torneo.estado !== 'inscripcion') return;
    const id = setInterval(cargar, POLL_MS);
    return () => clearInterval(id);
  }, [torneo, cargar]);

  useEffect(() => {
    if (torneo && torneo.estado !== 'inscripcion') {
      router.replace({ pathname: '/(app)/hueplay/torneo/[torneoId]', params: { torneoId } });
    }
  }, [torneo, torneoId]);

  const iniciar = async () => {
    if (!torneo) return;
    hapticMedio();
    setAccionando(true);
    const res = await hueplayApi.iniciarTorneo(torneo.torneoId);
    setAccionando(false);
    if (res.success && res.data) {
      setTorneo(res.data.torneo);
    } else {
      setError(res.message ?? t('common.error'));
    }
  };

  const compartir = () => {
    if (!torneo) return;
    hapticLeve();
    const url = Linking.createURL('/hueplay/torneo-unirse', { queryParams: { codigo: torneo.codigoInvitacion } });
    compartirPost({ texto: t('hueplay.torneo.compartirTexto', { codigo: torneo.codigoInvitacion }), url });
  };

  if (cargando) {
    return (
      <View style={[styles.centro, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }
  if (!torneo) {
    return (
      <View style={[styles.centro, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.danger }}>{error ?? t('common.error')}</Text>
      </View>
    );
  }

  const inscriptos = torneo.participantes.length;

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={[styles.contenido, centeredContent]}>
      <Text style={{ color: colors.text, fontFamily: fonts.displaySemi, fontSize: 18, textAlign: 'center', marginBottom: 8 }}>
        {torneo.nombre}
      </Text>
      <Text style={[styles.codigo, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}>
        {torneo.codigoInvitacion}
      </Text>
      <Pressable onPress={compartir} style={[styles.compartir, { borderColor: colors.primary }]}>
        <Ionicons name="share-social-outline" size={16} color={colors.primary} />
        <Text style={{ color: colors.primary, fontFamily: fonts.bodySemi, fontSize: 13 }}>{t('hueplay.torneo.compartirCodigo')}</Text>
      </Pressable>

      <Text style={[styles.seccion, { color: colors.textMuted }]}>
        {t('hueplay.torneo.inscriptosDe', { n: inscriptos, max: torneo.tamano })} ·{' '}
        {torneo.formato === 'eliminacion' ? t('hueplay.torneo.eliminacion') : t('hueplay.torneo.liga')}
      </Text>

      {torneo.participantes.map((p) => (
        <View key={p.userId} style={[styles.fila, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {p.avatarPath ? (
            <Image source={{ uri: rhAvatarUrl(p.avatarPath) }} style={styles.avatar} contentFit="cover" />
          ) : (
            <View style={[styles.avatar, styles.avatarVacio, { backgroundColor: colors.primarySoft }]}>
              <Ionicons name="person" size={18} color={colors.primary} />
            </View>
          )}
          <Text style={{ color: colors.text, fontFamily: fonts.bodySemi, flex: 1 }} numberOfLines={1}>
            {p.esYo ? t('hueplay.ludo.vos') : p.nombre}
          </Text>
          {p.userId === torneo.creadorUserId ? (
            <Ionicons name="star" size={16} color={colors.primary} />
          ) : null}
        </View>
      ))}

      {error ? <Text style={{ color: colors.danger, marginTop: 10, textAlign: 'center' }}>{error}</Text> : null}

      {torneo.soyCreador ? (
        <Pressable
          disabled={accionando || inscriptos < 2}
          onPress={iniciar}
          style={[styles.boton, { backgroundColor: colors.primary, opacity: accionando || inscriptos < 2 ? 0.5 : 1 }]}
        >
          {accionando ? (
            <ActivityIndicator size="small" color={colors.primaryText} />
          ) : (
            <Text style={{ color: colors.primaryText, fontFamily: fonts.bodySemi, fontSize: 15 }}>
              {inscriptos < 2 ? t('hueplay.torneo.faltanJugadores') : t('hueplay.torneo.iniciar')}
            </Text>
          )}
        </Pressable>
      ) : (
        <Text style={{ color: colors.textMuted, fontSize: 13, marginTop: 20, textAlign: 'center' }}>
          {t('hueplay.torneo.esperandoCreador')}
        </Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  contenido: { padding: 16, paddingBottom: 32, alignItems: 'stretch' },
  codigo: {
    alignSelf: 'center',
    fontSize: 28,
    fontFamily: fonts.displaySemi,
    letterSpacing: 6,
    borderWidth: 1,
    borderRadius: radii.lg,
    paddingHorizontal: 22,
    paddingVertical: 10,
    marginBottom: 10,
  },
  compartir: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'center',
    borderWidth: 1,
    borderRadius: radii.pill,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  seccion: { fontSize: 12, fontFamily: fonts.bodySemi, marginTop: 22, marginBottom: 8, textTransform: 'uppercase' },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: radii.lg, padding: 12, marginBottom: 8 },
  avatar: { width: 36, height: 36, borderRadius: 18 },
  avatarVacio: { alignItems: 'center', justifyContent: 'center' },
  boton: { borderRadius: radii.pill, paddingVertical: 14, alignItems: 'center', marginTop: 16 },
});
