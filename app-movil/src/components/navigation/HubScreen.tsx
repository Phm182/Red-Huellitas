import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { hubPorKey } from '../../navigation/hubs';
import { elevation, radii } from '../../theme/elevation';
import { centeredContent } from '../../theme/layout';
import { fonts, type } from '../../theme/typography';
import { useTheme } from '../../theme/ThemeProvider';
import { hapticLeve } from '../../utils/haptics';
import { Atmosphere } from '../Atmosphere';

type Props = {
  hubKey: string;
  /** Bajada de una línea que explica de qué se trata el hub. */
  descripcion: string;
};

/**
 * Pantalla de un hub: la grilla de sus sub-funciones.
 *
 * Los ítems salen de `hubs.ts`, el mismo lugar del que come el menú de
 * mantener apretado — la grilla y el atajo muestran siempre lo mismo.
 */
export function HubScreen({ hubKey, descripcion }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const hub = hubPorKey(hubKey);

  if (!hub) return null;

  return (
    <Atmosphere>
      <ScrollView contentContainerStyle={[styles.contenedor, centeredContent]} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInDown.springify().damping(18)} style={styles.encabezado}>
          <View style={[styles.icono, { backgroundColor: colors.primarySoft }]}>
            <Ionicons name={hub.iconActive} size={26} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[type.title, { color: colors.text }]}>{t(hub.labelKey)}</Text>
            <Text style={[type.bodySm, { color: colors.textMuted }]}>{descripcion}</Text>
          </View>
        </Animated.View>

        <View style={styles.grilla}>
          {hub.items.map((item, i) => (
            <Animated.View
              key={item.key}
              entering={FadeInDown.delay(40 + i * 35).springify()}
              style={styles.celda}
            >
              <Pressable
                onPress={() => {
                  hapticLeve();
                  router.push(item.route as never);
                }}
                style={[
                  styles.tile,
                  elevation.sm,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                ]}
              >
                <View style={[styles.tileIcono, { backgroundColor: colors.accentSoft }]}>
                  <Ionicons name={item.icon} size={22} color={colors.accent} />
                </View>
                <Text style={[styles.tileLabel, { color: colors.text }]} numberOfLines={2}>
                  {t(item.labelKey)}
                </Text>
              </Pressable>
            </Animated.View>
          ))}
        </View>

        <Text style={[type.caption, styles.pista, { color: colors.textMuted }]}>{t('nav.atajosHint')}</Text>
      </ScrollView>
    </Atmosphere>
  );
}

const styles = StyleSheet.create({
  contenedor: { flexGrow: 1, padding: 16, paddingBottom: 40 },
  encabezado: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 20 },
  icono: { width: 56, height: 56, borderRadius: radii.lg, alignItems: 'center', justifyContent: 'center' },
  grilla: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  celda: { width: '31%', flexGrow: 1, minWidth: '30%', maxWidth: '32%' },
  tile: {
    borderWidth: 1,
    borderRadius: radii.lg,
    paddingVertical: 14,
    paddingHorizontal: 10,
    alignItems: 'center',
    gap: 8,
    minHeight: 108,
  },
  tileIcono: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  tileLabel: { fontFamily: fonts.bodySemi, fontSize: 12, textAlign: 'center' },
  pista: { textAlign: 'center', marginTop: 22 },
});
