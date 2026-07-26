import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dimensions,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { mascotasApi } from '../api/mascotasApi';
import { publicacionesApi } from '../api/publicacionesApi';
import { usuariosApi } from '../api/usuariosApi';
import { useSeguirToggle } from '../hooks/useSeguirToggle';
import { Mascota, PerfilPublico, Post } from '../types';
import { elevation, radii } from '../theme/elevation';
import { centeredContent, MAX_CONTENT_WIDTH } from '../theme/layout';
import { type } from '../theme/typography';
import { useTheme } from '../theme/ThemeProvider';
import { rhMediaUrl } from '../utils/media';
import { hapticLeve } from '../utils/haptics';
import { AppButton } from './AppButton';
import { DenunciaButtonStub } from './DenunciaButtonStub';
import { EmptyState } from './ui/EmptyState';
import { Skeleton } from './ui/Skeleton';

interface PerfilBodyProps {
  username?: string;
  userId?: number;
}

type Pestania = 'publicaciones' | 'mascotas';

/** Grilla de 3 columnas a lo Instagram, con 2px de separación. */
const SEPARACION = 2;
const ancho = Math.min(Dimensions.get('window').width, MAX_CONTENT_WIDTH);
const LADO_CELDA = (ancho - SEPARACION * 2) / 3;

export function PerfilBody({ username, userId }: PerfilBodyProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const [perfil, setPerfil] = useState<PerfilPublico | null>(null);
  const [mascotas, setMascotas] = useState<Mascota[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refrescando, setRefrescando] = useState(false);
  const [pestania, setPestania] = useState<Pestania>('publicaciones');

  const { siguiendo, busy: siguiendoBusy, toggle: onToggleSeguir } = useSeguirToggle(
    perfil?.userId ?? 0,
    perfil?.siguiendoYo ?? false,
    (nuevoSiguiendo) => {
      setPerfil((prev) =>
        prev ? { ...prev, totalSeguidores: prev.totalSeguidores + (nuevoSiguiendo ? 1 : -1) } : prev
      );
    }
  );

  const cargar = useCallback(
    async (activo: () => boolean) => {
      const resPerfil = username
        ? await usuariosApi.perfilPorUsername(username)
        : await usuariosApi.perfilPorId(userId!);
      if (!activo()) return;

      if (resPerfil.success && resPerfil.data) {
        setPerfil(resPerfil.data);
        const [resMascotas, resPosts] = await Promise.all([
          mascotasApi.listarUsuario(resPerfil.data.userId),
          publicacionesApi.listarUsuario(resPerfil.data.userId),
        ]);
        if (activo() && resMascotas.success && resMascotas.data) {
          setMascotas(resMascotas.data.mascotas);
        }
        if (activo() && resPosts.success && resPosts.data) {
          setPosts(resPosts.data.posts);
        }
      }
    },
    [username, userId]
  );

  useFocusEffect(
    useCallback(() => {
      let vivo = true;
      setLoading(true);
      cargar(() => vivo).finally(() => {
        if (vivo) setLoading(false);
      });
      return () => {
        vivo = false;
      };
    }, [cargar])
  );

  const onRefrescar = async () => {
    setRefrescando(true);
    await cargar(() => true);
    setRefrescando(false);
  };

  if (loading || !perfil) {
    return (
      <View style={[styles.skeletonWrap, { backgroundColor: colors.background }]}>
        <Skeleton width={92} height={92} radius={radii.pill} style={{ alignSelf: 'center' }} />
        <Skeleton width={160} height={20} style={{ alignSelf: 'center', marginTop: 14 }} />
        <Skeleton width={100} height={14} style={{ alignSelf: 'center', marginTop: 8 }} />
        <View style={styles.skeletonGrid}>
          {Array.from({ length: 9 }).map((_, i) => (
            <Skeleton key={i} width={LADO_CELDA} height={LADO_CELDA} radius={0} />
          ))}
        </View>
      </View>
    );
  }

  const items = pestania === 'publicaciones' ? posts : mascotas;

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[styles.container, centeredContent]}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refrescando} onRefresh={onRefrescar} tintColor={colors.primary} />
      }
    >
      <Animated.View entering={FadeInDown.springify().damping(18)} style={styles.header}>
        {perfil.avatarPath ? (
          <Image
            source={{ uri: rhMediaUrl(perfil.avatarPath) }}
            style={[styles.avatar, { borderColor: colors.surface }]}
            contentFit="cover"
            transition={280}
          />
        ) : (
          <View
            style={[
              styles.avatar,
              styles.avatarPlaceholder,
              { backgroundColor: colors.accentSoft, borderColor: colors.surface },
            ]}
          >
            <Ionicons name="person" size={40} color={colors.accent} />
          </View>
        )}

        <Text style={[type.titleSm, { color: colors.text, marginTop: 12 }]}>{perfil.nombreCompleto}</Text>
        <Text style={[type.bodySm, { color: colors.textMuted }]}>@{perfil.username}</Text>

        {perfil.zonaDescripcion ? (
          <View style={styles.zona}>
            <Ionicons name="location-outline" size={13} color={colors.textMuted} />
            <Text style={[type.caption, { color: colors.textMuted }]}>{perfil.zonaDescripcion}</Text>
          </View>
        ) : null}
      </Animated.View>

      {/* Stats en fila, tocables — el patrón que cualquiera que use Instagram
          reconoce sin leer nada. */}
      <View style={[styles.statsRow, { borderColor: colors.border }]}>
        <View style={styles.stat}>
          <Text style={[type.titleSm, { color: colors.text }]}>{posts.length}</Text>
          <Text style={[type.caption, { color: colors.textMuted }]}>{t('perfil.postsPlaceholderTitle')}</Text>
        </View>
        <Pressable
          style={styles.stat}
          onPress={() => router.push(`/(app)/usuario/${perfil.username}/seguidores`)}
        >
          <Text style={[type.titleSm, { color: colors.text }]}>{perfil.totalSeguidores}</Text>
          <Text style={[type.caption, { color: colors.textMuted }]}>{t('perfil.followers')}</Text>
        </Pressable>
        <Pressable
          style={styles.stat}
          onPress={() => router.push(`/(app)/usuario/${perfil.username}/seguidos`)}
        >
          <Text style={[type.titleSm, { color: colors.text }]}>{perfil.totalSeguidos}</Text>
          <Text style={[type.caption, { color: colors.textMuted }]}>{t('perfil.following')}</Text>
        </Pressable>
      </View>

      {!perfil.esUnoMismo ? (
        <View style={styles.actionsRow}>
          <AppButton
            label={siguiendo ? t('perfil.unfollowButton') : t('perfil.followButton')}
            variant={siguiendo ? 'secondary' : 'primary'}
            onPress={onToggleSeguir}
            loading={siguiendoBusy}
            style={{ flex: 1 }}
          />
          {perfil.whatsappNumero ? (
            <Pressable
              onPress={() =>
                Linking.openURL(`https://wa.me/${perfil.whatsappNumero!.replace(/\D/g, '')}`)
              }
              style={[styles.iconButton, elevation.sm, { backgroundColor: colors.surface, borderColor: colors.border }]}
            >
              <Ionicons name="logo-whatsapp" size={20} color={colors.success} />
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {!perfil.esUnoMismo ? (
        <View style={styles.denuncia}>
          <DenunciaButtonStub userId={perfil.userId} />
        </View>
      ) : null}

      {/* Pestañas de la grilla */}
      <View style={[styles.tabs, { borderColor: colors.border }]}>
        {(['publicaciones', 'mascotas'] as Pestania[]).map((p) => {
          const activa = pestania === p;
          return (
            <Pressable
              key={p}
              style={[styles.tab, activa ? { borderBottomColor: colors.primary } : null]}
              onPress={() => {
                hapticLeve();
                setPestania(p);
              }}
            >
              <Ionicons
                name={p === 'publicaciones' ? 'grid-outline' : 'paw-outline'}
                size={20}
                color={activa ? colors.primary : colors.textMuted}
              />
            </Pressable>
          );
        })}
      </View>

      {items.length === 0 ? (
        <EmptyState
          icon={pestania === 'publicaciones' ? 'images-outline' : 'paw-outline'}
          titulo={pestania === 'publicaciones' ? t('feed.emptyFeed') : t('mascotas.emptyState')}
        />
      ) : (
        <Animated.View entering={FadeIn.duration(240)} style={styles.grid}>
          {pestania === 'publicaciones'
            ? posts.map((p) => (
                <Pressable
                  key={p.postId}
                  style={styles.celda}
                  onPress={() => router.push(`/(app)/publicaciones/${p.postId}`)}
                >
                  {p.fotos[0] ? (
                    <Image
                      source={{ uri: rhMediaUrl(p.fotos[0].path) }}
                      style={styles.celdaFoto}
                      contentFit="cover"
                      transition={200}
                    />
                  ) : (
                    <View style={[styles.celdaFoto, styles.celdaTexto, { backgroundColor: colors.backgroundAlt }]}>
                      <Text style={[type.caption, { color: colors.text }]} numberOfLines={5}>
                        {p.texto}
                      </Text>
                    </View>
                  )}
                  {p.fotos.length > 1 ? (
                    <View style={styles.celdaBadge}>
                      <Ionicons name="copy" size={13} color="#fff" />
                    </View>
                  ) : null}
                  {p.videoPath ? (
                    <View style={styles.celdaBadge}>
                      <Ionicons name="play" size={13} color="#fff" />
                    </View>
                  ) : null}
                </Pressable>
              ))
            : mascotas.map((m) => (
                <Pressable
                  key={m.mascotaId}
                  style={styles.celda}
                  onPress={() => router.push(`/(app)/mascota/${m.mascotaId}`)}
                >
                  {m.fotos && m.fotos[0] ? (
                    <Image
                      source={{ uri: rhMediaUrl(m.fotos[0].path) }}
                      style={styles.celdaFoto}
                      contentFit="cover"
                      transition={200}
                    />
                  ) : (
                    <View style={[styles.celdaFoto, styles.celdaTexto, { backgroundColor: colors.accentSoft }]}>
                      <Ionicons name="paw" size={26} color={colors.accent} />
                    </View>
                  )}
                  <View style={styles.celdaNombre}>
                    <Text style={[type.caption, { color: '#fff' }]} numberOfLines={1}>
                      {m.nombre}
                    </Text>
                  </View>
                </Pressable>
              ))}
        </Animated.View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  skeletonWrap: { flex: 1, paddingTop: 40 },
  skeletonGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SEPARACION, marginTop: 28 },
  container: { flexGrow: 1, paddingBottom: 32 },
  header: { alignItems: 'center', paddingTop: 32, paddingHorizontal: 24 },
  avatar: { width: 92, height: 92, borderRadius: radii.pill, borderWidth: 3 },
  avatarPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  zona: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginTop: 20,
    paddingVertical: 14,
  },
  stat: { alignItems: 'center', gap: 2, minWidth: 80 },
  actionsRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 16, paddingBottom: 4 },
  iconButton: {
    width: 52,
    height: 52,
    borderRadius: radii.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  denuncia: { alignItems: 'center', paddingBottom: 8 },
  tabs: { flexDirection: 'row', borderTopWidth: StyleSheet.hairlineWidth, marginTop: 8 },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: SEPARACION },
  celda: { width: LADO_CELDA, height: LADO_CELDA },
  celdaFoto: { width: '100%', height: '100%' },
  celdaTexto: { alignItems: 'center', justifyContent: 'center', padding: 8 },
  celdaBadge: { position: 'absolute', top: 6, right: 6 },
  celdaNombre: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
});
