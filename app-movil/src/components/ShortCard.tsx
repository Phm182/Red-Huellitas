import { useEventListener } from 'expo';
import { router } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Dimensions, Pressable, StyleSheet, Text, View } from 'react-native';
import { usePostActions } from '../hooks/usePostActions';
import { Post } from '../types';
import { rhMediaUrl } from '../utils/media';
import { DenunciaButtonStub } from './DenunciaButtonStub';

interface ShortCardProps {
  post: Post;
  onEliminado?: (postId: number) => void;
  /** Solo el Short visible en pantalla reproduce — los demás quedan pausados. */
  activo: boolean;
}

const { height: ALTURA_PANTALLA } = Dimensions.get('window');

export function ShortCard({ post, onEliminado, activo }: ShortCardProps) {
  const { t } = useTranslation();

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

  const player = useVideoPlayer(rhMediaUrl(post.videoPath ?? ''), (p) => {
    p.loop = true;
  });

  useEventListener(player, 'playToEnd', () => {
    player.currentTime = 0;
    player.play();
  });

  useEffect(() => {
    if (activo) {
      player.play();
    } else {
      player.pause();
    }
  }, [activo, player]);

  return (
    <View style={[styles.container, { height: ALTURA_PANTALLA }]}>
      <VideoView player={player} style={StyleSheet.absoluteFill} contentFit="cover" nativeControls={false} />

      <View style={styles.overlayBottom}>
        <Pressable onPress={() => post.autor && router.push(`/(app)/usuario/${post.autor.username}`)}>
          <Text style={styles.autor}>@{post.autor?.username}</Text>
        </Pressable>
        {post.texto ? (
          <Text style={styles.texto} numberOfLines={2}>
            {post.texto}
          </Text>
        ) : null}
      </View>

      <View style={styles.overlaySide}>
        {!esDueno && post.autor ? (
          <Pressable onPress={onToggleSeguir} disabled={siguiendoBusy} style={styles.sideButton}>
            <Text style={styles.sideIcon}>{siguiendo ? '✓' : t('feed.seguir')}</Text>
          </Pressable>
        ) : null}
        <Pressable onPress={() => onReaccionar('like')} disabled={reaccionBusy} style={styles.sideButton}>
          <Text style={[styles.sideIcon, miReaccion === 'like' ? styles.sideIconActive : null]}>👍</Text>
          {conteos.like > 0 ? <Text style={styles.sideCount}>{conteos.like}</Text> : null}
        </Pressable>
        <Pressable onPress={() => onReaccionar('me_divierte')} disabled={reaccionBusy} style={styles.sideButton}>
          <Text style={[styles.sideIcon, miReaccion === 'me_divierte' ? styles.sideIconActive : null]}>😄</Text>
          {conteos.meDivierte > 0 ? <Text style={styles.sideCount}>{conteos.meDivierte}</Text> : null}
        </Pressable>
        <Pressable onPress={onCompartir} style={styles.sideButton}>
          <Text style={styles.sideIcon}>↗</Text>
        </Pressable>
        {esDueno ? (
          <Pressable onPress={onEliminar} style={styles.sideButton}>
            <Text style={styles.sideIcon}>🗑</Text>
          </Pressable>
        ) : post.autor ? (
          <View style={styles.sideButton}>
            <DenunciaButtonStub userId={post.autor.userId} postId={post.postId} />
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: '100%', backgroundColor: '#000' },
  overlayBottom: { position: 'absolute', left: 16, right: 90, bottom: 40 },
  autor: { color: '#fff', fontWeight: '700', fontSize: 15, marginBottom: 4 },
  texto: { color: '#fff', fontSize: 14 },
  overlaySide: { position: 'absolute', right: 12, bottom: 40, alignItems: 'center', gap: 18 },
  sideButton: { alignItems: 'center' },
  sideIcon: { color: '#fff', fontSize: 26 },
  sideIconActive: { color: '#f2994a' },
  sideCount: { color: '#fff', fontSize: 12, marginTop: 2 },
});
