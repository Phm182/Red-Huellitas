import { router } from 'expo-router';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { usePostActions } from '../hooks/usePostActions';
import { Post } from '../types';
import { useTheme } from '../theme/ThemeProvider';
import { rhMediaUrl } from '../utils/media';
import { DenunciaButtonStub } from './DenunciaButtonStub';
import { LogoSiluetaNegra } from './LogoImage';

interface PostCardProps {
  post: Post;
  onEliminado?: (postId: number) => void;
}

export function PostCard({ post, onEliminado }: PostCardProps) {
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
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.header}>
        <Pressable
          style={styles.autorRow}
          onPress={() => post.autor && router.push(`/(app)/usuario/${post.autor.username}`)}
        >
          {post.autor?.avatarPath ? (
            <Image source={{ uri: rhMediaUrl(post.autor.avatarPath) }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder, { backgroundColor: colors.background }]}>
              <LogoSiluetaNegra style={{ width: 16, height: 16 }} />
            </View>
          )}
          <View>
            <Text style={{ color: colors.text, fontWeight: '600' }}>{post.autor?.nombreCompleto}</Text>
            <Text style={{ color: colors.textMuted, fontSize: 12 }}>@{post.autor?.username}</Text>
          </View>
        </Pressable>

        {!esDueno && post.autor ? (
          <Pressable
            style={[styles.followBadge, { borderColor: colors.primary, backgroundColor: siguiendo ? 'transparent' : colors.primary }]}
            onPress={onToggleSeguir}
            disabled={siguiendoBusy}
          >
            <Text style={{ color: siguiendo ? colors.primary : colors.primaryText, fontSize: 12, fontWeight: '600' }}>
              {siguiendo ? t('feed.siguiendo') : t('feed.seguir')}
            </Text>
          </Pressable>
        ) : null}
      </View>

      {post.origen === 'recomendado' ? (
        <Text style={{ color: colors.textMuted, fontSize: 11, marginBottom: 6 }}>{t('feed.origenRecomendado')}</Text>
      ) : null}

      {post.texto ? <Text style={{ color: colors.text, marginBottom: post.fotos.length ? 10 : 0 }}>{post.texto}</Text> : null}

      {post.fotos.length > 0 ? (
        <FlatList
          horizontal
          data={post.fotos}
          keyExtractor={(f) => String(f.postFotoId)}
          renderItem={({ item }) => <Image source={{ uri: rhMediaUrl(item.path) }} style={styles.foto} />}
          showsHorizontalScrollIndicator={false}
        />
      ) : null}

      <View style={[styles.actions, { borderColor: colors.border }]}>
        <Pressable
          style={styles.actionButton}
          onPress={() => onReaccionar('like')}
          disabled={reaccionBusy}
        >
          <Text style={{ color: miReaccion === 'like' ? colors.primary : colors.textMuted, fontWeight: '600' }}>
            👍 {t('feed.like')} {conteos.like > 0 ? conteos.like : ''}
          </Text>
        </Pressable>
        <Pressable
          style={styles.actionButton}
          onPress={() => onReaccionar('me_divierte')}
          disabled={reaccionBusy}
        >
          <Text style={{ color: miReaccion === 'me_divierte' ? colors.primary : colors.textMuted, fontWeight: '600' }}>
            😄 {t('feed.meDivierte')} {conteos.meDivierte > 0 ? conteos.meDivierte : ''}
          </Text>
        </Pressable>
        <Pressable style={styles.actionButton} onPress={onCompartir}>
          <Text style={{ color: colors.textMuted, fontWeight: '600' }}>↗ {t('feed.share')}</Text>
        </Pressable>
      </View>

      <View style={styles.footer}>
        {esDueno ? (
          <Pressable onPress={onEliminar}>
            <Text style={{ color: colors.danger, fontSize: 12 }}>{t('feed.deleteButton')}</Text>
          </Pressable>
        ) : post.autor ? (
          <DenunciaButtonStub userId={post.autor.userId} postId={post.postId} />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 12 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  autorRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  avatar: { width: 36, height: 36, borderRadius: 18 },
  avatarPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  followBadge: { borderWidth: 1, borderRadius: 14, paddingVertical: 5, paddingHorizontal: 12 },
  foto: { width: 220, height: 200, borderRadius: 10, marginRight: 8, marginTop: 4 },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    marginTop: 12,
    paddingTop: 10,
  },
  actionButton: { paddingVertical: 4, paddingHorizontal: 6 },
  footer: { marginTop: 8, alignItems: 'flex-end' },
});
