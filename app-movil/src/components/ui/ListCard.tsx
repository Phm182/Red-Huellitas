import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import React, { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import Animated, { FadeInDown, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { elevation, radii } from '../../theme/elevation';
import { type } from '../../theme/typography';
import { useTheme } from '../../theme/ThemeProvider';
import { MediaLightbox } from '../MediaLightbox';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/** Si el dedo se movió más que esto, no es un tap (p. ej. swipe de solapa). */
const MAX_MOVE = 12;

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
 * Tap en la foto abre visor a pantalla completa; el press de la card
 * se ignora si el gesto fue un deslizamiento (cambio de solapa).
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
  const startX = useRef(0);
  const startY = useRef(0);
  const moved = useRef(false);
  const [lightbox, setLightbox] = useState(false);

  const cuerpo = (
    <>
      {fotoUri ? (
        <Pressable
          onPress={() => setLightbox(true)}
          hitSlop={4}
        >
          <Image
            source={{ uri: fotoUri }}
            style={styles.foto}
            contentFit="cover"
            transition={220}
          />
        </Pressable>
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

  const entrada = FadeInDown.delay(Math.min(index, 8) * 45).springify();

  const lightboxNode = fotoUri ? (
    <MediaLightbox
      visible={lightbox}
      uris={[fotoUri]}
      onClose={() => setLightbox(false)}
    />
  ) : null;

  if (!onPress) {
    return (
      <>
        <Animated.View entering={entrada} style={estiloTarjeta}>
          {cuerpo}
        </Animated.View>
        {lightboxNode}
      </>
    );
  }

  return (
    <>
      <Animated.View entering={entrada}>
        <AnimatedPressable
          onPress={() => {
            if (moved.current) return;
            onPress();
          }}
          onPressIn={(e) => {
            startX.current = e.nativeEvent.pageX;
            startY.current = e.nativeEvent.pageY;
            moved.current = false;
            scale.value = withSpring(0.98, { damping: 18, stiffness: 340 });
          }}
          onPressOut={(e) => {
            const dx = Math.abs(e.nativeEvent.pageX - startX.current);
            const dy = Math.abs(e.nativeEvent.pageY - startY.current);
            if (dx > MAX_MOVE || dy > MAX_MOVE) moved.current = true;
            scale.value = withSpring(1, { damping: 14, stiffness: 240 });
          }}
          style={[estiloTarjeta, animStyle]}
        >
          {cuerpo}
        </AnimatedPressable>
      </Animated.View>
      {lightboxNode}
    </>
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
