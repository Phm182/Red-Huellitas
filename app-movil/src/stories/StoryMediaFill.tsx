import { useVideoPlayer, VideoView } from 'expo-video';
import React, { useEffect, useRef } from 'react';
import { Image, Platform, StyleSheet, View, ViewStyle } from 'react-native';

export type StoryContentFit = 'cover' | 'contain';

type Props = {
  uri: string;
  tipo: 'foto' | 'video';
  /** CSS filter string (solo web) */
  cssFilter?: string;
  style?: ViewStyle;
  loop?: boolean;
  muted?: boolean;
  /** 0–1. Solo aplica si no está muted. */
  volume?: number;
  /** cover = recorta (Instagram default); contain = entra entero (puede verse con bandas). */
  contentFit?: StoryContentFit;
  /** Congela el video sin descargarlo (mantener el dedo apretado). */
  pausado?: boolean;
  /**
   * Recorte no destructivo: el video arranca en `inicioSeg` y vuelve ahí al
   * llegar a `finSeg`. El archivo no se toca — es el reproductor el que
   * respeta el tramo elegido.
   */
  inicioSeg?: number | null;
  finSeg?: number | null;
  /**
   * Saltar a este segundo. Cambiar el valor fuerza el salto, así el que edita
   * ve el frame exacto mientras arrastra el recorte o el cabezal.
   */
  posicionBuscada?: number | null;
  /** Posición de reproducción, para dibujar el cabezal en la barra de recorte. */
  onPosicion?: (seg: number) => void;
  /** 0.5 = cámara lenta, 1 = normal, 2 = cámara rápida. */
  velocidad?: number;
  onEnded?: () => void;
};

/**
 * Media a pantalla fija: object-fit cover/contain, sin agrandar el viewport.
 * En web el video usa <video> nativo (expo-video a veces queda en un frame).
 */
export function StoryMediaFill({
  uri,
  tipo,
  cssFilter,
  style,
  loop = true,
  muted = true,
  volume = 1,
  contentFit = 'cover',
  pausado = false,
  inicioSeg = null,
  finSeg = null,
  posicionBuscada = null,
  onPosicion,
  velocidad = 1,
  onEnded,
}: Props) {
  const webVideoRef = useRef<HTMLVideoElement | null>(null);
  const vol = Math.min(1, Math.max(0, volume));

  // El padre suele pasar una lambda nueva en cada render; guardarla en un ref
  // evita que los efectos de abajo se re-registren en cada frame de un gesto.
  const onPosicionRef = useRef(onPosicion);
  onPosicionRef.current = onPosicion;

  const nativePlayer = useVideoPlayer(Platform.OS !== 'web' && tipo === 'video' ? uri : null, (p) => {
    p.loop = loop;
    p.muted = muted;
    p.volume = vol;
    p.play();
  });

  useEffect(() => {
    if (Platform.OS !== 'web' || tipo !== 'video') return;
    const el = webVideoRef.current;
    if (!el) return;
    el.loop = loop;
    el.muted = muted;
    el.volume = muted ? 0 : vol;
    el.playsInline = true;
    el.setAttribute('playsinline', 'true');
    el.setAttribute('webkit-playsinline', 'true');
    const onEnd = () => onEnded?.();
    el.addEventListener('ended', onEnd);
    void el.play().catch(() => {
      el.muted = true;
      void el.play().catch(() => undefined);
    });
    return () => el.removeEventListener('ended', onEnd);
  }, [uri, tipo, loop, muted, vol, onEnded]);

  useEffect(() => {
    if (Platform.OS !== 'web' || tipo !== 'video') return;
    const el = webVideoRef.current;
    if (!el) return;

    const irAlInicio = () => {
      if (inicioSeg !== null && Math.abs(el.currentTime - inicioSeg) > 0.3) {
        el.currentTime = inicioSeg;
      }
    };

    const vigilarTramo = () => {
      onPosicionRef.current?.(el.currentTime);
      if (finSeg !== null && el.currentTime >= finSeg) {
        if (loop) {
          el.currentTime = inicioSeg ?? 0;
        } else {
          el.pause();
          onEnded?.();
        }
        return;
      }
      // Si el recorte se movió por delante del cabezal, arrastrarlo adentro del
      // tramo: si no, quedaría reproduciendo un pedazo ya descartado.
      if (inicioSeg !== null && el.currentTime < inicioSeg - 0.3) {
        el.currentTime = inicioSeg;
      }
    };

    el.addEventListener('loadedmetadata', irAlInicio);
    el.addEventListener('timeupdate', vigilarTramo);
    if (el.readyState >= 1 && el.currentTime === 0) irAlInicio();

    return () => {
      el.removeEventListener('loadedmetadata', irAlInicio);
      el.removeEventListener('timeupdate', vigilarTramo);
    };
  }, [uri, tipo, inicioSeg, finSeg, loop, onEnded]);

  // Salto explícito (arrastrar una manija o el cabezal). Va aparte del efecto
  // de arriba porque tiene que poder pisar la posición actual sin condiciones.
  useEffect(() => {
    if (tipo !== 'video' || posicionBuscada === null) return;

    if (Platform.OS === 'web') {
      const el = webVideoRef.current;
      if (el && Number.isFinite(posicionBuscada)) el.currentTime = posicionBuscada;
      return;
    }
    try {
      nativePlayer.currentTime = posicionBuscada;
    } catch {
      // ignore
    }
  }, [posicionBuscada, tipo, nativePlayer]);

  // El tramo recortado también tiene que respetarse en nativo: sin esto el
  // video se veía entero en el celular y recortado sólo en web.
  useEffect(() => {
    if (Platform.OS === 'web' || tipo !== 'video') return;

    try {
      nativePlayer.timeUpdateEventInterval = 0.2;
    } catch {
      return;
    }

    const sub = nativePlayer.addListener('timeUpdate', ({ currentTime }) => {
      onPosicionRef.current?.(currentTime);
      if (finSeg !== null && currentTime >= finSeg) {
        if (loop) {
          nativePlayer.currentTime = inicioSeg ?? 0;
        } else {
          nativePlayer.pause();
          onEnded?.();
        }
        return;
      }
      if (inicioSeg !== null && currentTime < inicioSeg - 0.3) {
        nativePlayer.currentTime = inicioSeg;
      }
    });

    return () => sub.remove();
  }, [tipo, inicioSeg, finSeg, loop, onEnded, nativePlayer]);

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
      nativePlayer.volume = vol;
      nativePlayer.replace(uri);
      nativePlayer.play();
    } catch {
      // ignore
    }
  }, [uri, tipo, loop, muted, vol, nativePlayer]);

  // Velocidad. Igual que el recorte, no se re-encodea: grabar 10s a 2x se ve
  // en 5s porque el reproductor va al doble, no porque el archivo cambie.
  useEffect(() => {
    if (tipo !== 'video') return;
    const factor = velocidad > 0 ? velocidad : 1;

    if (Platform.OS === 'web') {
      const el = webVideoRef.current;
      if (el) el.playbackRate = factor;
      return;
    }
    try {
      nativePlayer.playbackRate = factor;
    } catch {
      // ignore
    }
  }, [velocidad, tipo, nativePlayer, uri]);

  // Volumen en caliente (sin recargar el media).
  useEffect(() => {
    if (tipo !== 'video') return;
    if (Platform.OS === 'web') {
      const el = webVideoRef.current;
      if (el) {
        el.muted = muted;
        el.volume = muted ? 0 : vol;
      }
      return;
    }
    try {
      nativePlayer.muted = muted;
      nativePlayer.volume = vol;
    } catch {
      // ignore
    }
  }, [muted, vol, tipo, nativePlayer]);

  const filterStyle =
    Platform.OS === 'web' && cssFilter ? ({ filter: cssFilter } as object) : null;
  const fit = contentFit === 'contain' ? 'contain' : 'cover';

  return (
    <View style={[styles.frame, style]} pointerEvents="none">
      {tipo === 'foto' ? (
        <Image source={{ uri }} style={[styles.media, filterStyle]} resizeMode={fit} />
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
            objectFit: fit,
            backgroundColor: '#000',
            ...(cssFilter ? { filter: cssFilter } : null),
          }}
        />
      ) : (
        <VideoView
          player={nativePlayer}
          style={[styles.media, filterStyle]}
          contentFit={fit}
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
