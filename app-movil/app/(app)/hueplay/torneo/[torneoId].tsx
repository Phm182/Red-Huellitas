import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { hueplayApi } from '../../../../src/api/hueplayApi';
import { useAuth } from '../../../../src/auth/AuthProvider';
import { LlaveEliminacion } from '../../../../src/juego/hueplay/LlaveEliminacion';
import { TablaLiga } from '../../../../src/juego/hueplay/TablaLiga';
import { HuePlayTorneo } from '../../../../src/types/hueplay';
import { radii } from '../../../../src/theme/elevation';
import { centeredContent } from '../../../../src/theme/layout';
import { fonts } from '../../../../src/theme/typography';
import { useTheme } from '../../../../src/theme/ThemeProvider';
import { hapticLeve } from '../../../../src/utils/haptics';

const POLL_MS = 5000;

/** Vista de un torneo en curso o terminado: llave (eliminación) o tabla
 * (liga), y un botón directo a "jugar mi partida" si al usuario le toca. */
export default function TorneoScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { user } = useAuth();
  const yoId = user?.userId ?? 0;
  const params = useLocalSearchParams<{ torneoId?: string }>();
  const torneoId = params.torneoId ? Number(params.torneoId) : 0;

  const [torneo, setTorneo] = useState<HuePlayTorneo | null>(null);
  const [cargando, setCargando] = useState(true);
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
    if (!torneo || torneo.estado === 'terminado' || torneo.estado === 'cancelado') return;
    const id = setInterval(cargar, POLL_MS);
    return () => clearInterval(id);
  }, [torneo, cargar]);

  useEffect(() => {
    if (torneo?.estado === 'inscripcion') {
      router.replace({ pathname: '/(app)/hueplay/torneo-lobby/[torneoId]', params: { torneoId } });
    }
  }, [torneo, torneoId]);

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

  const terminado = torneo.estado === 'terminado';

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={[styles.contenido, centeredContent]}>
      <Text style={{ color: colors.text, fontFamily: fonts.displaySemi, fontSize: 18, textAlign: 'center' }}>
        {torneo.nombre}
      </Text>
      <Text style={{ color: colors.textMuted, fontSize: 12, textAlign: 'center', marginTop: 2 }}>
        {torneo.formato === 'eliminacion' ? t('hueplay.torneo.eliminacion') : t('hueplay.torneo.liga')} ·{' '}
        {t('hueplay.torneo.inscriptosDe', { n: torneo.participantes.length, max: torneo.tamano })}
      </Text>

      {terminado ? (
        <View style={[styles.campeon, { backgroundColor: colors.primarySoft, borderColor: colors.primary }]}>
          <Ionicons name="trophy" size={20} color={colors.primary} />
          <Text style={{ color: colors.primary, fontFamily: fonts.bodySemi, fontSize: 14 }}>
            {t('hueplay.torneo.campeonEs', { nombre: torneo.ganadorNombre ?? '' })}
          </Text>
        </View>
      ) : torneo.miPartidaActiva ? (
        <Pressable
          onPress={() => {
            hapticLeve();
            router.push(torneo.miPartidaActiva!.ruta as never);
          }}
          style={[styles.jugar, { backgroundColor: colors.primary }]}
        >
          <Ionicons name="flash" size={16} color={colors.primaryText} />
          <Text style={{ color: colors.primaryText, fontFamily: fonts.bodySemi, fontSize: 14 }}>
            {t('hueplay.torneo.jugarMiPartida')}
          </Text>
        </Pressable>
      ) : (
        <Text style={{ color: colors.textMuted, fontSize: 13, textAlign: 'center', marginTop: 14 }}>
          {t('hueplay.torneo.sinPartidaAhora')}
        </Text>
      )}

      <View style={{ marginTop: 18 }}>
        {torneo.formato === 'eliminacion' ? (
          <LlaveEliminacion torneo={torneo} yoId={yoId} />
        ) : (
          <TablaLiga torneo={torneo} yoId={yoId} />
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  contenido: { padding: 16, paddingBottom: 40 },
  campeon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'center',
    borderWidth: 1,
    borderRadius: radii.pill,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginTop: 14,
  },
  jugar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: radii.pill,
    paddingVertical: 12,
    marginTop: 14,
  },
});
