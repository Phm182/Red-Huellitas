import { router } from 'expo-router';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { perfilApi } from '../../../src/api/perfilApi';
import { useAuth } from '../../../src/auth/AuthProvider';
import { DenunciaButtonStub } from '../../../src/components/DenunciaButtonStub';
import { LanguagePicker } from '../../../src/components/LanguagePicker';
import { LogoImage } from '../../../src/components/LogoImage';
import { centeredContent } from '../../../src/theme/layout';
import { useTheme } from '../../../src/theme/ThemeProvider';

export default function MasScreen() {
  const { t } = useTranslation();
  const { colors, theme, toggleTheme } = useTheme();
  const { user, logout, actualizarUsuario } = useAuth();
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

  return (
    <ScrollView contentContainerStyle={[styles.container, { backgroundColor: colors.background }]}>
      <LogoImage style={styles.logo} />
      <Text style={[styles.welcome, { color: colors.text }]}>{t('home.welcome')}</Text>
      {user ? <Text style={{ color: colors.textMuted, marginBottom: 24 }}>@{user.username}</Text> : null}

      <Pressable style={[styles.row, { borderColor: colors.border }]} onPress={() => router.push('/(app)/buscar')}>
        <Text style={{ color: colors.text }}>{t('busqueda.navLabel')}</Text>
      </Pressable>

      <Pressable style={[styles.row, { borderColor: colors.border }]} onPress={() => router.push('/(app)/perfil')}>
        <Text style={{ color: colors.text }}>{t('perfil.myProfile')}</Text>
      </Pressable>

      <Pressable style={[styles.row, { borderColor: colors.border }]} onPress={() => router.push('/(app)/mascotas')}>
        <Text style={{ color: colors.text }}>{t('mascotas.title')}</Text>
      </Pressable>

      <Pressable style={[styles.row, { borderColor: colors.border }]} onPress={() => router.push('/(app)/adopcion')}>
        <Text style={{ color: colors.text }}>{t('adopcion.tituloLista')}</Text>
      </Pressable>

      <Pressable style={[styles.row, { borderColor: colors.border }]} onPress={() => router.push('/(app)/campanias')}>
        <Text style={{ color: colors.text }}>{t('campanias.tituloLista')}</Text>
      </Pressable>

      <Pressable style={[styles.row, { borderColor: colors.border }]} onPress={() => router.push('/(app)/perdidos')}>
        <Text style={{ color: colors.text }}>{t('perdidos.tituloLista')}</Text>
      </Pressable>

      <Pressable style={[styles.row, { borderColor: colors.border }]} onPress={() => router.push('/(app)/transito')}>
        <Text style={{ color: colors.text }}>{t('transito.tituloLista')}</Text>
      </Pressable>

      <Pressable style={[styles.row, { borderColor: colors.border }]} onPress={() => router.push('/(app)/donaciones')}>
        <Text style={{ color: colors.text }}>{t('donaciones.tituloLista')}</Text>
      </Pressable>

      <Pressable style={[styles.row, { borderColor: colors.border }]} onPress={() => router.push('/(app)/veterinarias')}>
        <Text style={{ color: colors.text }}>{t('veterinarias.tituloLista')}</Text>
      </Pressable>

      <Pressable style={[styles.row, { borderColor: colors.border }]} onPress={() => router.push('/(app)/match')}>
        <Text style={{ color: colors.text }}>{t('match.tituloLista')}</Text>
      </Pressable>

      <Pressable style={[styles.row, { borderColor: colors.border }]} onPress={() => router.push('/(app)/suscripcion')}>
        <Text style={{ color: colors.text }}>{t('suscripcion.tituloLista')}</Text>
      </Pressable>

      <Pressable style={[styles.row, { borderColor: colors.border }]} onPress={() => router.push('/(app)/productos')}>
        <Text style={{ color: colors.text }}>{t('productos.tituloLista')}</Text>
      </Pressable>

      <Pressable style={[styles.row, { borderColor: colors.border }]} onPress={() => router.push('/(app)/carrito')}>
        <Text style={{ color: colors.text }}>{t('carrito.tituloLista')}</Text>
      </Pressable>

      <Pressable style={[styles.row, { borderColor: colors.border }]} onPress={() => router.push('/(app)/pedidos/mis-compras')}>
        <Text style={{ color: colors.text }}>{t('pedidos.misCompras')}</Text>
      </Pressable>

      <Pressable style={[styles.row, { borderColor: colors.border }]} onPress={() => router.push('/(app)/pedidos/mis-ventas')}>
        <Text style={{ color: colors.text }}>{t('pedidos.misVentas')}</Text>
      </Pressable>

      <Pressable style={[styles.row, { borderColor: colors.border }]} onPress={() => router.push('/(app)/juego')}>
        <Text style={{ color: colors.text }}>🐾 {t('juego.titulo')}</Text>
      </Pressable>

      <View style={[styles.row, { borderColor: colors.border }]}>
        <Text style={{ color: colors.text }}>{t('settings.notificarProximidadLabel')}</Text>
        <Switch value={user?.notificarProximidad ?? true} onValueChange={onToggleNotificarProximidad} disabled={notifBusy} />
      </View>

      <Pressable style={[styles.row, { borderColor: colors.border }]} onPress={toggleTheme}>
        <Text style={{ color: colors.text }}>{t('settings.themeLight')} / {t('settings.themeDark')}</Text>
        <Text style={{ color: colors.primary, fontWeight: '600' }}>
          {theme === 'dark' ? t('settings.themeDark') : t('settings.themeLight')}
        </Text>
      </Pressable>

      <LanguagePicker />

      <Pressable style={[styles.row, { borderColor: colors.border }]} onPress={() => router.push('/(app)/ajustes/whatsapp')}>
        <Text style={{ color: colors.text }}>{t('settings.whatsappTitle')}</Text>
        <Text style={{ color: colors.textMuted }}>{user?.whatsappNumero ?? '—'}</Text>
      </Pressable>

      <Pressable
        style={[styles.row, { borderColor: colors.border }]}
        onPress={() => router.push('/(app)/ajustes/verificacion-estado')}
      >
        <Text style={{ color: colors.text }}>{t('settings.verificationStatusTitle')}</Text>
      </Pressable>

      <View style={[styles.row, { borderColor: colors.border }]}>
        <Text style={{ color: colors.text }}>{t('report.denounceUser')} (demo)</Text>
        {user ? <DenunciaButtonStub userId={user.userId} /> : null}
      </View>

      <Pressable
        style={styles.logout}
        onPress={async () => {
          await logout();
          router.replace('/(auth)/login');
        }}
      >
        <Text style={{ color: colors.danger, fontWeight: '600' }}>Logout</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 24, paddingTop: 24, alignItems: 'stretch', ...centeredContent },
  logo: { width: 80, height: 80, alignSelf: 'center', marginBottom: 12 },
  welcome: { fontSize: 20, fontWeight: '700', textAlign: 'center', marginBottom: 4 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    paddingVertical: 16,
  },
  logout: { marginTop: 32, alignItems: 'center' },
});
