import { useEventListener } from 'expo';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { historiasApi } from '../../../src/api/historiasApi';
import { Historia } from '../../../src/types';
import { rhMediaUrl } from '../../../src/utils/media';

const DURACION_FOTO_MS = 5000;

export default function VisorHistoriasScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const [historias, setHistorias] = useState<Historia[]>([]);
  const [loading, setLoading] = useState(true);
  const [index, setIndex] = useState(0);

  const progresos = useRef<Animated.Value[]>([]).current;

  useFocusEffect(
    useCallback(() => {
      let activo = true;
      setLoading(true);
      historiasApi.ver(Number(userId)).then((res) => {
        if (!activo) return;
        if (res.success && res.data) {
          setHistorias(res.data.historias);
          progresos.length = 0;
          res.data.historias.forEach(() => progresos.push(new Animated.Value(0)));
        }
        setIndex(0);
        setLoading(false);
      });
      return () => {
        activo = false;
      };
    }, [userId])
  );

  const actual = historias[index] ?? null;

  const cerrar = () => {
    router.back();
  };

  const avanzar = useCallback(() => {
    if (index >= historias.length - 1) {
      cerrar();
    } else {
      setIndex((i) => i + 1);
    }
  }, [index, historias.length]);

  const retroceder = () => {
    if (index > 0) {
      setIndex((i) => i - 1);
    }
  };

  useEffect(() => {
    if (!actual) return;
    historiasApi.marcarVista(actual.historiaId);

    progresos.forEach((valor, i) => {
      if (i < index) {
        valor.setValue(1);
      } else if (i > index) {
        valor.setValue(0);
      }
    });

    if (actual.tipoMedia === 'foto') {
      progresos[index]?.setValue(0);
      const animacion = Animated.timing(progresos[index], {
        toValue: 1,
        duration: DURACION_FOTO_MS,
        useNativeDriver: false,
      });
      animacion.start(({ finished }) => {
        if (finished) avanzar();
      });
      return () => animacion.stop();
    }
    // Para video, el progreso lo maneja el reproductor (ver player abajo).
    return undefined;
  }, [actual, index]);

  const player = useVideoPlayer(actual?.tipoMedia === 'video' ? rhMediaUrl(actual.mediaPath) : null, (p) => {
    p.play();
  });

  useEventListener(player, 'playToEnd', () => {
    avanzar();
  });

  useEffect(() => {
    if (actual?.tipoMedia !== 'video') return;
    progresos[index]?.setValue(0);
    const duracionMs = (actual.duracionSegundos ?? 5) * 1000;
    const animacion = Animated.timing(progresos[index], {
      toValue: 1,
      duration: duracionMs,
      useNativeDriver: false,
    });
    animacion.start();
    return () => animacion.stop();
  }, [actual, index]);

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator color="#fff" />
      </View>
    );
  }

  if (!actual) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Pressable onPress={cerrar} style={styles.closeButton}>
          <Text style={styles.closeText}>✕</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {actual.tipoMedia === 'foto' ? (
        <Image source={{ uri: rhMediaUrl(actual.mediaPath) }} style={StyleSheet.absoluteFill} resizeMode="contain" />
      ) : (
        <VideoView player={player} style={StyleSheet.absoluteFill} contentFit="contain" nativeControls={false} />
      )}

      <View style={styles.progressRow}>
        {historias.map((h, i) => (
          <View key={h.historiaId} style={styles.progressTrack}>
            <Animated.View
              style={[
                styles.progressFill,
                {
                  width: progresos[i]
                    ? progresos[i].interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] })
                    : '0%',
                },
              ]}
            />
          </View>
        ))}
      </View>

      <Pressable style={styles.closeButton} onPress={cerrar}>
        <Text style={styles.closeText}>✕</Text>
      </Pressable>

      <View style={styles.tapZones}>
        <Pressable style={styles.tapZone} onPress={retroceder} />
        <Pressable style={styles.tapZone} onPress={avanzar} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  centered: { alignItems: 'center', justifyContent: 'center' },
  progressRow: { position: 'absolute', top: 48, left: 8, right: 8, flexDirection: 'row', gap: 4 },
  progressTrack: { flex: 1, height: 3, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#fff' },
  closeButton: { position: 'absolute', top: 56, right: 12, padding: 8 },
  closeText: { color: '#fff', fontSize: 20, fontWeight: '700' },
  tapZones: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, flexDirection: 'row' },
  tapZone: { flex: 1 },
});
