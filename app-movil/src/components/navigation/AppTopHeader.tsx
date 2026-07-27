import { Ionicons } from '@expo/vector-icons';
import { router, usePathname } from 'expo-router';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Image, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../auth/AuthProvider';
import { APP_HEADER_HEIGHT, isAppTabRoot, tabIconForPath } from '../../navigation/chrome';
import { titleForPath } from '../../navigation/routeTitles';
import { fonts, type } from '../../theme/typography';
import { useTheme } from '../../theme/ThemeProvider';
import { useAvatarDisplay } from '../../utils/avatarDisplayStore';
import { rhAvatarUrl } from '../../utils/media';
import { AccountSwitcherModal } from './AccountSwitcherModal';

type Props = {
  columnWidth: number;
  columnLeft: number;
};

export function AppTopHeader({ columnWidth, columnLeft }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { user, avatarBust } = useAuth();
  const avatarDisplay = useAvatarDisplay();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const tabRoot = isAppTabRoot(pathname);
  const title = titleForPath(pathname, t);
  // Ícono del hub en raíz y en rutas hijas (p. ej. /juego/[id] también lleva joystick).
  const tabIcon = tabIconForPath(pathname);
  const [switcherOpen, setSwitcherOpen] = useState(false);

  const displayName = user?.username
    ? `@${user.username}`
    : user?.nombreCompleto?.split(' ')[0] || t('perfil.myProfile');

  const positionStyle =
    Platform.OS === 'web'
      ? { position: 'fixed' as const, left: columnLeft, width: columnWidth }
      : { position: 'absolute' as const, left: 0, right: 0 };

  return (
    <>
      <View
        pointerEvents="box-none"
        style={[
          styles.wrap,
          positionStyle,
          {
            top: 0,
            paddingTop: insets.top,
            backgroundColor: colors.surface,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <View style={[styles.row, { height: APP_HEADER_HEIGHT }]}>
          <View style={styles.left}>
            {tabRoot ? null : (
              <Pressable
                onPress={() => {
                  if (router.canGoBack()) router.back();
                  else router.replace('/(app)/(tabs)');
                }}
                style={styles.backBtn}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Volver"
              >
                <Ionicons name="chevron-back" size={26} color={colors.text} />
              </Pressable>
            )}

            {tabIcon ? (
              <Ionicons name={tabIcon} size={22} color={colors.primary} style={styles.tabIcon} />
            ) : null}

            <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
              {title}
            </Text>
          </View>

          <View style={styles.right}>
            {/* La configuración salió de la barra inferior: no es navegación,
                es una salida. Acá está siempre a mano sin gastar un lugar de
                los 6 hubs. */}
            <Pressable
              onPress={() => router.push('/(app)/configuracion' as never)}
              style={styles.iconBtn}
              hitSlop={6}
              accessibilityRole="button"
              accessibilityLabel={t('nav.configuracion')}
            >
              <Ionicons name="settings-outline" size={21} color={colors.textMuted} />
            </Pressable>

            <Pressable
              onPress={() => setSwitcherOpen(true)}
              style={styles.userBtn}
              accessibilityRole="button"
              accessibilityLabel={t('home.switchAccountTitle')}
            >
              <Text style={[styles.userName, { color: colors.text }]} numberOfLines={1}>
                {displayName}
              </Text>
              <Ionicons name="chevron-down" size={14} color={colors.textMuted} />
            </Pressable>

            <Pressable
              onPress={() => router.push('/(app)/perfil')}
              style={[styles.avatarBtn, { borderColor: colors.border }]}
              accessibilityRole="button"
              accessibilityLabel={t('perfil.myProfile')}
            >
              {avatarDisplay.uri || user?.avatarPath ? (
                <Image
                  key={`hdr-av-${avatarDisplay.version}-${avatarBust}`}
                  source={{
                    uri:
                      avatarDisplay.uri ||
                      rhAvatarUrl(user!.avatarPath!, avatarBust),
                  }}
                  style={styles.avatar}
                  resizeMode="cover"
                />
              ) : (
                <View style={[styles.avatar, { backgroundColor: colors.primarySoft }]}>
                  <Ionicons name="person" size={16} color={colors.primary} />
                </View>
              )}
            </Pressable>
          </View>
        </View>
      </View>

      <AccountSwitcherModal visible={switcherOpen} onClose={() => setSwitcherOpen(false)} />
    </>
  );
}

const styles = StyleSheet.create({
  wrap: {
    zIndex: 40,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 12,
    paddingRight: 8,
    gap: 8,
  },
  left: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  backBtn: {
    width: 36,
    height: 44,
    marginLeft: -8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabIcon: {
    marginTop: 1,
  },
  title: {
    flexShrink: 1,
    textAlign: 'left',
    fontFamily: fonts.displaySemi,
    fontSize: 17,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
  },
  iconBtn: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    maxWidth: 120,
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  userName: {
    ...type.label,
    fontSize: 13,
    flexShrink: 1,
  },
  avatarBtn: {
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
