import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Dimensions, Pressable, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { Atmosphere } from '../../../src/components/Atmosphere';
import { HistoriasBar } from '../../../src/components/HistoriasBar';
import { HuetubeBody } from '../../../src/screens/huelligram/HuetubeBody';
import { NoticiasBody } from '../../../src/screens/huelligram/NoticiasBody';
import { PublicacionesBody } from '../../../src/screens/huelligram/PublicacionesBody';
import { fonts } from '../../../src/theme/typography';
import { useTheme } from '../../../src/theme/ThemeProvider';
import { hapticLeve } from '../../../src/utils/haptics';

type Solapa = 'publicaciones' | 'noticias' | 'huetube';

const SOLAPAS: { key: Solapa; labelKey: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'publicaciones', labelKey: 'huelligram.publicaciones', icon: 'images-outline' },
  { key: 'noticias', labelKey: 'huelligram.noticias', icon: 'newspaper-outline' },
  { key: 'huetube', labelKey: 'huelligram.huetube', icon: 'play-circle-outline' },
];

/** Alto del bloque fijo (Huellitas + solapas), para que Huetube calcule bien. */
export const HUELLIGRAM_HEADER_HEIGHT = 154;

const ANCHO = Dimensions.get('window').width;
const UMBRAL = 0.22;

/**
 * Huelligram: Huellitas arriba y tres solapas con swipe horizontal animado.
 */
export default function HuelligramScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const params = useLocalSearchParams<{ solapa?: string }>();
  const [indice, setIndice] = useState(0);
  const indiceRef = useRef(0);
  const offset = useSharedValue(0);
  const arrastre = useSharedValue(0);

  const aplicarIndice = useCallback((i: number, animar: boolean) => {
    const clamped = Math.max(0, Math.min(SOLAPAS.length - 1, i));
    const cambio = clamped !== indiceRef.current;
    indiceRef.current = clamped;
    setIndice(clamped);
    if (animar) {
      offset.value = withSpring(-clamped * ANCHO, { damping: 22, stiffness: 220, mass: 0.9 });
    } else if (cambio) {
      offset.value = -clamped * ANCHO;
    }
    const key = SOLAPAS[clamped].key;
    if (params.solapa !== key) {
      router.setParams({ solapa: key });
    }
  }, [offset, params.solapa]);

  useEffect(() => {
    const pedida = params.solapa;
    const i = SOLAPAS.findIndex((s) => s.key === pedida);
    if (i >= 0 && i !== indiceRef.current) {
      aplicarIndice(i, false);
    }
  }, [params.solapa, aplicarIndice]);

  const alCambiarPorGesto = useCallback(
    (destino: number) => {
      hapticLeve();
      aplicarIndice(destino, false);
    },
    [aplicarIndice]
  );

  const gesto = Gesture.Pan()
    .activeOffsetX([-18, 18])
    .failOffsetY([-14, 14])
    .onUpdate((e) => {
      const i = indiceRef.current;
      const base = -i * ANCHO;
      const next = base + e.translationX;
      const min = -(SOLAPAS.length - 1) * ANCHO;
      if (next > 0) {
        arrastre.value = next * 0.35 - base;
      } else if (next < min) {
        arrastre.value = min + (next - min) * 0.35 - base;
      } else {
        arrastre.value = e.translationX;
      }
    })
    .onEnd((e) => {
      const i = indiceRef.current;
      const recorrido = e.translationX / ANCHO;
      let destino = i;
      if (recorrido < -UMBRAL || e.velocityX < -700) {
        destino = i + 1;
      } else if (recorrido > UMBRAL || e.velocityX > 700) {
        destino = i - 1;
      }
      destino = Math.max(0, Math.min(SOLAPAS.length - 1, destino));
      const visual = -i * ANCHO + arrastre.value;
      arrastre.value = 0;
      offset.value = visual;
      offset.value = withSpring(-destino * ANCHO, { damping: 22, stiffness: 220, mass: 0.9 });
      if (destino !== i) {
        runOnJS(alCambiarPorGesto)(destino);
      }
    });

  const estiloTrack = useAnimatedStyle(() => ({
    transform: [{ translateX: offset.value + arrastre.value }],
  }));

  return (
    <Atmosphere>
      <View style={styles.encabezado}>
        <HistoriasBar />

        <View style={[styles.solapas, { borderBottomColor: colors.border }]}>
          {SOLAPAS.map((s, i) => {
            const activa = indice === i;
            return (
              <Pressable
                key={s.key}
                onPress={() => {
                  hapticLeve();
                  aplicarIndice(i, true);
                }}
                style={[styles.solapa, activa && { borderBottomColor: colors.primary }]}
                accessibilityRole="tab"
                accessibilityState={{ selected: activa }}
              >
                <Ionicons
                  name={s.icon}
                  size={16}
                  color={activa ? colors.primary : colors.textMuted}
                />
                <Text
                  style={[styles.solapaLabel, { color: activa ? colors.primary : colors.textMuted }]}
                  numberOfLines={1}
                >
                  {t(s.labelKey)}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <GestureDetector gesture={gesto}>
        <View style={styles.cuerpo}>
          <Animated.View style={[styles.track, { width: ANCHO * SOLAPAS.length }, estiloTrack]}>
            <View style={[styles.pagina, { width: ANCHO }]} collapsable={false}>
              <PublicacionesBody />
            </View>
            <View style={[styles.pagina, { width: ANCHO }]} collapsable={false}>
              <NoticiasBody />
            </View>
            <View style={[styles.pagina, { width: ANCHO }]} collapsable={false}>
              <HuetubeBody alturaExtra={HUELLIGRAM_HEADER_HEIGHT} />
            </View>
          </Animated.View>
        </View>
      </GestureDetector>
    </Atmosphere>
  );
}

const styles = StyleSheet.create({
  encabezado: { paddingTop: 10, paddingHorizontal: 12 },
  solapas: { flexDirection: 'row', borderBottomWidth: StyleSheet.hairlineWidth },
  solapa: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  solapaLabel: { fontFamily: fonts.bodySemi, fontSize: 13 },
  cuerpo: { flex: 1, overflow: 'hidden' },
  track: { flex: 1, flexDirection: 'row' },
  pagina: { height: '100%' },
});
