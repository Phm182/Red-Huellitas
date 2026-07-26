import { Ionicons } from '@expo/vector-icons';
import { useEventListener } from 'expo';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Dimensions, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring } from 'react-native-reanimated';
import { usePostActions } from '../hooks/usePostActions';
import { Post } from '../types';
import { radii } from '../theme/elevation';
import { type } from '../theme/typography';
import { rhMediaUrl } from '../utils/media';
import { hapticMedio } from '../utils/haptics';
import { DenunciaButtonStub } from './DenunciaButtonStub';

interface ShortCardProps {
  post: Post;
  onEliminado?: (postId: number) => void;
  /** Solo el Short visible en pantalla reproduce — los demás quedan pausados. */
  activo: boolean;
}

const { height: ALTURA_PANTALLA } = Dimensions.get('window');

/** Botón de la columna derecha: icono grande + contador debajo. */
function BotonLateral({
  icon,
  activo,
  label,
  onPress,
  disabled,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  activo?: boolean;
  label?: string | number;
  onPress: () => void;
  disabled?: boolean;
}) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View style={animStyle}>
      <Pressable
        onPress={() => {
          hapticMedio();
          // Rebote corto: confirma el toque aunque el contador no cambie.
          scale.value = withSequence(withSpring(1.25, { damping: 8 }), withSpring(1, { damping: 12 }));
          onPress();
        }}
        disabled={disabled}
        style={styles.sideButton}
        hitSlop={8}
      >
        <Ionicons name={icon} size={30} color={activo ? '#FF5C6A' : '#fff'} />
        {label !== undefined && label !== 0 ? <Text style={styles.sideCount}>{label}</Text> : null}
      </Pressable>
    </Animated.View>
  );
}

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

      {/* Degradado inferior: sin esto el texto blanco desaparece sobre los
          videos claros. */}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.75)']}
        style={styles.degradado}
        pointerEvents="none"
      />

      <View style={styles.overlayBottom}>
        <Pressable
          onPress={() => post.autor && router.push(`/(app)/usuario/${post.autor.username}`)}
          style={styles.autorFila}
        >
          <Text style={[type.section, styles.autor]}>@{post.autor?.username}</Text>
          {!esDueno && post.autor ? (
            <Pressable onPress={onToggleSeguir} disabled={siguiendoBusy} style={styles.seguirChip}>
              <Text style={[type.caption, { color: '#fff' }]}>
                {siguiendo ? t('feed.siguiendo') : t('feed.seguir')}
              </Text>
            </Pressable>
          ) : null}
        </Pressable>

        {post.texto ? (
          <Text style={[type.bodySm, styles.texto]} numberOfLines={2}>
            {post.texto}
          </Text>
        ) : null}
      </View>

      <View style={styles.overlaySide}>
        <BotonLateral
          icon={miReaccion === 'like' ? 'heart' : 'heart-outline'}
          activo={miReaccion === 'like'}
          label={conteos.like}
          onPress={() => onReaccionar('like')}
          disabled={reaccionBusy}
        />
        <BotonLateral
          icon={miReaccion === 'me_divierte' ? 'happy' : 'happy-outline'}
          activo={miReaccion === 'me_divierte'}
          label={conteos.meDivierte}
          onPress={() => onReaccionar('me_divierte')}
          disabled={reaccionBusy}
        />
        <BotonLateral icon="paper-plane-outline" onPress={onCompartir} />

        {esDueno ? (
          <BotonLateral icon="trash-outline" onPress={onEliminar} />
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
  degradado: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 220 },
  overlayBottom: { position: 'absolute', left: 16, right: 92, bottom: 40 },
  autorFila: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
  autor: { color: '#fff' },
  seguirChip: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.7)',
    borderRadius: radii.pill,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  texto: { color: '#fff' },
  overlaySide: { position: 'absolute', right: 12, bottom: 40, alignItems: 'center', gap: 22 },
  sideButton: { alignItems: 'center' },
  sideCount: { color: '#fff', fontSize: 12, marginTop: 3, fontWeight: '600' },
});
