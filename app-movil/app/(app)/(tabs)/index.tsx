import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LayoutChangeEvent, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
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
import { MAX_CONTENT_WIDTH } from '../../../src/theme/layout';
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

const UMBRAL = 0.28;

/**
 * Huelligram: Huellitas arriba y tres solapas con swipe horizontal animado.
 *
 * El ancho de cada página debe ser el de la columna de AppChrome (≤480), no
 * el de la ventana: si no, en web el feed queda centrado fuera del clip.
 */
export default function HuelligramScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { width: windowWidth } = useWindowDimensions();
  const params = useLocalSearchParams<{ solapa?: string }>();
  const [indice, setIndice] = useState(0);
  const [montadas, setMontadas] = useState<Record<number, boolean>>({ 0: true, 1: true, 2: true });
  const [ancho, setAncho] = useState(() => Math.min(windowWidth, MAX_CONTENT_WIDTH));
  const indiceRef = useRef(0);
  const offset = useSharedValue(0);
  const arrastre = useSharedValue(0);
  const anchoSV = useSharedValue(Math.min(windowWidth, MAX_CONTENT_WIDTH));

  const onCuerpoLayout = useCallback(
    (e: LayoutChangeEvent) => {
      const w = Math.round(e.nativeEvent.layout.width);
      if (w <= 0 || w === ancho) return;
      setAncho(w);
      anchoSV.value = w;
      offset.value = -indiceRef.current * w;
    },
    [ancho, anchoSV, offset]
  );

  const aplicarIndice = useCallback(
    (i: number, animar: boolean) => {
      const clamped = Math.max(0, Math.min(SOLAPAS.length - 1, i));
      const cambio = clamped !== indiceRef.current;
      indiceRef.current = clamped;
      setIndice(clamped);
      setMontadas((prev) => {
        const next = { ...prev, [clamped]: true };
        if (clamped > 0) next[clamped - 1] = true;
        if (clamped < SOLAPAS.length - 1) next[clamped + 1] = true;
        return next;
      });
      const w = anchoSV.value;
      if (animar) {
        offset.value = withSpring(-clamped * w, { damping: 22, stiffness: 220, mass: 0.9 });
      } else if (cambio) {
        offset.value = -clamped * w;
      }
      const key = SOLAPAS[clamped].key;
      if (params.solapa !== key) {
        router.setParams({ solapa: key });
      }
    },
    [offset, params.solapa, anchoSV]
  );

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
    .activeOffsetX([-48, 48])
    .failOffsetY([-10, 10])
    .onUpdate((e) => {
      const i = indiceRef.current;
      const w = anchoSV.value;
      const base = -i * w;
      const next = base + e.translationX;
      const min = -(SOLAPAS.length - 1) * w;
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
      const w = anchoSV.value;
      const recorrido = e.translationX / w;
      let destino = i;
      if (recorrido < -UMBRAL || e.velocityX < -700) {
        destino = i + 1;
      } else if (recorrido > UMBRAL || e.velocityX > 700) {
        destino = i - 1;
      }
      destino = Math.max(0, Math.min(SOLAPAS.length - 1, destino));
      const visual = -i * w + arrastre.value;
      arrastre.value = 0;
      offset.value = visual;
      offset.value = withSpring(-destino * w, { damping: 22, stiffness: 220, mass: 0.9 });
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
        <View style={styles.cuerpo} onLayout={onCuerpoLayout}>
          <Animated.View style={[styles.track, { width: ancho * SOLAPAS.length }, estiloTrack]}>
            <View style={[styles.pagina, { width: ancho }]} collapsable={false}>
              {montadas[0] ? <PublicacionesBody /> : null}
            </View>
            <View style={[styles.pagina, { width: ancho }]} collapsable={false}>
              {montadas[1] ? <NoticiasBody /> : null}
            </View>
            <View style={[styles.pagina, { width: ancho }]} collapsable={false}>
              {montadas[2] ? <HuetubeBody alturaExtra={HUELLIGRAM_HEADER_HEIGHT} /> : null}
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
  cuerpo: { flex: 1, overflow: 'hidden', width: '100%' },
  track: { flex: 1, flexDirection: 'row' },
  pagina: { flex: 1, height: '100%', overflow: 'hidden' },
});
