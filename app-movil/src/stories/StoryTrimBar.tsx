import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Platform, PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
import { radii } from '../theme/elevation';
import { type } from '../theme/typography';
import { hapticLeve } from '../utils/haptics';

/** Ancho de cada manija, en px. */
const MANIJA = 18;

/** Cuántas miniaturas se intentan sacar a lo largo del video. */
const MINIATURAS = 8;

/** Un recorte más corto que esto no se puede ver: se ignora el gesto. */
const MIN_DURACION_SEG = 1;

type Props = {
  uri: string;
  duracionSegundos: number;
  inicioSeg: number;
  finSeg: number;
  sinAudio: boolean;
  onChange: (inicioSeg: number, finSeg: number) => void;
  onToggleAudio: () => void;
};

/**
 * Timeline para recortar el video.
 *
 * El recorte es **no destructivo**: no se re-encodea nada, se elige un tramo y
 * el reproductor arranca y corta ahí. Recortar de verdad exigiría build nativo
 * (ffmpeg-kit fue retirado en 2025), y para una historia que vence a las 24hs
 * no vale la pena: el archivo pesa igual pero dura lo que el usuario eligió.
 *
 * Las miniaturas sólo se pueden extraer en web (canvas sobre el <video>). En
 * nativo se muestra una regla de tiempo, que cumple la misma función de
 * referencia sin depender de una librería de thumbnails.
 */
export function StoryTrimBar({
  uri,
  duracionSegundos,
  inicioSeg,
  finSeg,
  sinAudio,
  onChange,
  onToggleAudio,
}: Props) {
  const [ancho, setAncho] = useState(0);
  const [miniaturas, setMiniaturas] = useState<string[]>([]);
  const inicioRef = useRef(inicioSeg);
  const finRef = useRef(finSeg);

  inicioRef.current = inicioSeg;
  finRef.current = finSeg;

  useEffect(() => {
    if (Platform.OS !== 'web' || duracionSegundos <= 0) return;
    let cancelado = false;

    // Un <video> fuera del DOM: se lo posiciona en N instantes y se copia cada
    // frame a un canvas. Es la única forma de sacar miniaturas en web sin
    // sumar dependencias.
    (async () => {
      const video = document.createElement('video');
      video.src = uri;
      video.crossOrigin = 'anonymous';
      video.muted = true;

      try {
        await new Promise<void>((resolve, reject) => {
          video.onloadeddata = () => resolve();
          video.onerror = () => reject(new Error('no se pudo leer el video'));
        });

        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 110;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const frames: string[] = [];
        for (let i = 0; i < MINIATURAS; i++) {
          if (cancelado) return;
          const t = (duracionSegundos / MINIATURAS) * i;
          video.currentTime = t;
          await new Promise<void>((resolve) => {
            video.onseeked = () => resolve();
          });
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          frames.push(canvas.toDataURL('image/jpeg', 0.5));
        }
        if (!cancelado) setMiniaturas(frames);
      } catch {
        // Sin miniaturas la barra sigue siendo usable: se ve la regla.
      }
    })();

    return () => {
      cancelado = true;
    };
  }, [uri, duracionSegundos]);

  const segundosPorPx = duracionSegundos > 0 && ancho > 0 ? duracionSegundos / ancho : 0;

  const panInicio = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: () => hapticLeve(),
        onPanResponderMove: (_e, gesture) => {
          if (segundosPorPx === 0) return;
          const nuevo = inicioRef.current + gesture.dx * segundosPorPx;
          const acotado = Math.max(0, Math.min(nuevo, finRef.current - MIN_DURACION_SEG));
          onChange(acotado, finRef.current);
        },
        onPanResponderRelease: () => {
          inicioRef.current = inicioSeg;
        },
      }),
    [segundosPorPx, onChange, inicioSeg]
  );

  const panFin = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: () => hapticLeve(),
        onPanResponderMove: (_e, gesture) => {
          if (segundosPorPx === 0) return;
          const nuevo = finRef.current + gesture.dx * segundosPorPx;
          const acotado = Math.min(duracionSegundos, Math.max(nuevo, inicioRef.current + MIN_DURACION_SEG));
          onChange(inicioRef.current, acotado);
        },
        onPanResponderRelease: () => {
          finRef.current = finSeg;
        },
      }),
    [segundosPorPx, duracionSegundos, onChange, finSeg]
  );

  if (duracionSegundos <= 0) return null;

  const izquierda = ancho > 0 ? (inicioSeg / duracionSegundos) * ancho : 0;
  const derecha = ancho > 0 ? (finSeg / duracionSegundos) * ancho : 0;
  const seleccionado = Math.max(0, finSeg - inicioSeg);

  return (
    <View style={styles.contenedor}>
      <View style={styles.encabezado}>
        <Text style={[type.caption, styles.duracion]}>
          {seleccionado.toFixed(1)}s de {duracionSegundos.toFixed(1)}s
        </Text>
        <Pressable
          onPress={() => {
            hapticLeve();
            onToggleAudio();
          }}
          style={[styles.audioBtn, sinAudio && styles.audioBtnActivo]}
          hitSlop={8}
        >
          <Ionicons name={sinAudio ? 'volume-mute' : 'volume-high'} size={15} color="#fff" />
          <Text style={[type.caption, styles.audioLabel]}>{sinAudio ? 'Sin audio' : 'Con audio'}</Text>
        </Pressable>
      </View>

      <View style={styles.pista} onLayout={(e) => setAncho(e.nativeEvent.layout.width)}>
        {miniaturas.length > 0 ? (
          <View style={styles.miniaturas}>
            {miniaturas.map((src, i) => (
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              <img key={i} src={src} style={{ flex: 1, height: '100%', objectFit: 'cover' } as any} alt="" />
            ))}
          </View>
        ) : (
          <View style={styles.regla}>
            {Array.from({ length: MINIATURAS }).map((_, i) => (
              <View key={i} style={styles.reglaMarca}>
                <Text style={styles.reglaTexto}>
                  {Math.round((duracionSegundos / MINIATURAS) * i)}s
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Zonas descartadas: oscurecidas, para que se lea de un vistazo qué
            queda afuera del recorte. */}
        <View style={[styles.descartado, { left: 0, width: izquierda }]} pointerEvents="none" />
        <View style={[styles.descartado, { left: derecha, right: 0 }]} pointerEvents="none" />

        <View style={[styles.seleccion, { left: izquierda, width: Math.max(0, derecha - izquierda) }]} pointerEvents="none" />

        <View {...panInicio.panHandlers} style={[styles.manija, { left: izquierda - MANIJA / 2 }]}>
          <View style={styles.manijaLinea} />
        </View>
        <View {...panFin.panHandlers} style={[styles.manija, { left: derecha - MANIJA / 2 }]}>
          <View style={styles.manijaLinea} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: { paddingHorizontal: 16, paddingVertical: 10 },
  encabezado: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  duracion: { color: '#fff' },
  audioBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: radii.pill,
    paddingVertical: 5,
    paddingHorizontal: 10,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  audioBtnActivo: { backgroundColor: 'rgba(255,92,106,0.85)' },
  audioLabel: { color: '#fff' },
  pista: {
    height: 56,
    borderRadius: radii.sm,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
  },
  miniaturas: { flexDirection: 'row', height: '100%' },
  regla: { flexDirection: 'row', height: '100%', alignItems: 'center' },
  reglaMarca: { flex: 1, alignItems: 'center', borderLeftWidth: 1, borderLeftColor: 'rgba(255,255,255,0.15)' },
  reglaTexto: { color: 'rgba(255,255,255,0.6)', fontSize: 10 },
  descartado: { position: 'absolute', top: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)' },
  seleccion: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    borderWidth: 2,
    borderColor: '#FF5C6A',
    borderRadius: radii.sm,
  },
  manija: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: MANIJA,
    backgroundColor: '#FF5C6A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  manijaLinea: { width: 2, height: 18, borderRadius: 1, backgroundColor: '#fff' },
});
