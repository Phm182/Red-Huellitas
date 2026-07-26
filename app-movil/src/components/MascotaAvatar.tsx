import { Image } from 'expo-image';
import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { JuegoAnimo } from '../types';
import { useTheme } from '../theme/ThemeProvider';
import { rhMediaUrl } from '../utils/media';

interface Props {
  avatarPath: string | null;
  animo: JuegoAnimo;
  especie: string;
  tamano?: number;
  /** Se incrementa desde afuera para disparar el rebote de una acción. */
  celebrar?: number;
}

const EMOJI_ESPECIE: Record<string, string> = { perro: '🐶', gato: '🐱', otro: '🐾' };

/**
 * La mascota en pantalla. Un solo lugar en todo el proyecto decide si se
 * muestra el avatar generado (Fase 7b, cuando exista) o la foto real que el
 * usuario ya subió — el backend resuelve eso en `avatarPath`.
 *
 * La animación acompaña el ánimo: respira siempre, más lento y ladeada cuando
 * está decaída. Nunca hay estados de enfermedad ni de muerte.
 */
export function MascotaAvatar({ avatarPath, animo, especie, tamano = 160, celebrar = 0 }: Props) {
  const { colors } = useTheme();

  const escala = useSharedValue(1);
  const rebote = useSharedValue(0);
  const inclinacion = useSharedValue(0);

  // Respiración continua: más lenta y sutil cuanto peor está el ánimo.
  useEffect(() => {
    const duracion = animo === 'decaido' ? 2600 : animo === 'aburrido' ? 2000 : 1400;
    const amplitud = animo === 'decaido' ? 1.015 : 1.04;

    escala.value = withRepeat(
      withSequence(
        withTiming(amplitud, { duration: duracion, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: duracion, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );

    inclinacion.value = withTiming(animo === 'decaido' ? 6 : 0, { duration: 600 });
  }, [animo, escala, inclinacion]);

  // Rebote puntual cuando el usuario hace una acción.
  useEffect(() => {
    if (celebrar === 0) return;
    rebote.value = withSequence(
      withTiming(-18, { duration: 180, easing: Easing.out(Easing.quad) }),
      withTiming(0, { duration: 320, easing: Easing.bounce })
    );
  }, [celebrar, rebote]);

  const estilo = useAnimatedStyle(() => ({
    transform: [
      { translateY: rebote.value },
      { scale: escala.value },
      { rotate: `${inclinacion.value}deg` },
    ],
  }));

  const borde = animo === 'decaido' ? colors.danger : animo === 'aburrido' ? colors.warning : colors.success;

  return (
    <Animated.View style={[styles.contenedor, estilo]}>
      <View
        style={[
          styles.marco,
          { width: tamano, height: tamano, borderRadius: tamano / 2, borderColor: borde, backgroundColor: colors.surface },
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
          // Sin foto cargada: emoji según la especie, para que el juego se
          // pueda usar igual.
          <Text style={{ fontSize: tamano * 0.5 }}>{EMOJI_ESPECIE[especie] ?? '🐾'}</Text>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  contenedor: { alignItems: 'center', justifyContent: 'center' },
  marco: { borderWidth: 3, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
});
