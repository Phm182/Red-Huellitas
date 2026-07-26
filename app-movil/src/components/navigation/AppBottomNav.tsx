import { Ionicons } from '@expo/vector-icons';
import { router, usePathname } from 'expo-router';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { APP_TAB_BAR_HEIGHT } from '../../navigation/chrome';
import { HUBS, type Hub } from '../../navigation/hubs';
import { radii } from '../../theme/elevation';
import { fonts } from '../../theme/typography';
import { useTheme } from '../../theme/ThemeProvider';
import { hapticMedio } from '../../utils/haptics';
import { NavHubMenu } from './NavHubMenu';

type Props = {
  columnWidth: number;
  columnLeft: number;
};

/**
 * Los 6 hubs. Toque corto entra al hub; mantener apretado abre los atajos a
 * sus sub-funciones sin pasar por la pantalla intermedia.
 *
 * La lista sale de `src/navigation/hubs.ts`, que es también la que dibuja cada
 * pantalla de hub: si viviera acá aparte, se desincronizarían.
 */
export function AppBottomNav({ columnWidth, columnLeft }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const bottomPad = Math.max(insets.bottom, 8);

  const [menu, setMenu] = useState<{ hub: Hub; x: number } | null>(null);

  const positionStyle =
    Platform.OS === 'web'
      ? { position: 'fixed' as const, left: columnLeft, width: columnWidth }
      : { position: 'absolute' as const, left: 0, right: 0 };

  const anchoItem = columnWidth > 0 ? columnWidth / HUBS.length : 0;
  const alturaBarra = APP_TAB_BAR_HEIGHT + bottomPad;

  return (
    <>
      <View
        style={[
          styles.wrap,
          positionStyle,
          {
            bottom: 0,
            paddingBottom: bottomPad,
            backgroundColor: colors.surface,
            borderTopColor: colors.border,
          },
        ]}
      >
        <View style={[styles.row, { height: APP_TAB_BAR_HEIGHT - 8 }]}>
          {HUBS.map((hub, i) => {
            const focused = hub.match(pathname);
            const color = focused ? colors.primary : colors.textMuted;
            return (
              <Pressable
                key={hub.key}
                onPress={() => {
                  // Huelligram es la raíz del stack: `navigate` vuelve a ella
                  // sin apilar copias. Los otros hubs son pantallas normales y
                  // con `navigate` el router actualizaba la URL pero dejaba la
                  // pantalla en display:none — hay que empujarlas.
                  if (hub.key === 'huelligram') router.navigate(hub.route as never);
                  else router.push(hub.route as never);
                }}
                onLongPress={() => {
                  hapticMedio();
                  setMenu({ hub, x: columnLeft + anchoItem * (i + 0.5) });
                }}
                delayLongPress={320}
                style={styles.tab}
                accessibilityRole="button"
                accessibilityState={{ selected: focused }}
                accessibilityHint={t('nav.atajosHint')}
              >
                <View style={[styles.iconWrap, focused && { backgroundColor: colors.primarySoft }]}>
                  <Ionicons name={focused ? hub.iconActive : hub.icon} size={21} color={color} />
                </View>
                <Text style={[styles.label, { color }]} numberOfLines={1}>
                  {t(hub.labelKey)}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <NavHubMenu
        hub={menu?.hub ?? null}
        anclaX={menu?.x ?? 0}
        desdeAbajo={alturaBarra + 8}
        onCerrar={() => setMenu(null)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  wrap: {
    zIndex: 40,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 6,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  iconWrap: {
    width: 38,
    height: 26,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontFamily: fonts.bodySemi,
    fontSize: 10,
  },
});
