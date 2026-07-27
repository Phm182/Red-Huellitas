import { Ionicons } from '@expo/vector-icons';
import { router, useGlobalSearchParams, usePathname } from 'expo-router';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useContadores } from '../../hooks/useContadores';
import { accionCrearPara } from '../../navigation/accionCrear';
import { APP_TAB_BAR_HEIGHT, chromeForPath } from '../../navigation/chrome';
import { elevation, radii } from '../../theme/elevation';
import { fonts } from '../../theme/typography';
import { useTheme } from '../../theme/ThemeProvider';
import { hapticLeve } from '../../utils/haptics';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/** Diámetro de los flotantes secundarios. */
const TAM = 42;
/** El de publicar es el principal, apenas más grande. */
const TAM_PRINCIPAL = 48;

type BotonProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  /** Número en la burbuja; 0 o undefined no dibuja nada. */
  badge?: number;
  principal?: boolean;
};

function BotonFlotante({ icon, label, onPress, badge, principal }: BotonProps) {
  const { colors } = useTheme();
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const tam = principal ? TAM_PRINCIPAL : TAM;

  return (
    <View>
      <AnimatedPressable
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={() => {
          hapticLeve();
          onPress();
        }}
        onPressIn={() => {
          scale.value = withSpring(0.9, { damping: 18, stiffness: 340 });
        }}
        onPressOut={() => {
          scale.value = withSpring(1, { damping: 12, stiffness: 220 });
        }}
        style={[
          styles.boton,
          principal ? elevation.md : elevation.sm,
          {
            width: tam,
            height: tam,
            borderRadius: tam / 2,
            backgroundColor: principal ? colors.primary : colors.surface,
            borderColor: principal ? 'transparent' : colors.border,
          },
          animStyle,
        ]}
      >
        <Ionicons
          name={icon}
          size={principal ? 22 : 19}
          color={principal ? colors.primaryText : colors.text}
        />
      </AnimatedPressable>

      {badge && badge > 0 ? (
        <View style={[styles.badge, { backgroundColor: colors.danger, borderColor: colors.background }]}>
          <Text style={styles.badgeTexto} numberOfLines={1}>
            {badge > 99 ? '99+' : badge}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

type Props = {
  columnWidth: number;
  columnLeft: number;
  tabBarVisible: boolean;
};

/**
 * Columna de flotantes abajo a la derecha: publicar, mis animales, chat y
 * notificaciones, uno arriba del otro.
 *
 * Antes el de publicar era un botón de 58px solo en la esquina. Al sumarle
 * tres más había que elegir: cuatro botones grandes tapan la pantalla. Por eso
 * son chicos (42px, el de publicar 48) y los secundarios van en color de
 * superficie con borde, no en el color de marca — así se leen como
 * herramientas y no compiten con el contenido.
 *
 * Se apagan enteros donde el contenido manda: Huellitas, fotos, videos y las
 * pantallas de crear (ver `chromeForPath`).
 */
export function FloatingDock({ columnWidth, columnLeft, tabBarVisible }: Props) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const chrome = chromeForPath(pathname);
  // El hook va antes del early return: los hooks no pueden ser condicionales.
  const { contadores } = useContadores();
  // useGlobalSearchParams (y no useLocalSearchParams) porque el dock vive
  // fuera de la pantalla: necesita los params de la ruta activa, no los suyos.
  const { solapa } = useGlobalSearchParams<{ solapa?: string }>();
  const crear = accionCrearPara(pathname, solapa);

  if (!chrome.dock) return null;

  const bottom =
    (tabBarVisible ? APP_TAB_BAR_HEIGHT + Math.max(insets.bottom - 8, 0) : Math.max(insets.bottom, 8)) + 14;

  const hostStyle =
    Platform.OS === 'web'
      ? { position: 'fixed' as const, left: columnLeft, width: columnWidth, top: 0, bottom: 0 }
      : { position: 'absolute' as const, left: 0, right: 0, top: 0, bottom: 0 };

  return (
    <View pointerEvents="box-none" style={[styles.host, hostStyle]}>
      <View style={[styles.columna, { bottom, right: 14 }]} pointerEvents="box-none">
        <BotonFlotante
          icon="notifications-outline"
          label={t('notificaciones.titulo')}
          badge={contadores.notificaciones}
          onPress={() => router.push('/(app)/notificaciones' as never)}
        />
        <BotonFlotante
          icon="chatbubble-ellipses-outline"
          label={t('chat.titulo')}
          badge={contadores.mensajes + contadores.solicitudesChat}
          onPress={() => router.push('/(app)/chat' as never)}
        />
        <BotonFlotante
          icon="paw-outline"
          label={t('mascotas.title')}
          badge={contadores.mascotas}
          onPress={() => router.push('/(app)/mascotas' as never)}
        />
        {/* El `+` es contextual: en Mis Mascotas crea una mascota, en Adopción
            una publicación de adopción. Un solo botón de crear, siempre en el
            mismo lugar, haciendo lo que la pantalla dice. */}
        <BotonFlotante
          icon={crear.icon}
          label={t(crear.labelKey)}
          onPress={() => router.push(crear.route as never)}
          principal
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  host: { zIndex: 35 },
  columna: { position: 'absolute', alignItems: 'center', gap: 10 },
  boton: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  badge: {
    position: 'absolute',
    top: -3,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: radii.pill,
    borderWidth: 1.5,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeTexto: { color: '#fff', fontFamily: fonts.bodyBold, fontSize: 10 },
});
