import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { cadenasApi } from '../../../src/api/historiasApi';
import { AppButton } from '../../../src/components/AppButton';
import { CadenaDetalle } from '../../../src/types';
import { elevation, radii } from '../../../src/theme/elevation';
import { centeredContent } from '../../../src/theme/layout';
import { type } from '../../../src/theme/typography';
import { useTheme } from '../../../src/theme/ThemeProvider';
import { rhMediaUrl } from '../../../src/utils/media';
import { EmptyState } from '../../../src/components/ui/EmptyState';
import { SkeletonList } from '../../../src/components/ui/Skeleton';

/**
 * Detalle de una cadena: el hilo completo, en el orden en que se fue armando.
 *
 * Las historias se muestran como miniaturas en fila; tocar cualquiera abre el
 * visor del autor correspondiente.
 */
export default function CadenaDetalleScreen() {
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [detalle, setDetalle] = useState<CadenaDetalle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      cadenasApi.obtener(Number(id)).then((res) => {
        if (res.success && res.data) {
          setDetalle(res.data);
          setError(null);
        } else {
          setError(res.message);
        }
        setLoading(false);
      });
    }, [id])
  );

  if (loading) return <SkeletonList cantidad={4} />;

  if (error || !detalle) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center' }}>
        <EmptyState icon="link-outline" titulo={error ?? 'Cadena no encontrada'} />
      </View>
    );
  }

  const { cadena, participantes, historias } = detalle;

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[styles.contenedor, centeredContent]}
    >
      <Animated.View
        entering={FadeInDown.springify().damping(18)}
        style={[styles.hero, elevation.sm, { backgroundColor: colors.surface, borderColor: colors.border }]}
      >
        <View style={[styles.icono, { backgroundColor: colors.primarySoft }]}>
          <Ionicons name="link" size={26} color={colors.primary} />
        </View>
        <Text style={[type.title, { color: colors.text, textAlign: 'center' }]}>{cadena.tema}</Text>
        {cadena.descripcion ? (
          <Text style={[type.bodySm, { color: colors.textMuted, textAlign: 'center' }]}>
            {cadena.descripcion}
          </Text>
        ) : null}
        {cadena.creador ? (
          <Text style={[type.caption, { color: colors.textMuted }]}>
            La empezó {cadena.creador.nombreCompleto}
          </Text>
        ) : null}

        <View style={[styles.stats, { borderColor: colors.border }]}>
          <View style={styles.stat}>
            <Text style={[type.titleSm, { color: colors.text }]}>{cadena.totalParticipantes}</Text>
            <Text style={[type.caption, { color: colors.textMuted }]}>
              {cadena.totalParticipantes === 1 ? 'participante' : 'participantes'}
            </Text>
          </View>
          <View style={styles.stat}>
            <Text style={[type.titleSm, { color: colors.text }]}>{historias.length}</Text>
            <Text style={[type.caption, { color: colors.textMuted }]}>
              {historias.length === 1 ? 'historia activa' : 'historias activas'}
            </Text>
          </View>
        </View>

        <AppButton
          label={cadena.yaParticipa ? 'Sumar otra historia' : 'Continuar cadena'}
          onPress={() => router.push(`/(app)/historias/nueva?cadenaId=${cadena.cadenaId}` as never)}
          style={{ alignSelf: 'stretch', marginTop: 4 }}
        />
      </Animated.View>

      <Text style={[type.section, { color: colors.text, marginBottom: 10 }]}>El hilo</Text>

      {historias.length === 0 ? (
        <EmptyState
          icon="time-outline"
          titulo="Las historias vencieron"
          descripcion="La cadena sigue viva: subí la tuya y arranca de nuevo."
          accionLabel="Sumar mi historia"
          onAccion={() => router.push(`/(app)/historias/nueva?cadenaId=${cadena.cadenaId}` as never)}
        />
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hilo}>
          {historias.map((h, i) => (
            <Pressable
              key={h.historiaId}
              style={styles.miniatura}
              onPress={() => router.push(`/(app)/historias/${h.userId}`)}
            >
              <Image
                source={{ uri: rhMediaUrl(h.mediaPath) }}
                style={styles.miniaturaFoto}
                contentFit="cover"
                transition={200}
              />
              <View style={styles.miniaturaOverlay}>
                <Text style={[type.caption, styles.miniaturaPos]}>{i + 1}º</Text>
                <Text style={[type.caption, styles.miniaturaAutor]} numberOfLines={1}>
                  {h.autor?.nombreCompleto ?? ''}
                </Text>
              </View>
              {h.tipoMedia === 'video' ? (
                <Ionicons name="play-circle" size={22} color="#fff" style={styles.miniaturaPlay} />
              ) : null}
            </Pressable>
          ))}
        </ScrollView>
      )}

      <Text style={[type.section, { color: colors.text, marginTop: 24, marginBottom: 10 }]}>
        Quiénes se sumaron
      </Text>
      <View style={styles.participantes}>
        {participantes.map((p) => (
          <Pressable
            key={p.userId}
            style={styles.participante}
            onPress={() => p.username && router.push(`/(app)/usuario/${p.username}`)}
          >
            {p.avatarPath ? (
              <Image
                source={{ uri: rhMediaUrl(p.avatarPath) }}
                style={styles.participanteAvatar}
                contentFit="cover"
                transition={160}
              />
            ) : (
              <View style={[styles.participanteAvatar, styles.avatarVacio, { backgroundColor: colors.accentSoft }]}>
                <Ionicons name="person" size={18} color={colors.accent} />
              </View>
            )}
            <Text style={[type.caption, { color: colors.textMuted }]} numberOfLines={1}>
              {p.nombreCompleto.split(' ')[0]}
            </Text>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  contenedor: { padding: 16, paddingBottom: 40, flexGrow: 1 },
  hero: {
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: 20,
    marginBottom: 24,
  },
  icono: { width: 56, height: 56, borderRadius: radii.pill, alignItems: 'center', justifyContent: 'center' },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignSelf: 'stretch',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: 12,
    marginVertical: 8,
  },
  stat: { alignItems: 'center', gap: 2 },
  hilo: { gap: 10, paddingRight: 16 },
  miniatura: { width: 110, height: 180, borderRadius: radii.md, overflow: 'hidden' },
  miniaturaFoto: { width: '100%', height: '100%' },
  miniaturaOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  miniaturaPos: { color: '#fff', fontWeight: '700' },
  miniaturaAutor: { color: 'rgba(255,255,255,0.85)' },
  miniaturaPlay: { position: 'absolute', top: 8, right: 8 },
  participantes: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  participante: { alignItems: 'center', gap: 4, width: 64 },
  participanteAvatar: { width: 48, height: 48, borderRadius: radii.pill },
  avatarVacio: { alignItems: 'center', justifyContent: 'center' },
});
