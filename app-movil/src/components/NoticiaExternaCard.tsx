import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import React, { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { NoticiaExterna } from '../types';
import { elevation, radii } from '../theme/elevation';
import { type } from '../theme/typography';
import { useTheme } from '../theme/ThemeProvider';
import { openExternalUrl } from '../utils/openExternalUrl';
import { Badge } from './ui/Badge';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface NoticiaExternaCardProps {
  noticia: NoticiaExterna;
  index?: number;
}

/** Umbral: si el dedo se movió más que esto, no es un tap (es swipe de solapa). */
const MAX_MOVE = 12;

/**
 * Card de noticia externa. Solo abre el link si el gesto fue un tap limpio
 * (no un deslizamiento horizontal de cambio de solapa).
 */
export function NoticiaExternaCard({ noticia, index = 0 }: NoticiaExternaCardProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const startX = useRef(0);
  const startY = useRef(0);
  const moved = useRef(false);

  const abrir = () => {
    if (moved.current) return;
    void openExternalUrl(noticia.urlOriginal);
  };

  return (
    <Animated.View entering={FadeInDown.delay(Math.min(index, 8) * 45).springify()}>
      <AnimatedPressable
        onPressIn={(e) => {
          startX.current = e.nativeEvent.pageX;
          startY.current = e.nativeEvent.pageY;
          moved.current = false;
          scale.value = withSpring(0.985, { damping: 18, stiffness: 340 });
        }}
        onPressOut={(e) => {
          const dx = Math.abs(e.nativeEvent.pageX - startX.current);
          const dy = Math.abs(e.nativeEvent.pageY - startY.current);
          if (dx > MAX_MOVE || dy > MAX_MOVE) moved.current = true;
          scale.value = withSpring(1, { damping: 14, stiffness: 240 });
        }}
        onPress={abrir}
        style={[
          styles.card,
          elevation.sm,
          { backgroundColor: colors.surface, borderColor: colors.border },
          animStyle,
        ]}
      >
        {noticia.imagenUrl ? (
          <Image
            source={{ uri: noticia.imagenUrl }}
            style={styles.imagen}
            contentFit="cover"
            transition={260}
          />
        ) : null}

        <View style={styles.body}>
          <Badge label={noticia.fuente.toUpperCase()} tono="accent" style={{ marginBottom: 8 }} />

          <Text style={[type.section, { color: colors.text, fontSize: 16, lineHeight: 22 }]}>
            {noticia.titulo}
          </Text>

          {noticia.resumen ? (
            <Text style={[type.bodySm, { color: colors.textMuted, marginTop: 6 }]} numberOfLines={3}>
              {noticia.resumen}
            </Text>
          ) : null}

          <View style={styles.leerMas}>
            <Text style={[type.label, { color: colors.primary }]}>{t('noticias.readMore')}</Text>
            <Ionicons name="open-outline" size={14} color={colors.primary} />
          </View>
        </View>
      </AnimatedPressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: radii.lg, marginBottom: 16, overflow: 'hidden' },
  imagen: { width: '100%', height: 180 },
  body: { padding: 14 },
  leerMas: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 12 },
});
