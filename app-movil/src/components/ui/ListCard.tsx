import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import React from 'react';
import { Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import Animated, { FadeInDown, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { elevation, radii } from '../../theme/elevation';
import { type } from '../../theme/typography';
import { useTheme } from '../../theme/ThemeProvider';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface ListCardProps {
  titulo: string;
  subtitulo?: string | null;
  /** Tercera línea: distancia, fecha, precio. */
  meta?: string | null;
  /** URL completa de la foto. Sin foto se muestra el `iconoFallback`. */
  fotoUri?: string | null;
  iconoFallback?: keyof typeof Ionicons.glyphMap;
  /** Píldora arriba a la derecha: estado, tipo, categoría. */
  badge?: React.ReactNode;
  /** Contenido libre debajo del meta (botones, chips). */
  children?: React.ReactNode;
  onPress?: () => void;
  /** Índice en la lista: escalona la animación de entrada. */
  index?: number;
  style?: ViewStyle;
}

/**
 * Tarjeta de listado: foto + título + subtítulo + meta.
 *
 * El mismo layout estaba duplicado en 17 pantallas con medidas ligeramente
 * distintas en cada una (por eso los listados no se veían iguales entre sí
 * aunque mostraran lo mismo).
 *
 * La foto usa `expo-image` para que aparezca con un fade en vez del salto
 * seco de `<Image>`, y para que no se vuelva a descargar al reentrar.
 */
export function ListCard({
  titulo,
  subtitulo,
  meta,
  fotoUri,
  iconoFallback = 'paw-outline',
  badge,
  children,
  onPress,
  index = 0,
  style,
}: ListCardProps) {
  const { colors } = useTheme();
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const cuerpo = (
    <>
      {fotoUri ? (
        <Image
          source={{ uri: fotoUri }}
          style={styles.foto}
          contentFit="cover"
          transition={220}
        />
      ) : (
        <View style={[styles.foto, styles.fotoVacia, { backgroundColor: colors.accentSoft }]}>
          <Ionicons name={iconoFallback} size={26} color={colors.accent} />
        </View>
      )}

      <View style={styles.textos}>
        <View style={styles.tituloFila}>
          <Text style={[type.section, { color: colors.text, flex: 1 }]} numberOfLines={1}>
            {titulo}
          </Text>
          {badge}
        </View>

        {subtitulo ? (
          <Text style={[type.bodySm, { color: colors.textMuted, marginTop: 2 }]} numberOfLines={2}>
            {subtitulo}
          </Text>
        ) : null}

        {meta ? (
          <Text style={[type.caption, { color: colors.textMuted, marginTop: 4 }]} numberOfLines={1}>
            {meta}
          </Text>
        ) : null}

        {children}
      </View>
    </>
  );

  const estiloTarjeta = [
    styles.card,
    elevation.sm,
    { borderColor: colors.border, backgroundColor: colors.surface },
    style,
  ];

  // Escalona la entrada, pero corta a los 8 elementos: más allá de eso la
  // demora acumulada se nota como lag al scrollear rápido.
  const entrada = FadeInDown.delay(Math.min(index, 8) * 45).springify();

  if (!onPress) {
    return (
      <Animated.View entering={entrada} style={estiloTarjeta}>
        {cuerpo}
      </Animated.View>
    );
  }

  return (
    <Animated.View entering={entrada}>
      <AnimatedPressable
        onPress={onPress}
        onPressIn={() => {
          scale.value = withSpring(0.98, { damping: 18, stiffness: 340 });
        }}
        onPressOut={() => {
          scale.value = withSpring(1, { damping: 14, stiffness: 240 });
        }}
        style={[estiloTarjeta, animStyle]}
      >
        {cuerpo}
      </AnimatedPressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    gap: 12,
    borderWidth: 1,
    borderRadius: radii.md,
    padding: 12,
    marginBottom: 12,
  },
  foto: { width: 68, height: 68, borderRadius: radii.sm },
  fotoVacia: { alignItems: 'center', justifyContent: 'center' },
  textos: { flex: 1, justifyContent: 'center' },
  tituloFila: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
