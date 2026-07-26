import { useVideoPlayer, VideoView } from 'expo-video';
import React, { useEffect, useRef } from 'react';
import { Image, Platform, StyleSheet, View, ViewStyle } from 'react-native';

type Props = {
  uri: string;
  tipo: 'foto' | 'video';
  /** CSS filter string (solo web) */
  cssFilter?: string;
  style?: ViewStyle;
  loop?: boolean;
  muted?: boolean;
  /** Congela el video sin descargarlo (mantener el dedo apretado). */
  pausado?: boolean;
  /**
   * Recorte no destructivo: el video arranca en `inicioSeg` y vuelve ahí al
   * llegar a `finSeg`. El archivo no se toca — es el reproductor el que
   * respeta el tramo elegido.
   */
  inicioSeg?: number | null;
  finSeg?: number | null;
  onEnded?: () => void;
};

/**
 * Media a pantalla fija: object-fit/cover, sin agrandar el viewport.
 * En web el video usa <video> nativo (expo-video a veces queda en un frame).
 */
export function StoryMediaFill({
  uri,
  tipo,
  cssFilter,
  style,
  loop = true,
  muted = true,
  pausado = false,
  inicioSeg = null,
  finSeg = null,
  onEnded,
}: Props) {
  const webVideoRef = useRef<HTMLVideoElement | null>(null);

  const nativePlayer = useVideoPlayer(Platform.OS !== 'web' && tipo === 'video' ? uri : null, (p) => {
    p.loop = loop;
    p.muted = muted;
    p.play();
  });

  useEffect(() => {
    if (Platform.OS !== 'web' || tipo !== 'video') return;
    const el = webVideoRef.current;
    if (!el) return;
    el.loop = loop;
    el.muted = muted;
    el.playsInline = true;
    el.setAttribute('playsinline', 'true');
    el.setAttribute('webkit-playsinline', 'true');
    const onEnd = () => onEnded?.();
    el.addEventListener('ended', onEnd);
    void el.play().catch(() => {
      // autoplay bloqueado: silenciar e intentar de nuevo
      el.muted = true;
      void el.play().catch(() => undefined);
    });
    return () => el.removeEventListener('ended', onEnd);
  }, [uri, tipo, loop, muted, onEnded]);

  // Recorte en web: se salta al inicio elegido y se vigila el tiempo para
  // cortar en el final. `timeupdate` dispara ~4 veces por segundo, que alcanza
  // para un corte que el ojo percibe como exacto.
  useEffect(() => {
    if (Platform.OS !== 'web' || tipo !== 'video') return;
    const el = webVideoRef.current;
    if (!el || (inicioSeg === null && finSeg === null)) return;

    const irAlInicio = () => {
      if (inicioSeg !== null && Math.abs(el.currentTime - inicioSeg) > 0.3) {
        el.currentTime = inicioSeg;
      }
    };

    const vigilarFin = () => {
      if (finSeg !== null && el.currentTime >= finSeg) {
        if (loop) {
          el.currentTime = inicioSeg ?? 0;
        } else {
          el.pause();
          onEnded?.();
        }
      }
    };

    el.addEventListener('loadedmetadata', irAlInicio);
    el.addEventListener('timeupdate', vigilarFin);
    // Si el metadata ya cargó, el evento no vuelve a disparar.
    if (el.readyState >= 1) irAlInicio();

    return () => {
      el.removeEventListener('loadedmetadata', irAlInicio);
      el.removeEventListener('timeupdate', vigilarFin);
    };
  }, [uri, tipo, inicioSeg, finSeg, loop, onEnded]);

  // Pausa/reanuda sin recargar el video.
  useEffect(() => {
    if (tipo !== 'video') return;

    if (Platform.OS === 'web') {
      const el = webVideoRef.current;
      if (!el) return;
      if (pausado) {
        el.pause();
      } else {
        void el.play().catch(() => undefined);
      }
      return;
    }

    try {
      if (pausado) nativePlayer.pause();
      else nativePlayer.play();
    } catch {
      // ignore
    }
  }, [pausado, tipo, nativePlayer]);

  useEffect(() => {
    if (Platform.OS === 'web' || tipo !== 'video') return;
    try {
      nativePlayer.loop = loop;
      nativePlayer.muted = muted;
      nativePlayer.replace(uri);
      nativePlayer.play();
    } catch {
      // ignore
    }
  }, [uri, tipo, loop, muted, nativePlayer]);

  const filterStyle =
    Platform.OS === 'web' && cssFilter ? ({ filter: cssFilter } as object) : null;

  return (
    <View style={[styles.frame, style]} pointerEvents="none">
      {tipo === 'foto' ? (
        <Image source={{ uri }} style={[styles.media, filterStyle]} resizeMode="cover" />
      ) : Platform.OS === 'web' ? (
        <video
          key={uri}
          ref={(node: HTMLVideoElement | null) => {
            webVideoRef.current = node;
          }}
          src={uri}
          autoPlay
          muted={muted}
          loop={loop}
          playsInline
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            ...(cssFilter ? { filter: cssFilter } : null),
          }}
        />
      ) : (
        <VideoView
          player={nativePlayer}
          style={[styles.media, filterStyle]}
          contentFit="cover"
          nativeControls={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    ...StyleSheet.absoluteFill,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  media: {
    ...StyleSheet.absoluteFill,
    width: '100%',
    height: '100%',
  },
});
