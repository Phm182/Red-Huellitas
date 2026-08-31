import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { notificacionesApi, privacidadApi } from '../../src/api/notificacionesApi';
import { perfilApi } from '../../src/api/perfilApi';
import { useAuth } from '../../src/auth/AuthProvider';
import { Atmosphere } from '../../src/components/Atmosphere';
import { LanguagePicker } from '../../src/components/LanguagePicker';
import { LogoImage } from '../../src/components/LogoImage';
import { elevation, radii } from '../../src/theme/elevation';
import { centeredContent } from '../../src/theme/layout';
import { fonts, type } from '../../src/theme/typography';
import { ThemePreference, useTheme } from '../../src/theme/ThemeProvider';
import { hapticLeve } from '../../src/utils/haptics';

const TEMAS: { id: ThemePreference; labelKey: string }[] = [
  { id: 'system', labelKey: 'setup.themeSystem' },
  { id: 'light', labelKey: 'setup.themeLight' },
  { id: 'dark', labelKey: 'setup.themeDark' },
];

type Fila = {
  labelKey: string;
  route: string;
  icon: keyof typeof Ionicons.glyphMap;
  /** Número a la derecha, ej. solicitudes pendientes. */
  badge?: number;
};

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={{ marginBottom: 18 }}>
      <Text style={[type.label, { color: colors.textMuted, marginBottom: 8, marginLeft: 4 }]}>{titulo}</Text>
      <View style={[styles.tarjeta, elevation.sm, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {children}
      </View>
    </View>
  );
}

function FilaLink({ item, ultima }: { item: Fila; ultima: boolean }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  return (
    <Pressable
      style={[
        styles.fila,
        !ultima && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
      ]}
      onPress={() => {
        hapticLeve();
        router.push(item.route as never);
      }}
    >
      <View style={styles.filaIzq}>
        <Ionicons name={item.icon} size={18} color={colors.textMuted} />
        <Text style={{ color: colors.text, fontFamily: fonts.bodyMedium, fontSize: 15 }}>
          {t(item.labelKey)}
        </Text>
      </View>
      <View style={styles.filaDer}>
        {item.badge && item.badge > 0 ? (
          <View style={[styles.badge, { backgroundColor: colors.danger }]}>
            <Text style={styles.badgeTexto}>{item.badge}</Text>
          </View>
        ) : null}
        <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
      </View>
    </Pressable>
  );
}

/**
 * Configuración de la cuenta.
 *
 * Era el "Más": un cajón con 6 tiles y 10 links sueltos que mezclaba
 * navegación (Adopción, Tienda…) con ajustes. La navegación se fue a los hubs
 * y acá quedó sólo lo que es tu cuenta, ordenado por secciones.
 */
export default function ConfiguracionScreen() {
  const { t } = useTranslation();
  const { colors, preference, setPreference } = useTheme();
  const { user, logout, actualizarUsuario, accounts } = useAuth();

  const [notifBusy, setNotifBusy] = useState(false);
  const [privBusy, setPrivBusy] = useState(false);
  const [pendientes, setPendientes] = useState(0);

  useFocusEffect(
    useCallback(() => {
      let activo = true;
      notificacionesApi.contadores().then((res) => {
        if (activo && res.success && res.data) setPendientes(res.data.solicitudesSeguir);
      });
      return () => {
        activo = false;
      };
    }, [])
  );

  const onToggleProximidad = async (valor: boolean) => {
    if (!user || notifBusy) return;
    setNotifBusy(true);
    const res = await perfilApi.guardarNotificacionProximidad(valor);
    setNotifBusy(false);
    if (res.success) actualizarUsuario({ ...user, notificarProximidad: valor });
  };

  const onTogglePrivado = async (valor: boolean) => {
    if (!user || privBusy) return;
    setPrivBusy(true);
    const res = await privacidadApi.guardar(valor);
    setPrivBusy(false);
    if (res.success && res.data) {
      actualizarUsuario({ ...user, perfilPrivado: res.data.perfilPrivado });
      setPendientes(res.data.solicitudesPendientes);
    }
  };

  const afterLogout = async () => {
    const quedanOtras = accounts.length > 1;
    await logout();
    router.replace((quedanOtras ? '/(app)/(tabs)' : '/(auth)/login') as never);
  };

  const onLogout = () => {
    const title = t('auth.logoutConfirmTitle');
    const message = t('auth.logoutConfirmMessage');
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.confirm(`${title}\n\n${message}`)) afterLogout();
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

  const cuenta: Fila[] = [
    { labelKey: 'perfil.myProfile', route: '/(app)/perfil', icon: 'person-outline' },
    { labelKey: 'settings.verificationStatusTitle', route: '/(app)/ajustes/verificacion-estado', icon: 'shield-checkmark-outline' },
    { labelKey: 'settings.whatsappTitle', route: '/(app)/ajustes/whatsapp', icon: 'logo-whatsapp' },
    { labelKey: 'hueplay.soccer.skinsTitulo', route: '/(app)/ajustes/huesoccer-skins', icon: 'football-outline' },
    { labelKey: 'suscripcion.tituloLista', route: '/(app)/suscripcion', icon: 'diamond-outline' },
  ];

  return (
    <Atmosphere>
      <ScrollView contentContainerStyle={[styles.contenedor, centeredContent]} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInDown.springify()} style={{ marginBottom: 20 }}>
          <LinearGradient
            colors={[colors.primarySoft, colors.accentSoft]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.hero, elevation.sm]}
          >
            <LogoImage style={styles.logo} />
            <View style={{ flex: 1 }}>
              <Text style={[type.titleSm, { color: colors.text }]}>Red Huellitas</Text>
              <Text style={[type.bodySm, { color: colors.textMuted }]}>
                {user?.username ? `@${user.username}` : t('home.welcome')}
              </Text>
            </View>
          </LinearGradient>
        </Animated.View>

        <Seccion titulo={t('configuracion.cuenta')}>
          {cuenta.map((f, i) => (
            <FilaLink key={f.route} item={f} ultima={i === cuenta.length - 1} />
          ))}
        </Seccion>

        <Seccion titulo={t('configuracion.privacidad')}>
          <View style={[styles.fila, { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }]}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text style={{ color: colors.text, fontFamily: fonts.bodyMedium, fontSize: 15 }}>
                {t('configuracion.cuentaPrivada')}
              </Text>
              <Text style={[type.caption, { color: colors.textMuted, marginTop: 2 }]}>
                {t('configuracion.cuentaPrivadaDesc')}
              </Text>
            </View>
            <Switch
              value={user?.perfilPrivado ?? false}
              onValueChange={onTogglePrivado}
              disabled={privBusy}
              trackColor={{ true: colors.primary, false: colors.border }}
            />
          </View>

          <FilaLink
            item={{
              labelKey: 'configuracion.solicitudes',
              route: '/(app)/solicitudes',
              icon: 'person-add-outline',
              badge: pendientes,
            }}
            ultima
          />
        </Seccion>

        <Seccion titulo={t('configuracion.notificaciones')}>
          <View style={styles.fila}>
            <Text style={{ color: colors.text, fontFamily: fonts.bodyMedium, flex: 1, paddingRight: 12 }}>
              {t('settings.notificarProximidadLabel')}
            </Text>
            <Switch
              value={user?.notificarProximidad ?? true}
              onValueChange={onToggleProximidad}
              disabled={notifBusy}
              trackColor={{ true: colors.primary, false: colors.border }}
            />
          </View>
        </Seccion>

        <Seccion titulo={t('configuracion.apariencia')}>
          <View style={{ paddingVertical: 10 }}>
            <Text style={[type.label, { color: colors.textMuted, marginHorizontal: 14, marginBottom: 8 }]}>
              {t('setup.themeLabel')}
            </Text>
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
          </View>
        </Seccion>

        {/* El gate real está en el backend (rh_require_admin). Esto es sólo para
            no mostrarle a un usuario común una puerta que no le va a abrir. */}
        {user?.rol === 'admin' ? (
          <Seccion titulo={t('configuracion.moderacion')}>
            <FilaLink
              item={{ labelKey: 'admin.titulo', route: '/(app)/admin', icon: 'shield-checkmark-outline' }}
              ultima
            />
          </Seccion>
        ) : null}

        <Seccion titulo={t('configuracion.ayuda')}>
          <FilaLink item={{ labelKey: 'report.buttonLabel', route: '/modal-reporte', icon: 'help-buoy-outline' }} ultima />
        </Seccion>

        <Pressable style={styles.logout} onPress={onLogout}>
          <Ionicons name="log-out-outline" size={18} color={colors.danger} />
          <Text style={{ color: colors.danger, fontFamily: fonts.bodyBold }}>{t('auth.logout')}</Text>
        </Pressable>
      </ScrollView>
    </Atmosphere>
  );
}

const styles = StyleSheet.create({
  contenedor: { flexGrow: 1, padding: 16, paddingBottom: 40 },
  hero: { flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: radii.xl, padding: 16 },
  logo: { width: 56, height: 56 },
  tarjeta: { borderWidth: 1, borderRadius: radii.lg, overflow: 'hidden' },
  fila: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 14,
    gap: 10,
  },
  filaIzq: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  filaDer: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: radii.pill,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeTexto: { color: '#fff', fontFamily: fonts.bodyBold, fontSize: 11 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8, marginHorizontal: 14 },
  chip: { borderWidth: 1, borderRadius: radii.pill, paddingVertical: 8, paddingHorizontal: 12 },
  logout: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 10,
    paddingVertical: 14,
  },
});
