import { Ionicons } from '@expo/vector-icons';
import { router, usePathname } from 'expo-router';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Image, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../auth/AuthProvider';
import { APP_HEADER_HEIGHT, isAppTabRoot, tabIconForPath } from '../../navigation/chrome';
import { pushUnica } from '../../navigation/pushUnica';
import { titleForPath } from '../../navigation/routeTitles';
import { useTituloHeader } from '../../navigation/tituloHeaderStore';
import { fonts, type } from '../../theme/typography';
import { useTheme } from '../../theme/ThemeProvider';
import { useAvatarDisplay } from '../../utils/avatarDisplayStore';
import { rhAvatarUrl } from '../../utils/media';
import { LogoImage } from '../LogoImage';
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
  // El título que pone la pantalla (p. ej. el nombre de la mascota) gana sobre
  // el deducido de la ruta, que no puede saberlo.
  const tituloPantalla = useTituloHeader(pathname);
  const title = tituloPantalla ?? titleForPath(pathname, t);
  // Ícono del hub en raíz y en rutas hijas (p. ej. /juego/[id] también lleva joystick).
  const tabIcon = tabIconForPath(pathname);
  const [switcherOpen, setSwitcherOpen] = useState(false);

  const displayName = user?.username
    ? `@${user.username}`
    : user?.nombreCompleto?.split(' ')[0] || t('perfil.myProfile');

  const irInicio = () => {
    router.replace('/(app)/(tabs)');
  };

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
              <Ionicons name={tabIcon} size={20} color={colors.primary} style={styles.tabIcon} />
            ) : null}

            <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>
              {title}
            </Text>
          </View>

          <Pressable
            onPress={irInicio}
            style={styles.logoCenter}
            hitSlop={6}
            accessibilityRole="button"
            accessibilityLabel={t('nav.huelligram')}
          >
            <LogoImage variant="icon" style={styles.logoIcon} />
          </Pressable>

          <View style={styles.right}>
            <Pressable
              onPress={() => setSwitcherOpen(true)}
              style={styles.userBtn}
              accessibilityRole="button"
              accessibilityLabel={t('home.switchAccountTitle')}
            >
              <Text
                style={[styles.userName, { color: colors.text }]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.75}
              >
                {displayName}
              </Text>
              <Ionicons name="chevron-down" size={14} color={colors.textMuted} />
            </Pressable>

            <Pressable
              onPress={() => pushUnica(pathname, '/(app)/configuracion')}
              style={styles.configBtn}
              hitSlop={6}
              accessibilityRole="button"
              accessibilityLabel={t('nav.configuracion')}
            >
              <Ionicons name="settings-outline" size={20} color={colors.textMuted} />
            </Pressable>

            <Pressable
              onPress={() => pushUnica(pathname, '/(app)/perfil')}
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
    paddingLeft: 8,
    paddingRight: 8,
    paddingVertical: 4,
    gap: 4,
  },
  left: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  logoCenter: {
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    width: 54,
  },
  logoIcon: {
    width: 54,
    height: 54,
  },
  backBtn: {
    width: 32,
    height: 44,
    marginLeft: -4,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  tabIcon: {
    marginTop: 1,
    flexShrink: 0,
  },
  title: {
    flex: 1,
    flexShrink: 1,
    textAlign: 'left',
    fontFamily: fonts.displaySemi,
    fontSize: 15,
    lineHeight: 18,
  },
  right: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 6,
  },
  userBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    flexShrink: 1,
    minWidth: 0,
    maxWidth: '100%',
    paddingVertical: 6,
    paddingHorizontal: 2,
  },
  userName: {
    ...type.label,
    fontSize: 13,
    flexShrink: 1,
  },
  configBtn: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatarBtn: {
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    flexShrink: 0,
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
