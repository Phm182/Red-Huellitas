import { router, usePathname } from 'expo-router';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { APP_TAB_BAR_HEIGHT } from '../../navigation/chrome';
import { Fab } from '../ui/Fab';

type Props = {
  columnWidth: number;
  columnLeft: number;
  tabBarVisible: boolean;
};

/** FAB global para crear una publicación (abajo a la derecha). */
export function PublishFab({ columnWidth, columnLeft, tabBarVisible }: Props) {
  const { t } = useTranslation();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();

  if (
    pathname.includes('/publicaciones/nueva') ||
    pathname.includes('/historias/nueva') ||
    pathname.includes('/historias/ver') ||
    pathname.includes('/nueva_video') ||
    pathname.includes('/shorts')
  ) {
    return null;
  }

  const bottom =
    (tabBarVisible ? APP_TAB_BAR_HEIGHT + Math.max(insets.bottom - 8, 0) : Math.max(insets.bottom, 8)) + 16;

  const hostStyle =
    Platform.OS === 'web'
      ? { position: 'fixed' as const, left: columnLeft, width: columnWidth, top: 0, bottom: 0 }
      : { position: 'absolute' as const, left: 0, right: 0, top: 0, bottom: 0 };

  return (
    <View pointerEvents="box-none" style={[styles.host, hostStyle]}>
      <Fab
        icon="add"
        accessibilityLabel={t('feed.createTitle')}
        onPress={() => router.push('/(app)/publicaciones/nueva')}
        style={{ bottom, right: 20 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    zIndex: 35,
  },
});
