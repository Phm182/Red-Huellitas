import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Dimensions, FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { usePostActions } from '../hooks/usePostActions';
import { Post } from '../types';
import { elevation, radii } from '../theme/elevation';
import { fonts, type } from '../theme/typography';
import { useTheme } from '../theme/ThemeProvider';
import { rhMediaUrl } from '../utils/media';
import { DenunciaButtonStub } from './DenunciaButtonStub';
import { LogoSiluetaNegra } from './LogoImage';

interface PostCardProps {
  post: Post;
  onEliminado?: (postId: number) => void;
  index?: number;
}

const MEDIA_W = Math.min(Dimensions.get('window').width - 32, 448);

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
                backgroundColor: siguiendo ? 'transparent' : colors.primary,
              },
            ]}
            onPress={onToggleSeguir}
            disabled={siguiendoBusy}
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
          renderItem={({ item }) => (
            <View style={styles.fotoWrap}>
              <Image source={{ uri: rhMediaUrl(item.path) }} style={styles.foto} />
              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.18)']}
                style={StyleSheet.absoluteFill}
                pointerEvents="none"
              />
            </View>
          )}
          showsHorizontalScrollIndicator={false}
          style={{ marginTop: 8 }}
        />
      ) : null}

      <View style={styles.actions}>
        <Pressable style={styles.actionButton} onPress={() => onReaccionar('like')} disabled={reaccionBusy}>
          <Ionicons
            name={miReaccion === 'like' ? 'heart' : 'heart-outline'}
            size={22}
            color={miReaccion === 'like' ? colors.primary : colors.textMuted}
          />
          {conteos.like > 0 ? (
            <Text style={[styles.actionCount, { color: colors.textMuted }]}>{conteos.like}</Text>
          ) : null}
        </Pressable>
        <Pressable
          style={styles.actionButton}
          onPress={() => onReaccionar('me_divierte')}
          disabled={reaccionBusy}
        >
          <Ionicons
            name={miReaccion === 'me_divierte' ? 'happy' : 'happy-outline'}
            size={22}
            color={miReaccion === 'me_divierte' ? colors.accent : colors.textMuted}
          />
          {conteos.meDivierte > 0 ? (
            <Text style={[styles.actionCount, { color: colors.textMuted }]}>{conteos.meDivierte}</Text>
          ) : null}
        </Pressable>
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
  actionCount: { fontFamily: fonts.bodySemi, fontSize: 13 },
});
