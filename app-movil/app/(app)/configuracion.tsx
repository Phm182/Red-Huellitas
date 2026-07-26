import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { perfilApi } from '../../src/api/perfilApi';
import { useAuth } from '../../src/auth/AuthProvider';
import { Atmosphere } from '../../src/components/Atmosphere';
import { DenunciaButtonStub } from '../../src/components/DenunciaButtonStub';
import { LanguagePicker } from '../../src/components/LanguagePicker';
import { LogoImage } from '../../src/components/LogoImage';
import { elevation, radii } from '../../src/theme/elevation';
import { centeredContent } from '../../src/theme/layout';
import { fonts, type } from '../../src/theme/typography';
import { ThemePreference, useTheme } from '../../src/theme/ThemeProvider';

const TEMAS: { id: ThemePreference; labelKey: string }[] = [
  { id: 'system', labelKey: 'setup.themeSystem' },
  { id: 'light', labelKey: 'setup.themeLight' },
  { id: 'dark', labelKey: 'setup.themeDark' },
];

type HubItem = {
  key: string;
  labelKey: string;
  route: string;
  icon: keyof typeof Ionicons.glyphMap;
  tint: 'primary' | 'accent';
};

const HUB: HubItem[] = [
  { key: 'mascotas', labelKey: 'mascotas.title', route: '/(app)/mascotas', icon: 'paw', tint: 'primary' },
  { key: 'match', labelKey: 'match.tituloLista', route: '/(app)/match', icon: 'heart', tint: 'primary' },
  { key: 'adopcion', labelKey: 'adopcion.tituloLista', route: '/(app)/adopcion', icon: 'home', tint: 'accent' },
  { key: 'perdidos', labelKey: 'perdidos.tituloLista', route: '/(app)/perdidos', icon: 'search', tint: 'accent' },
  { key: 'campanias', labelKey: 'campanias.tituloLista', route: '/(app)/campanias', icon: 'megaphone', tint: 'primary' },
  { key: 'juego', labelKey: 'juego.titulo', route: '/(app)/juego', icon: 'game-controller', tint: 'accent' },
];

const LINKS: { labelKey: string; route: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { labelKey: 'busqueda.navLabel', route: '/(app)/buscar', icon: 'search-outline' },
  { labelKey: 'perfil.myProfile', route: '/(app)/perfil', icon: 'person-outline' },
  { labelKey: 'transito.tituloLista', route: '/(app)/transito', icon: 'car-outline' },
  { labelKey: 'donaciones.tituloLista', route: '/(app)/donaciones', icon: 'gift-outline' },
  { labelKey: 'veterinarias.tituloLista', route: '/(app)/veterinarias', icon: 'medkit-outline' },
  { labelKey: 'suscripcion.tituloLista', route: '/(app)/suscripcion', icon: 'diamond-outline' },
  { labelKey: 'productos.tituloLista', route: '/(app)/productos', icon: 'storefront-outline' },
  { labelKey: 'carrito.tituloLista', route: '/(app)/carrito', icon: 'cart-outline' },
  { labelKey: 'pedidos.misCompras', route: '/(app)/pedidos/mis-compras', icon: 'bag-handle-outline' },
  { labelKey: 'pedidos.misVentas', route: '/(app)/pedidos/mis-ventas', icon: 'receipt-outline' },
];

export default function MasScreen() {
  const { t } = useTranslation();
  const { colors, preference, setPreference } = useTheme();
  const { user, logout, actualizarUsuario, accounts } = useAuth();
  const [notifBusy, setNotifBusy] = useState(false);

  const onToggleNotificarProximidad = async (valor: boolean) => {
    if (!user || notifBusy) return;
    setNotifBusy(true);
    const res = await perfilApi.guardarNotificacionProximidad(valor);
    setNotifBusy(false);
    if (res.success) {
      actualizarUsuario({ ...user, notificarProximidad: valor });
    }
  };

  const afterLogout = async () => {
    const quedanOtras = accounts.length > 1;
    await logout();
    // logout() ya activa otra cuenta si hay; si no quedaba ninguna, ir al login.
    if (quedanOtras) {
      router.replace('/(app)/(tabs)');
    } else {
      router.replace('/(auth)/login');
    }
  };

  const onLogout = () => {
    const title = t('auth.logoutConfirmTitle');
    const message = t('auth.logoutConfirmMessage');
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.confirm(`${title}\n\n${message}`)) {
        afterLogout();
      }
      return;
    }
    Alert.alert(title, message, [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('auth.logout'),
        style: 'destructive',
        onPress: () => {
          afterLogout();
        },
      },
    ]);
  };

  return (
    <Atmosphere>
      <ScrollView contentContainerStyle={[styles.container, centeredContent]} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInDown.springify()} style={styles.hero}>
          <LinearGradient
            colors={[colors.primarySoft, colors.accentSoft]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.heroCard, elevation.sm]}
          >
            <LogoImage style={styles.logo} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.brand, { color: colors.text }]}>Red Huellitas</Text>
              <Text style={[styles.welcome, { color: colors.textMuted }]}>
                {user ? `@${user.username}` : t('home.welcome')}
              </Text>
            </View>
          </LinearGradient>
        </Animated.View>

        <Text style={[styles.section, { color: colors.text }]}>{t('home.masTabTitle')}</Text>
        <View style={styles.hubGrid}>
          {HUB.map((item, i) => {
            const soft = item.tint === 'primary' ? colors.primarySoft : colors.accentSoft;
            const ink = item.tint === 'primary' ? colors.primary : colors.accent;
            return (
              <Animated.View
                key={item.key}
                entering={FadeInDown.delay(40 + i * 35).springify()}
                style={styles.hubCell}
              >
                <Pressable
                  onPress={() => router.push(item.route as never)}
                  style={[styles.hubTile, elevation.sm, { backgroundColor: colors.surface, borderColor: colors.border }]}
                >
                  <View style={[styles.hubIcon, { backgroundColor: soft }]}>
                    <Ionicons name={item.icon} size={22} color={ink} />
                  </View>
                  <Text style={[styles.hubLabel, { color: colors.text }]} numberOfLines={2}>
                    {t(item.labelKey)}
                  </Text>
                </Pressable>
              </Animated.View>
            );
          })}
        </View>

        <View style={[styles.listCard, elevation.sm, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {LINKS.map((item, idx) => (
            <Pressable
              key={item.route}
              style={[
                styles.row,
                { borderBottomColor: colors.border, borderBottomWidth: idx === LINKS.length - 1 ? 0 : StyleSheet.hairlineWidth },
              ]}
              onPress={() => router.push(item.route as never)}
            >
              <View style={styles.rowLeft}>
                <Ionicons name={item.icon} size={18} color={colors.textMuted} />
                <Text style={{ color: colors.text, fontFamily: fonts.bodyMedium, fontSize: 15 }}>{t(item.labelKey)}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
            </Pressable>
          ))}
        </View>

        {/* El gate real está en el backend (rh_require_admin). Esto es sólo para
            no mostrarle a un usuario común una puerta que no le va a abrir. */}
        {user?.rol === 'admin' ? (
          <View
            style={[
              styles.listCard,
              elevation.sm,
              { backgroundColor: colors.surface, borderColor: colors.border, marginTop: 14 },
            ]}
          >
            <Pressable style={[styles.row, { borderBottomWidth: 0 }]} onPress={() => router.push('/(app)/admin' as never)}>
              <View style={styles.rowLeft}>
                <Ionicons name="shield-checkmark-outline" size={18} color={colors.primary} />
                <Text style={{ color: colors.text, fontFamily: fonts.bodyMedium, fontSize: 15 }}>
                  {t('admin.titulo')}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
            </Pressable>
          </View>
        ) : null}

        <View style={[styles.listCard, elevation.sm, { backgroundColor: colors.surface, borderColor: colors.border, marginTop: 14 }]}>
          <View style={[styles.row, { borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth }]}>
            <Text style={{ color: colors.text, fontFamily: fonts.bodyMedium, flex: 1 }}>
              {t('settings.notificarProximidadLabel')}
            </Text>
            <Switch
              value={user?.notificarProximidad ?? true}
              onValueChange={onToggleNotificarProximidad}
              disabled={notifBusy}
              trackColor={{ true: colors.primary, false: colors.border }}
            />
          </View>

          <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>{t('setup.themeLabel')}</Text>
          <View style={styles.chipRow}>
            {TEMAS.map((tema) => {
              const activo = preference === tema.id;
              return (
                <Pressable
                  key={tema.id}
                  onPress={() => setPreference(tema.id)}
                  style={[
                    styles.chip,
                    {
                      borderColor: activo ? colors.primary : colors.border,
                      backgroundColor: activo ? colors.primary : 'transparent',
                    },
                  ]}
                >
                  <Text
                    style={{
                      color: activo ? colors.primaryText : colors.text,
                      fontFamily: fonts.bodySemi,
                      fontSize: 13,
                    }}
                  >
                    {t(tema.labelKey)}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <LanguagePicker />

          <Pressable
            style={[styles.row, { borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth }]}
            onPress={() => router.push('/(app)/ajustes/whatsapp')}
          >
            <Text style={{ color: colors.text, fontFamily: fonts.bodyMedium }}>{t('settings.whatsappTitle')}</Text>
            <Text style={{ color: colors.textMuted }}>{user?.whatsappNumero ?? '—'}</Text>
          </Pressable>

          <Pressable
            style={[styles.row, { borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth }]}
            onPress={() => router.push('/(app)/ajustes/verificacion-estado')}
          >
            <Text style={{ color: colors.text, fontFamily: fonts.bodyMedium }}>{t('settings.verificationStatusTitle')}</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </Pressable>

          <View style={[styles.row, { borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth }]}>
            <Text style={{ color: colors.text, fontFamily: fonts.bodyMedium }}>{t('report.denounceUser')} (demo)</Text>
            {user ? <DenunciaButtonStub userId={user.userId} /> : null}
          </View>

          <Pressable style={styles.row} onPress={() => router.push('/modal-reporte')}>
            <Text style={{ color: colors.text, fontFamily: fonts.bodyMedium }}>{t('report.buttonLabel')}</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.primary} />
          </Pressable>
        </View>

        <Pressable style={styles.logout} onPress={onLogout}>
          <Text style={{ color: colors.danger, fontFamily: fonts.bodyBold }}>{t('auth.logout')}</Text>
        </Pressable>
      </ScrollView>
    </Atmosphere>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 16, paddingBottom: 40 },
  hero: { marginBottom: 18 },
  heroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: radii.xl,
    padding: 16,
  },
  logo: { width: 64, height: 64 },
  brand: { ...type.titleSm },
  welcome: { ...type.bodySm, marginTop: 2 },
  section: { fontFamily: fonts.displaySemi, fontSize: 18, marginBottom: 10 },
  hubGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 18 },
  hubCell: { width: '31%', flexGrow: 1, minWidth: '30%', maxWidth: '32%' },
  hubTile: {
    borderWidth: 1,
    borderRadius: radii.lg,
    paddingVertical: 14,
    paddingHorizontal: 10,
    alignItems: 'center',
    gap: 8,
    minHeight: 104,
  },
  hubIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hubLabel: { fontFamily: fonts.bodySemi, fontSize: 12, textAlign: 'center' },
  listCard: { borderWidth: 1, borderRadius: radii.lg, overflow: 'hidden' },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 14,
    gap: 10,
  },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  sectionLabel: { ...type.label, marginTop: 12, marginBottom: 8, marginHorizontal: 14 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8, marginHorizontal: 14 },
  chip: { borderWidth: 1, borderRadius: radii.pill, paddingVertical: 8, paddingHorizontal: 12 },
  logout: { marginTop: 28, alignItems: 'center', paddingVertical: 12 },
});
