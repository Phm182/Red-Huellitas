import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Dimensions, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { usePostActions } from '../hooks/usePostActions';
import { Post } from '../types';
import { elevation, radii } from '../theme/elevation';
import { fonts, type } from '../theme/typography';
import { useTheme } from '../theme/ThemeProvider';
import { rhMediaUrl } from '../utils/media';
import { hapticMedio } from '../utils/haptics';
import { DenunciaButtonStub } from './DenunciaButtonStub';
import { LogoSiluetaNegra } from './LogoImage';
import { MediaLightbox } from './MediaLightbox';
import { ReactionsBar } from './ReactionsBar';

interface PostCardProps {
  post: Post;
  onEliminado?: (postId: number) => void;
  index?: number;
}

const MEDIA_W = Math.min(Dimensions.get('window').width - 32, 448);
const DOBLE_TAP_MS = 280;

export function PostCard({ post, onEliminado, index = 0 }: PostCardProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const {
    miReaccion,
    conteos,
    reaccionBusy,
    onReaccionar,
    siguiendo,
    siguiendoBusy,
    onToggleSeguir,
    esDueno,
    onCompartir,
    onEliminar,
  } = usePostActions(post, onEliminado);

  const corazonEscala = useSharedValue(0);
  const corazonOpacidad = useSharedValue(0);
  const ultimoTap = useRef(0);
  const tapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [lightbox, setLightbox] = useState<{ uris: string[]; index: number } | null>(null);

  const corazonStyle = useAnimatedStyle(() => ({
    opacity: corazonOpacidad.value,
    transform: [{ scale: corazonEscala.value }],
  }));

  const mostrarCorazon = () => {
    corazonOpacidad.value = withSequence(
      withTiming(1, { duration: 90 }),
      withTiming(1, { duration: 380 }),
      withTiming(0, { duration: 220 })
    );
    corazonEscala.value = withSequence(
      withSpring(1.15, { damping: 9, stiffness: 220 }),
      withSpring(0.95, { damping: 12 }),
      withTiming(0, { duration: 220 })
    );
  };

  const onTapFoto = (fotoIndex: number) => {
    const ahora = Date.now();
    const uris = post.fotos.map((f) => rhMediaUrl(f.path));

    if (ahora - ultimoTap.current < DOBLE_TAP_MS) {
      ultimoTap.current = 0;
      if (tapTimer.current) {
        clearTimeout(tapTimer.current);
        tapTimer.current = null;
      }
      mostrarCorazon();
      hapticMedio();
      if (miReaccion !== 'like' && !reaccionBusy) {
        onReaccionar('like');
      }
      return;
    }

    ultimoTap.current = ahora;
    if (tapTimer.current) clearTimeout(tapTimer.current);
    tapTimer.current = setTimeout(() => {
      tapTimer.current = null;
      setLightbox({ uris, index: fotoIndex });
    }, DOBLE_TAP_MS);
  };

  return (
    <Animated.View
      entering={FadeInDown.delay(Math.min(index, 6) * 45).springify().damping(18)}
      style={[
        styles.card,
        elevation.sm,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      <View style={styles.header}>
        <Pressable
          style={styles.autorRow}
          onPress={() => post.autor && router.push(`/(app)/usuario/${post.autor.username}`)}
        >
          {post.autor?.avatarPath ? (
            <Image source={{ uri: rhMediaUrl(post.autor.avatarPath) }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder, { backgroundColor: colors.backgroundAlt }]}>
              <LogoSiluetaNegra style={{ width: 16, height: 16 }} />
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={[styles.autorName, { color: colors.text }]} numberOfLines={1}>
              {post.autor?.nombreCompleto}
            </Text>
            <Text style={[styles.autorUser, { color: colors.textMuted }]} numberOfLines={1}>
              @{post.autor?.username}
            </Text>
          </View>
        </Pressable>

        {!esDueno && post.autor ? (
          <Pressable
            style={[
              styles.followBadge,
              {
                borderColor: colors.primary,
                backgroundColor: siguiendo ? colors.primarySoft : colors.primary,
              },
            ]}
            onPress={onToggleSeguir}
            disabled={siguiendoBusy}
            hitSlop={6}
          >
            <Text
              style={{
                color: siguiendo ? colors.primary : colors.primaryText,
                fontFamily: fonts.bodySemi,
                fontSize: 12,
              }}
            >
              {siguiendo ? t('feed.siguiendo') : t('feed.seguir')}
            </Text>
          </Pressable>
        ) : null}
      </View>

      {post.origen === 'recomendado' ? (
        <View style={[styles.reco, { backgroundColor: colors.accentSoft }]}>
          <Ionicons name="sparkles" size={12} color={colors.accent} />
          <Text style={{ color: colors.accent, fontFamily: fonts.bodySemi, fontSize: 11 }}>
            {t('feed.origenRecomendado')}
          </Text>
        </View>
      ) : null}

      {post.texto ? (
        <Text style={[styles.texto, { color: colors.text }]}>{post.texto}</Text>
      ) : null}

      {post.fotos.length > 0 ? (
        <FlatList
          horizontal
          data={post.fotos}
          keyExtractor={(f) => String(f.postFotoId)}
          renderItem={({ item, index: fotoIndex }) => (
            <Pressable style={styles.fotoWrap} onPress={() => onTapFoto(fotoIndex)}>
              <Image
                source={{ uri: rhMediaUrl(item.path) }}
                style={styles.foto}
                contentFit="cover"
                transition={240}
              />
              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.18)']}
                style={StyleSheet.absoluteFill}
                pointerEvents="none"
              />
              <Animated.View style={[styles.corazon, corazonStyle]} pointerEvents="none">
                <Ionicons name="heart" size={86} color="#fff" />
              </Animated.View>
            </Pressable>
          )}
          showsHorizontalScrollIndicator={false}
          style={{ marginTop: 8 }}
        />
      ) : null}

      <View style={styles.actions}>
        <ReactionsBar
          miReaccion={miReaccion}
          conteos={conteos}
          busy={reaccionBusy}
          onReaccionar={onReaccionar}
        />
        <Pressable style={styles.actionButton} onPress={onCompartir}>
          <Ionicons name="paper-plane-outline" size={21} color={colors.textMuted} />
        </Pressable>
        <View style={{ flex: 1 }} />
        {esDueno ? (
          <Pressable onPress={onEliminar}>
            <Text style={{ color: colors.danger, fontFamily: fonts.bodySemi, fontSize: 12 }}>
              {t('feed.deleteButton')}
            </Text>
          </Pressable>
        ) : post.autor ? (
          <DenunciaButtonStub userId={post.autor.userId} postId={post.postId} />
        ) : null}
      </View>

      <MediaLightbox
        visible={lightbox != null}
        uris={lightbox?.uris ?? []}
        initialIndex={lightbox?.index ?? 0}
        onClose={() => setLightbox(null)}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: 14,
    marginBottom: 14,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    gap: 8,
  },
  autorRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  avatar: { width: 40, height: 40, borderRadius: 20 },
  avatarPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  autorName: { fontFamily: fonts.bodyBold, fontSize: 15 },
  autorUser: { ...type.caption },
  followBadge: {
    borderWidth: 1,
    borderRadius: radii.pill,
    paddingVertical: 6,
    paddingHorizontal: 12,
    flexShrink: 0,
  },
  reco: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: radii.pill,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginBottom: 8,
  },
  texto: { ...type.body, marginBottom: 2 },
  fotoWrap: {
    width: MEDIA_W * 0.82,
    height: MEDIA_W * 0.72,
    borderRadius: radii.md,
    overflow: 'hidden',
    marginRight: 10,
  },
  foto: { width: '100%', height: '100%' },
  corazon: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 4,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
});
