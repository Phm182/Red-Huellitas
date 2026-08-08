import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as Linking from 'expo-linking';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { hueplayApi } from '../../../../src/api/hueplayApi';
import { COLOR_JUGADOR } from '../../../../src/juego/hueludo/TableroLudo';
import { HuePlaySala } from '../../../../src/types/hueplay';
import { radii } from '../../../../src/theme/elevation';
import { centeredContent } from '../../../../src/theme/layout';
import { fonts } from '../../../../src/theme/typography';
import { useTheme } from '../../../../src/theme/ThemeProvider';
import { compartirPost } from '../../../../src/utils/compartir';
import { hapticExito, hapticLeve, hapticMedio } from '../../../../src/utils/haptics';
import { rhAvatarUrl } from '../../../../src/utils/media';

const POLL_MS = 4000;

/** El lobby de una sala: quién aceptó, quién falta, compartir el código, e iniciar. */
export default function SalaLobbyScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const params = useLocalSearchParams<{ salaId?: string }>();
  const salaId = params.salaId ? Number(params.salaId) : 0;

  const [sala, setSala] = useState<HuePlaySala | null>(null);
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
    if (!salaId) return;
    const res = await hueplayApi.verSala(salaId);
    if (!vivoRef.current) return;
    if (res.success && res.data) {
      setSala(res.data.sala);
      setError(null);
    } else {
      setError(res.message ?? t('common.error'));
    }
    setCargando(false);
  }, [salaId, t]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  useEffect(() => {
    if (!sala || sala.estado !== 'esperando') return;
    const id = setInterval(cargar, POLL_MS);
    return () => clearInterval(id);
  }, [sala, cargar]);

  useEffect(() => {
    if (sala?.estado === 'jugando' || sala?.estado === 'terminada') {
      const pantalla = sala.juegoCodigo === 'huerummy' ? '/(app)/hueplay/rummy' : '/(app)/hueplay/ludo';
      router.replace({ pathname: pantalla, params: { salaId: sala.salaId } });
    }
  }, [sala]);

  const responder = async (aceptar: boolean) => {
    if (!sala) return;
    hapticMedio();
    setAccionando(true);
    const res = await hueplayApi.responderSala(sala.salaId, aceptar);
    setAccionando(false);
    if (res.success && res.data) {
      if (aceptar) hapticExito();
      if (!aceptar) {
        router.replace('/(app)/hueplay/desafios');
        return;
      }
      setSala(res.data.sala);
    } else {
      setError(res.message ?? t('common.error'));
    }
  };

  const iniciar = async () => {
    if (!sala) return;
    hapticMedio();
    setAccionando(true);
    const res = await hueplayApi.iniciarSala(sala.salaId);
    setAccionando(false);
    if (res.success && res.data) {
      setSala(res.data.sala);
    } else {
      setError(res.message ?? t('common.error'));
    }
  };

  const compartir = () => {
    if (!sala) return;
    hapticLeve();
    const url = Linking.createURL('/hueplay/sala-unirse', { queryParams: { codigo: sala.codigoInvitacion } });
    compartirPost({ texto: t('hueplay.sala.compartirTexto', { codigo: sala.codigoInvitacion }), url });
  };

  if (cargando) {
    return (
      <View style={[styles.centro, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!sala) {
    return (
      <View style={[styles.centro, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.danger }}>{error ?? t('common.error')}</Text>
      </View>
    );
  }

  const miAsiento = sala.jugadores.find((j) => j.esYo);
  const aceptados = sala.jugadores.filter((j) => j.estado === 'aceptado' || j.estado === 'jugando').length;

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={[styles.contenido, centeredContent]}>
      <Text style={[styles.codigo, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}>
        {sala.codigoInvitacion}
      </Text>
      <Pressable onPress={compartir} style={[styles.compartirBoton, { borderColor: colors.primary }]}>
        <Ionicons name="share-social-outline" size={16} color={colors.primary} />
        <Text style={{ color: colors.primary, fontFamily: fonts.bodySemi, fontSize: 13 }}>
          {t('hueplay.sala.compartirCodigo')}
        </Text>
      </Pressable>

      <Text style={[styles.seccion, { color: colors.textMuted }]}>
        {t('hueplay.sala.jugadoresDe', { n: sala.jugadores.filter((j) => j.estado !== 'rechazado').length, max: sala.maxJugadores })}
      </Text>

      {sala.jugadores.map((j) => (
        <View key={j.salaJugadorId} style={[styles.fila, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {j.avatarPath ? (
            <Image source={{ uri: rhAvatarUrl(j.avatarPath) }} style={styles.avatar} contentFit="cover" />
          ) : (
            <View style={[styles.avatar, styles.avatarVacio, { backgroundColor: colors.primarySoft }]}>
              <Ionicons name="person" size={18} color={colors.primary} />
            </View>
          )}
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ color: colors.text, fontFamily: fonts.bodySemi }} numberOfLines={1}>
              {j.esYo ? t('hueplay.ludo.vos') : j.username ? `@${j.username}` : j.nombreCompleto}
            </Text>
            <Text style={{ color: colors.textMuted, fontSize: 12 }}>{t(`hueplay.sala.estado.${j.estado}`)}</Text>
          </View>
          {j.estado === 'aceptado' || j.estado === 'jugando' ? (
            <Ionicons name="checkmark-circle" size={20} color={colors.success} />
          ) : j.estado === 'rechazado' ? (
            <Ionicons name="close-circle" size={20} color={colors.danger} />
          ) : (
            <Ionicons name="time-outline" size={20} color={colors.textMuted} />
          )}
        </View>
      ))}

      {Array.from({ length: Math.max(0, sala.maxJugadores - sala.jugadores.filter((j) => j.estado !== 'rechazado').length) }).map(
        (_, i) => (
          <View key={`libre-${i}`} style={[styles.fila, styles.filaLibre, { borderColor: colors.border }]}>
            <View style={[styles.avatar, styles.avatarVacio, { backgroundColor: colors.border }]}>
              <Ionicons name="person-add-outline" size={16} color={colors.textMuted} />
            </View>
            <Text style={{ color: colors.textMuted, fontSize: 13 }}>{t('hueplay.sala.asientoLibre')}</Text>
          </View>
        )
      )}

      {error ? <Text style={{ color: colors.danger, marginTop: 10, textAlign: 'center' }}>{error}</Text> : null}

      {miAsiento?.estado === 'invitado' ? (
        <View style={styles.accionesFila}>
          <Pressable
            disabled={accionando}
            onPress={() => responder(false)}
            style={[styles.botonSecundario, { borderColor: colors.border }]}
          >
            <Text style={{ color: colors.text, fontFamily: fonts.bodySemi }}>{t('hueplay.sala.rechazar')}</Text>
          </Pressable>
          <Pressable
            disabled={accionando}
            onPress={() => responder(true)}
            style={[styles.botonPrincipal, { backgroundColor: colors.primary }]}
          >
            {accionando ? (
              <ActivityIndicator size="small" color={colors.primaryText} />
            ) : (
              <Text style={{ color: colors.primaryText, fontFamily: fonts.bodySemi }}>{t('hueplay.sala.aceptar')}</Text>
            )}
          </Pressable>
        </View>
      ) : sala.soyCreador ? (
        <Pressable
          disabled={accionando || aceptados < 2}
          onPress={iniciar}
          style={[
            styles.botonIniciar,
            { backgroundColor: colors.primary, opacity: accionando || aceptados < 2 ? 0.5 : 1 },
          ]}
        >
          {accionando ? (
            <ActivityIndicator size="small" color={colors.primaryText} />
          ) : (
            <Text style={{ color: colors.primaryText, fontFamily: fonts.bodySemi, fontSize: 15 }}>
              {aceptados < 2 ? t('hueplay.sala.faltanJugadores') : t('hueplay.sala.iniciarPartida')}
            </Text>
          )}
        </Pressable>
      ) : (
        <Text style={{ color: colors.textMuted, fontSize: 13, marginTop: 20, textAlign: 'center' }}>
          {t('hueplay.sala.esperandoCreador')}
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
    fontSize: 30,
    fontFamily: fonts.displaySemi,
    letterSpacing: 6,
    borderWidth: 1,
    borderRadius: radii.lg,
    paddingHorizontal: 24,
    paddingVertical: 12,
    marginBottom: 12,
  },
  compartirBoton: {
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
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: 12,
    marginBottom: 8,
  },
  filaLibre: { borderStyle: 'dashed' },
  avatar: { width: 36, height: 36, borderRadius: 18 },
  avatarVacio: { alignItems: 'center', justifyContent: 'center' },
  accionesFila: { flexDirection: 'row', gap: 10, marginTop: 16 },
  botonSecundario: { flex: 1, borderWidth: 1, borderRadius: radii.pill, paddingVertical: 13, alignItems: 'center' },
  botonPrincipal: { flex: 1, borderRadius: radii.pill, paddingVertical: 13, alignItems: 'center' },
  botonIniciar: { borderRadius: radii.pill, paddingVertical: 14, alignItems: 'center', marginTop: 16 },
});
