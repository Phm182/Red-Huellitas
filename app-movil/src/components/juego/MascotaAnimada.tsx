import { Image } from 'expo-image';
import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { JuegoAnimo } from '../../types';
import { AccionMascota } from '../MascotaAvatar';

type Props = {
  especie: string;
  animo: JuegoAnimo;
  accion?: AccionMascota;
  disparo?: number;
  tamano?: number;
};

/**
 * HuePlay con animal de verdad animado (GIF), no SVG ni foto estática.
 * Cada acción cambia el clip: idle / comer / jugar / bañar / dormir.
 */
const CLIPS = {
  idle: require('../../../assets/juego/gato-idle.gif'),
  alimentar: require('../../../assets/juego/gato-eat.gif'),
  jugar: require('../../../assets/juego/gato-play.gif'),
  banar: require('../../../assets/juego/banio.gif'),
  dormir: require('../../../assets/juego/gato-idle.gif'),
} as const;

export function MascotaAnimada({
  animo,
  accion = null,
  disparo = 0,
  tamano = 240,
}: Props) {
  const [clipKey, setClipKey] = useState<keyof typeof CLIPS>('idle');
  const [clipNonce, setClipNonce] = useState(0);

  const rebote = useSharedValue(0);
  const escala = useSharedValue(1);
  const oscurecer = useSharedValue(0);

  useEffect(() => {
    if (accion) {
      setClipKey(accion);
      setClipNonce((n) => n + 1);
      if (accion !== 'dormir') {
        const ms = accion === 'jugar' ? 2800 : accion === 'banar' ? 3200 : 2600;
        const t = setTimeout(() => setClipKey('idle'), ms);
        return () => clearTimeout(t);
      }
      return;
    }
    if (disparo > 0) {
      setClipKey('jugar');
      setClipNonce((n) => n + 1);
      const t = setTimeout(() => setClipKey('idle'), 2800);
      return () => clearTimeout(t);
    }
    setClipKey('idle');
  }, [accion, disparo]);

  useEffect(() => {
    if (clipKey === 'dormir') {
      oscurecer.value = withTiming(0.35, { duration: 700 });
      escala.value = withTiming(0.96, { duration: 700 });
      rebote.value = withTiming(10, { duration: 700 });
      return;
    }
    oscurecer.value = withTiming(0, { duration: 300 });
    rebote.value = withTiming(0, { duration: 300 });

    const lento = animo === 'decaido';
    escala.value = withRepeat(
      withSequence(
        withTiming(lento ? 1.01 : 1.025, {
          duration: lento ? 2200 : 1400,
          easing: Easing.inOut(Easing.sin),
        }),
        withTiming(1, { duration: lento ? 2200 : 1400, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      false
    );

    if (clipKey === 'jugar') {
      rebote.value = withSequence(
        withTiming(-28, { duration: 200, easing: Easing.out(Easing.cubic) }),
        withSpring(0, { damping: 7, stiffness: 160 })
      );
    }
  }, [clipKey, animo, escala, rebote, oscurecer]);

  const estilo = useAnimatedStyle(() => ({
    transform: [{ translateY: rebote.value }, { scale: escala.value }],
  }));

  const estiloSueno = useAnimatedStyle(() => ({
    opacity: oscurecer.value,
  }));

  const estiloZzz = useAnimatedStyle(() => ({
    opacity: oscurecer.value > 0.05 ? 1 : 0,
    transform: [{ translateY: -oscurecer.value * 20 }],
  }));

  const fuente = useMemo(() => CLIPS[clipKey] ?? CLIPS.idle, [clipKey]);

  return (
    <View style={[styles.wrap, { width: tamano, height: tamano }]}>
      <Animated.Text style={[styles.zzz, estiloZzz]}>zzz</Animated.Text>
      <Animated.View
        style={[styles.marco, { width: tamano, height: tamano, borderRadius: tamano * 0.18 }, estilo]}
      >
        <Image
          key={`gif-${clipKey}-${clipNonce}`}
          source={fuente}
          style={{ width: tamano, height: tamano }}
          contentFit="cover"
          transition={0}
        />
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.sueno, estiloSueno]} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  marco: { overflow: 'hidden', backgroundColor: 'rgba(0,0,0,0.04)' },
  sueno: { backgroundColor: '#0a1628' },
  zzz: {
    position: 'absolute',
    top: 6,
    right: 12,
    zIndex: 3,
    fontSize: 20,
    fontWeight: '700',
    color: '#6B7280',
  },
});
