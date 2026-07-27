import { Ionicons } from '@expo/vector-icons';
import { Image as ExpoImage } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Linking,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { mascotasApi } from '../api/mascotasApi';
import { perfilApi } from '../api/perfilApi';
import { publicacionesApi } from '../api/publicacionesApi';
import { usuariosApi } from '../api/usuariosApi';
import { useAuth } from '../auth/AuthProvider';
import { useSeguirToggle } from '../hooks/useSeguirToggle';
import { Mascota, PerfilPublico, Post } from '../types';
import { elevation, radii } from '../theme/elevation';
import { centeredContent, MAX_CONTENT_WIDTH } from '../theme/layout';
import { type } from '../theme/typography';
import { useTheme } from '../theme/ThemeProvider';
import { setAvatarDisplay, useAvatarDisplay, clearAvatarDisplay } from '../utils/avatarDisplayStore';
import { saveAvatarCache } from '../utils/avatarCache';
import { comprimirImagen } from '../utils/imagen';
import { apiBaseUrl } from '../api/client';
import { makeDurableImageUri, rhAvatarUrl, rhMediaUrl } from '../utils/media';
import { hapticExito, hapticLeve } from '../utils/haptics';
import { AppButton } from './AppButton';
import { AppMessageModal } from './AppMessageModal';
import { DenunciaButtonStub } from './DenunciaButtonStub';
import { EmptyState } from './ui/EmptyState';
import { HuePlusBadge } from './HuePlusBadge';
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
  const { user, actualizarUsuario, avatarBust, setAvatarPreviewUri } = useAuth();
  const avatarDisplay = useAvatarDisplay();

  const [perfil, setPerfil] = useState<PerfilPublico | null>(null);
  const [mascotas, setMascotas] = useState<Mascota[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refrescando, setRefrescando] = useState(false);
  const [pestania, setPestania] = useState<Pestania>('publicaciones');
  const [avatarAbierto, setAvatarAbierto] = useState(false);
  const [subiendoAvatar, setSubiendoAvatar] = useState(false);
  const [mensajeAvatar, setMensajeAvatar] = useState<{ titulo: string; cuerpo: string } | null>(null);

  const perfilCargadoRef = useRef(false);
  /** Al volver del picker, useFocusEffect no debe recargar ni mostrar skeleton. */
  const omitirProximoFocusRef = useRef(false);
  const subiendoAvatarRef = useRef(false);
  /** Path de avatar recién subido: impide que un GET en carrera restaure el anterior. */
  const avatarLockPathRef = useRef<string | null>(null);
  const avatarPreviewRef = useRef<string | null>(null);
  avatarPreviewRef.current = avatarDisplay.uri;

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
        setPerfil((prev) => {
          const next = resPerfil.data!;
          const locked = avatarLockPathRef.current;
          if (locked) {
            return {
              ...next,
              avatarPath: locked,
              avatarBust: prev?.avatarBust ?? next.avatarBust,
            };
          }
          if (avatarPreviewRef.current && prev?.avatarPath) {
            return {
              ...next,
              avatarPath: prev.avatarPath,
              avatarBust: prev.avatarBust ?? next.avatarBust,
            };
          }
          return next;
        });
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
      // Tras la primera carga, NUNCA recargar por focus: al cerrar el picker /
      // modal el focus disparaba un GET que devolvía la URL cacheada del CDN
      // y la foto nueva “volvía atrás” a los pocos segundos.
      if (perfilCargadoRef.current || omitirProximoFocusRef.current || subiendoAvatarRef.current) {
        return;
      }

      let vivo = true;
      setLoading(true);

      cargar(() => vivo)
        .then(() => {
          if (vivo) perfilCargadoRef.current = true;
        })
        .finally(() => {
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

  const aplicarAvatar = (avatarPath: string, previewUri: string, bust?: number | null) => {
    const b = bust && bust > 0 ? bust : Date.now();
    const uid = user?.userId ?? perfil?.userId;
    setPerfil((prev) => (prev ? { ...prev, avatarPath, avatarBust: b } : prev));
    setAvatarDisplay(previewUri, avatarPath);
    setAvatarPreviewUri(previewUri);
    avatarLockPathRef.current = avatarPath;
    if (uid != null) {
      void saveAvatarCache({
        userId: uid,
        path: avatarPath,
        bust: b,
        dataUri: previewUri,
      });
    }
    if (user && (user.userId === uid || perfil?.esUnoMismo)) {
      actualizarUsuario({ ...user, avatarPath, avatarBust: b });
    }
  };

  const pathDesdeRespuestaAvatar = (data: {
    avatarPath?: string | null;
    avatarUrl?: string | null;
  } | null | undefined): string | null => {
    if (data?.avatarPath) {
      return data.avatarPath.replace(/^\/+/, '').replace(/^uploads\//, '');
    }
    const url = data?.avatarUrl ?? '';
    const match = url.match(/avatares\/[^/?#]+/i);
    if (match) {
      return match[0];
    }
    return perfil?.avatarPath ?? user?.avatarPath ?? (user ? `avatares/${user.userId}.jpg` : null);
  };

  const subirDesdeUri = async (uri: string) => {
    setSubiendoAvatar(true);
    subiendoAvatarRef.current = true;
    omitirProximoFocusRef.current = true;
    const prevUri = avatarDisplay.uri;
    const prevPath = avatarDisplay.path;
    try {
      const comprimida = await comprimirImagen(uri);
      const durable = await makeDurableImageUri(comprimida);
      // Preview inmediata; si el POST falla, se revierte abajo.
      setAvatarDisplay(durable);
      setAvatarPreviewUri(durable);

      // Web: data-URI→Blob. Nativo: file URI del manipulator.
      const paraSubir = Platform.OS === 'web' ? durable : comprimida;
      let res = await perfilApi.subirAvatar(paraSubir);
      if (!res.success && Platform.OS === 'web' && paraSubir !== comprimida) {
        res = await perfilApi.subirAvatar(comprimida);
      }

      // En test/prod viejo el PHP solo manda avatarUrl (sin avatarPath).
      // Antes exigíamos avatarPath y revertíamos un upload que SÍ había guardado.
      const path = pathDesdeRespuestaAvatar(res.data);
      if (res.success && path) {
        aplicarAvatar(path, durable, res.data?.avatarBust ?? Date.now());
        hapticExito();
        setAvatarAbierto(false);
        setMensajeAvatar({
          titulo: t('perfil.myProfile'),
          cuerpo: t('perfil.photoUpdated'),
        });
      } else if (res.success) {
        // Guardó pero no pudimos resolver path: igual mantenemos la preview.
        setAvatarDisplay(durable);
        setAvatarPreviewUri(durable);
        if (user) {
          void saveAvatarCache({
            userId: user.userId,
            path: user.avatarPath || `avatares/${user.userId}.jpg`,
            bust: Date.now(),
            dataUri: durable,
          });
        }
        hapticExito();
        setAvatarAbierto(false);
        setMensajeAvatar({
          titulo: t('perfil.myProfile'),
          cuerpo: t('perfil.photoUpdated'),
        });
      } else {
        if (prevUri) {
          setAvatarDisplay(prevUri, prevPath);
          setAvatarPreviewUri(prevUri);
        } else {
          clearAvatarDisplay();
          setAvatarPreviewUri(null);
        }
        const host = apiBaseUrl().replace(/^https?:\/\//, '').slice(0, 48);
        setMensajeAvatar({
          titulo: t('perfil.myProfile'),
          cuerpo: `${res.message || t('perfil.photoUpdateError')} (${host})`,
        });
      }
    } catch (e) {
      if (prevUri) {
        setAvatarDisplay(prevUri, prevPath);
        setAvatarPreviewUri(prevUri);
      } else {
        clearAvatarDisplay();
        setAvatarPreviewUri(null);
      }
      setMensajeAvatar({
        titulo: t('perfil.myProfile'),
        cuerpo: e instanceof Error ? e.message : t('perfil.photoUpdateError'),
      });
    } finally {
      setSubiendoAvatar(false);
      subiendoAvatarRef.current = false;
      omitirProximoFocusRef.current = false;
    }
  };

  const elegirDeGaleria = async () => {
    hapticLeve();
    omitirProximoFocusRef.current = true;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: Platform.OS !== 'web',
      aspect: [1, 1],
      quality: 0.85,
    });
    if (!result.canceled && result.assets[0]?.uri) {
      await subirDesdeUri(result.assets[0].uri);
    } else {
      omitirProximoFocusRef.current = false;
    }
  };

  const tomarFoto = async () => {
    hapticLeve();
    omitirProximoFocusRef.current = true;
    const permiso = await ImagePicker.requestCameraPermissionsAsync();
    if (!permiso.granted) {
      omitirProximoFocusRef.current = false;
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    if (!result.canceled && result.assets[0]?.uri) {
      await subirDesdeUri(result.assets[0].uri);
    } else {
      omitirProximoFocusRef.current = false;
    }
  };

  const pedirFuenteFoto = () => {
    const abrirPicker = () => {
      if (Platform.OS === 'web') {
        void elegirDeGaleria();
        return;
      }
      Alert.alert(t('perfil.changePhoto'), undefined, [
        { text: t('perfil.takePhoto'), onPress: () => void tomarFoto() },
        { text: t('perfil.chooseFromGallery'), onPress: () => void elegirDeGaleria() },
        { text: t('common.cancel'), style: 'cancel' },
      ]);
    };

    // Si el visor sigue abierto, el file picker (sobre todo en web) no aplica el cambio.
    if (avatarAbierto) {
      omitirProximoFocusRef.current = true;
      setAvatarAbierto(false);
      setTimeout(abrirPicker, Platform.OS === 'web' ? 180 : 60);
      return;
    }
    abrirPicker();
  };

  const onPressAvatar = () => {
    if (!perfil) return;
    hapticLeve();
    if (perfil.esUnoMismo) {
      if (!perfil.avatarPath && !avatarDisplay.uri) {
        pedirFuenteFoto();
      } else {
        setAvatarAbierto(true);
      }
      return;
    }
    if (perfil.avatarPath) {
      setAvatarAbierto(true);
    }
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
  const esPropio = Boolean(perfil.esUnoMismo || (user && user.userId === perfil.userId));
  const bust = esPropio ? (perfil.avatarBust ?? avatarBust) : (perfil.avatarBust ?? 0);
  const avatarUri =
    esPropio && avatarDisplay.uri
      ? avatarDisplay.uri
      : perfil.avatarPath
        ? rhAvatarUrl(perfil.avatarPath, bust)
        : null;

  return (
    <>
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[styles.container, centeredContent]}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refrescando} onRefresh={onRefrescar} tintColor={colors.primary} />
      }
    >
      <Animated.View entering={FadeInDown.springify().damping(18)} style={styles.header}>
        <Pressable
          onPress={onPressAvatar}
          disabled={subiendoAvatar}
          accessibilityRole="button"
          accessibilityLabel={
            perfil.esUnoMismo
              ? perfil.avatarPath
                ? t('perfil.changePhoto')
                : t('perfil.addPhoto')
              : t('perfil.myProfile')
          }
          style={styles.avatarPress}
        >
          {avatarUri ? (
            <Image
              key={`av-${avatarDisplay.version}-${bust}-${perfil.avatarPath ?? ''}`}
              source={{ uri: avatarUri }}
              style={[styles.avatar, { borderColor: colors.surface }]}
              resizeMode="cover"
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
          {perfil.esUnoMismo ? (
            <View style={[styles.avatarBadge, { backgroundColor: colors.primary }]}>
              {subiendoAvatar ? (
                <ActivityIndicator color={colors.primaryText} size="small" />
              ) : (
                <Ionicons name={perfil.avatarPath ? 'camera' : 'add'} size={14} color={colors.primaryText} />
              )}
            </View>
          ) : null}
        </Pressable>

        <View style={styles.nombreRow}>
          <Text style={[type.titleSm, { color: colors.text }]}>{perfil.nombreCompleto}</Text>
          <HuePlusBadge planCodigo={perfil.planCodigo ?? (esPropio ? user?.planCodigo : null)} size={15} />
        </View>
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
          fillScreen={false}
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
                    <ExpoImage
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
                    <ExpoImage
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

    <Modal
      visible={avatarAbierto}
      transparent
      animationType="fade"
      onRequestClose={() => setAvatarAbierto(false)}
    >
      <View style={styles.avatarModal}>
        <Pressable style={StyleSheet.absoluteFill} onPress={() => setAvatarAbierto(false)} />
        <View style={styles.avatarModalContent}>
          {avatarUri ? (
            <Image
              key={`big-${avatarDisplay.version}-${bust}-${perfil.avatarPath ?? ''}`}
              source={{ uri: avatarUri }}
              style={styles.avatarGrande}
              resizeMode="cover"
            />
          ) : null}
          {perfil.esUnoMismo ? (
            <AppButton
              label={t('perfil.changePhoto')}
              onPress={pedirFuenteFoto}
              loading={subiendoAvatar}
              style={{ marginTop: 16, alignSelf: 'stretch' }}
            />
          ) : null}
          <Pressable onPress={() => setAvatarAbierto(false)} style={styles.avatarCerrar}>
            <Text style={[type.label, { color: '#fff' }]}>{t('common.close')}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>

    <AppMessageModal
      visible={mensajeAvatar != null}
      title={mensajeAvatar?.titulo ?? ''}
      message={mensajeAvatar?.cuerpo ?? ''}
      confirmLabel={t('common.close')}
      onClose={() => setMensajeAvatar(null)}
    />
    </>
  );
}

const styles = StyleSheet.create({
  skeletonWrap: { flex: 1, paddingTop: 40 },
  skeletonGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SEPARACION, marginTop: 28 },
  container: { flexGrow: 1, paddingBottom: 32 },
  header: { alignItems: 'center', paddingTop: 32, paddingHorizontal: 24 },
  nombreRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 },
  avatarPress: { position: 'relative' },
  avatar: { width: 92, height: 92, borderRadius: radii.pill, borderWidth: 3 },
  avatarPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  avatarBadge: {
    position: 'absolute',
    right: 2,
    bottom: 2,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    ...elevation.sm,
  },
  avatarModal: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.88)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  avatarModalContent: { width: '100%', maxWidth: 360, alignItems: 'center' },
  avatarGrande: { width: 280, height: 280, borderRadius: 140 },
  avatarCerrar: { marginTop: 18, padding: 10 },
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
