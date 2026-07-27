import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
import { Atmosphere } from '../../../src/components/Atmosphere';
import { HistoriasBar } from '../../../src/components/HistoriasBar';
import { HuetubeBody } from '../../../src/screens/huelligram/HuetubeBody';
import { NoticiasBody } from '../../../src/screens/huelligram/NoticiasBody';
import { PublicacionesBody } from '../../../src/screens/huelligram/PublicacionesBody';
import { radii } from '../../../src/theme/elevation';
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

/** Cuánto hay que arrastrar de costado para que cuente como cambio de solapa. */
const UMBRAL_SWIPE = 55;
/** Movimiento mínimo antes de robarle el gesto al scroll de la lista. */
const UMBRAL_GESTO = 14;

/**
 * Huelligram: las Huellitas arriba y, debajo, las tres solapas de contenido.
 *
 * Noticias y Huetube dejaron de ser pestañas de la barra inferior — ese lugar
 * ahora lo ocupan los hubs (Rescate, Tienda, Salud…). Como los tres feeds son
 * "lo que pasa en la comunidad", viven juntos acá.
 */
export default function HuelligramScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const params = useLocalSearchParams<{ solapa?: string }>();
  const [solapa, setSolapa] = useState<Solapa>('publicaciones');

  // La solapa se refleja en la URL para que el botón + del riel sepa qué
  // crear: en Huetube tiene que ofrecer un video, no una publicación.
  const irASolapa = (s: Solapa) => {
    setSolapa(s);
    router.setParams({ solapa: s });
  };

  // El menú de atajos entra directo a una solapa con ?solapa=…
  useEffect(() => {
    const pedida = params.solapa;
    if (pedida === 'publicaciones' || pedida === 'noticias' || pedida === 'huetube') {
      setSolapa(pedida);
    }
  }, [params.solapa]);

  // El PanResponder se crea una sola vez; la solapa actual la lee de un ref
  // para no re-registrar los handlers en cada cambio.
  const solapaRef = useRef(solapa);
  solapaRef.current = solapa;

  const swipe = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        // Sólo reclama el gesto si el movimiento es claramente horizontal: si
        // no, se comería el scroll vertical de las listas.
        onMoveShouldSetPanResponder: (_e, g) =>
          Math.abs(g.dx) > UMBRAL_GESTO && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
        onPanResponderRelease: (_e, g) => {
          if (Math.abs(g.dx) < UMBRAL_SWIPE) return;
          const i = SOLAPAS.findIndex((s) => s.key === solapaRef.current);
          const destino = g.dx < 0 ? i + 1 : i - 1;
          if (destino < 0 || destino >= SOLAPAS.length) return;
          hapticLeve();
          irASolapa(SOLAPAS[destino].key);
        },
      }),
    []
  );

  return (
    <Atmosphere>
      <View style={styles.encabezado}>
        <HistoriasBar />

        <View style={[styles.solapas, { borderBottomColor: colors.border }]}>
          {SOLAPAS.map((s) => {
            const activa = solapa === s.key;
            return (
              <Pressable
                key={s.key}
                onPress={() => {
                  hapticLeve();
                  irASolapa(s.key);
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

      <View style={styles.cuerpo} {...swipe.panHandlers}>
        {solapa === 'publicaciones' ? <PublicacionesBody /> : null}
        {solapa === 'noticias' ? <NoticiasBody /> : null}
        {solapa === 'huetube' ? <HuetubeBody alturaExtra={HUELLIGRAM_HEADER_HEIGHT} /> : null}
      </View>
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
  cuerpo: { flex: 1, borderTopLeftRadius: radii.sm, overflow: 'hidden' },
});
