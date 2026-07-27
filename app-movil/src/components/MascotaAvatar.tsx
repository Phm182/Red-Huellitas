import { Image } from 'expo-image';
import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { JuegoAnimo } from '../types';
import { useTheme } from '../theme/ThemeProvider';
import { rhMediaUrl } from '../utils/media';

export type AccionMascota = 'alimentar' | 'jugar' | 'banar' | 'dormir' | null;

interface Props {
  avatarPath: string | null;
  animo: JuegoAnimo;
  especie: string;
  tamano?: number;
  /** Se incrementa desde afuera para disparar el rebote de una acción. */
  celebrar?: number;
  /** Acción en curso: anima la foto real (no un dibujo geométrico). */
  accion?: AccionMascota;
}

const EMOJI_ESPECIE: Record<string, string> = { perro: '🐶', gato: '🐱', otro: '🐾' };

/**
 * La mascota en pantalla: siempre la foto real (o avatar IA) del usuario.
 * Las acciones mueven esa imagen con física suave (salto, sacudida, inclinación),
 * no con un SVG de elipses.
 */
export function MascotaAvatar({
  avatarPath,
  animo,
  especie,
  tamano = 160,
  celebrar = 0,
  accion = null,
}: Props) {
  const { colors } = useTheme();

  const escala = useSharedValue(1);
  const rebote = useSharedValue(0);
  const inclinacion = useSharedValue(0);
  const sacudir = useSharedValue(0);
  const brilloBanio = useSharedValue(0);
  const somnolencia = useSharedValue(0);

  // Respiración continua según ánimo.
  useEffect(() => {
    if (accion === 'dormir') return;
    const duracion = animo === 'decaido' ? 2600 : animo === 'aburrido' ? 2000 : 1400;
    const amplitud = animo === 'decaido' ? 1.015 : 1.035;

    escala.value = withRepeat(
      withSequence(
        withTiming(amplitud, { duration: duracion, easing: Easing.inOut(Easing.sin) }),
        withTiming(1, { duration: duracion, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      false
    );

    inclinacion.value = withTiming(animo === 'decaido' ? 5 : 0, { duration: 600 });
  }, [animo, accion, escala, inclinacion]);

  // Acciones con movimiento sobre la foto real.
  useEffect(() => {
    if (!accion) return;

    somnolencia.value = withTiming(0, { duration: 200 });
    brilloBanio.value = withTiming(0, { duration: 200 });
    sacudir.value = 0;

    if (accion === 'jugar') {
      rebote.value = withSequence(
        withTiming(-42, { duration: 220, easing: Easing.out(Easing.cubic) }),
        withSpring(0, { damping: 7, stiffness: 160, mass: 0.7 }),
        withTiming(-18, { duration: 140, easing: Easing.out(Easing.quad) }),
        withSpring(0, { damping: 9, stiffness: 180 })
      );
      escala.value = withSequence(
        withTiming(1.08, { duration: 180 }),
        withSpring(1, { damping: 10 })
      );
      return;
    }

    if (accion === 'alimentar') {
      inclinacion.value = withSequence(
        withTiming(12, { duration: 160 }),
        withRepeat(
          withSequence(
            withTiming(-8, { duration: 140 }),
            withTiming(10, { duration: 140 })
          ),
          4,
          true
        ),
        withSpring(0, { damping: 12 })
      );
      escala.value = withSequence(
        withTiming(1.04, { duration: 120 }),
        withRepeat(
          withSequence(withTiming(0.97, { duration: 120 }), withTiming(1.03, { duration: 120 })),
          5,
          true
        ),
        withSpring(1)
      );
      return;
    }

    if (accion === 'banar') {
      sacudir.value = withSequence(
        withRepeat(
          withSequence(withTiming(1, { duration: 55 }), withTiming(-1, { duration: 55 })),
          10,
          true
        ),
        withTiming(0, { duration: 80 })
      );
      brilloBanio.value = withSequence(
        withTiming(0.55, { duration: 200 }),
        withTiming(0.2, { duration: 500 }),
        withTiming(0, { duration: 400 })
      );
      rebote.value = withSequence(
        withTiming(-10, { duration: 100 }),
        withSpring(0, { damping: 8 })
      );
      return;
    }

    if (accion === 'dormir') {
      rebote.value = withTiming(16, { duration: 700, easing: Easing.out(Easing.cubic) });
      escala.value = withTiming(0.92, { duration: 700 });
      inclinacion.value = withTiming(-8, { duration: 700 });
      somnolencia.value = withTiming(0.35, { duration: 900 });
    }
  }, [accion, rebote, escala, inclinacion, sacudir, brilloBanio, somnolencia]);

  // Rebote corto al completar una acción (nivel / éxito).
  useEffect(() => {
    if (celebrar === 0 || accion) return;
    rebote.value = withSequence(
      withTiming(-22, { duration: 160, easing: Easing.out(Easing.quad) }),
      withSpring(0, { damping: 8, stiffness: 170 })
    );
  }, [celebrar, accion, rebote]);

  const estilo = useAnimatedStyle(() => ({
    transform: [
      { translateY: rebote.value },
      { translateX: sacudir.value * 10 },
      { scale: escala.value },
      { rotate: `${inclinacion.value + sacudir.value * 4}deg` },
    ],
  }));

  const estiloBanio = useAnimatedStyle(() => ({
    opacity: brilloBanio.value,
  }));

  const estiloSueno = useAnimatedStyle(() => ({
    opacity: somnolencia.value,
  }));

  const estiloZzz = useAnimatedStyle(() => ({
    opacity: somnolencia.value > 0.05 ? interpolate(somnolencia.value, [0, 0.35], [0, 1]) : 0,
    transform: [{ translateY: -somnolencia.value * 28 }, { translateX: somnolencia.value * 12 }],
  }));

  const borde =
    animo === 'decaido' ? colors.danger : animo === 'aburrido' ? colors.warning : colors.success;

  return (
    <View style={[styles.escena, { width: tamano + 24, height: tamano + 36 }]}>
      <Animated.Text style={[styles.zzz, { color: colors.textMuted }, estiloZzz]}>zzz</Animated.Text>

      <Animated.View style={[styles.contenedor, estilo]}>
        <View
          style={[
            styles.marco,
            {
              width: tamano,
              height: tamano,
              borderRadius: tamano / 2,
              borderColor: borde,
              backgroundColor: colors.surface,
            },
          ]}
        >
          {avatarPath ? (
            <Image
              source={{ uri: rhMediaUrl(avatarPath) }}
              style={{ width: tamano - 8, height: tamano - 8, borderRadius: (tamano - 8) / 2 }}
              contentFit="cover"
              transition={260}
            />
          ) : (
            <Text style={{ fontSize: tamano * 0.5 }}>{EMOJI_ESPECIE[especie] ?? '🐾'}</Text>
          )}

          <Animated.View
            pointerEvents="none"
            style={[
              StyleSheet.absoluteFill,
              styles.overlayBanio,
              { borderRadius: tamano / 2 },
              estiloBanio,
            ]}
          />
          <Animated.View
            pointerEvents="none"
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: '#0a1628', borderRadius: tamano / 2 },
              estiloSueno,
            ]}
          />
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  escena: { alignItems: 'center', justifyContent: 'center' },
  contenedor: { alignItems: 'center', justifyContent: 'center' },
  marco: { borderWidth: 3, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  overlayBanio: { backgroundColor: 'rgba(80, 180, 255, 0.45)' },
  zzz: {
    position: 'absolute',
    top: 4,
    right: 8,
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 1,
  },
});
