import { Stack } from 'expo-router';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '../../src/auth/AuthProvider';
import { usePushNotifications } from '../../src/hooks/usePushNotifications';
import { MAX_CONTENT_WIDTH } from '../../src/theme/layout';
import { fonts } from '../../src/theme/typography';
import { useTheme } from '../../src/theme/ThemeProvider';

export default function AppLayout() {
  const { t } = useTranslation();
  const { isLoading } = useAuth();
  const { colors } = useTheme();

  usePushNotifications(!isLoading);

  // AuthProvider restaura el token de forma asíncrona (SecureStore/AsyncStorage).
  // Si las pantallas de acá abajo dispararan sus propios fetch autenticados
  // antes de que esto termine (ej. al abrir la app directo en /mascotas por
  // deep link o refresh), la request saldría sin token y volvería 401,
  // renderizando mal (ej. "cuenta no verificada" aunque sí lo esté). Bloqueamos
  // el render de todo el grupo hasta que el auth esté resuelto.
  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      {/* maxWidth+alignSelf: en desktop ancla el FAB a la columna centrada, no al borde de la ventana */}
      <View style={{ flex: 1, width: '100%', maxWidth: MAX_CONTENT_WIDTH, alignSelf: 'center' }}>
        <Stack
          screenOptions={{
            headerShown: false,
            headerStyle: { backgroundColor: colors.surface },
            headerTintColor: colors.text,
            headerTitleStyle: { fontFamily: fonts.displaySemi, fontSize: 17 },
            headerShadowVisible: false,
            contentStyle: { backgroundColor: colors.background },
          }}
        >
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="ajustes/whatsapp" options={{ headerShown: true, title: 'WhatsApp' }} />
          <Stack.Screen name="ajustes/verificacion-estado" options={{ headerShown: true, title: 'Verificación' }} />
          <Stack.Screen name="buscar" options={{ headerShown: true, title: t('busqueda.navLabel') }} />
          <Stack.Screen name="perfil" />
          <Stack.Screen name="usuario/[username]" options={{ headerShown: true, title: '' }} />
          <Stack.Screen
            name="usuario/[username]/seguidores"
            options={{ headerShown: true, title: t('perfil.followers') }}
          />
          <Stack.Screen
            name="usuario/[username]/seguidos"
            options={{ headerShown: true, title: t('perfil.following') }}
          />
          <Stack.Screen name="mascotas/index" options={{ headerShown: true, title: t('mascotas.title') }} />
          <Stack.Screen name="mascotas/nueva" options={{ headerShown: true, title: t('mascotas.addPet') }} />
          <Stack.Screen
            name="mascotas/[id]/editar"
            options={{ headerShown: true, title: t('mascotas.editButton') }}
          />
          <Stack.Screen name="mascota/[id]" options={{ headerShown: true, title: '' }} />
          <Stack.Screen name="publicaciones/nueva" options={{ headerShown: true, title: t('feed.createTitle') }} />
          <Stack.Screen name="publicaciones/[id]" options={{ headerShown: true, title: '' }} />
          <Stack.Screen name="publicaciones/nueva_video" options={{ headerShown: true, title: t('shorts.createTitle') }} />
          <Stack.Screen name="historias/nueva" options={{ headerShown: false }} />
          <Stack.Screen name="historias/ver/[userId]" options={{ headerShown: false }} />
          <Stack.Screen
            name="historia-vistas/[historiaId]"
            options={{ headerShown: true, title: t('historias.vistasTitulo') }}
          />
          <Stack.Screen name="cadenas/index" options={{ headerShown: true, title: t('cadenas.titulo') }} />
          <Stack.Screen name="cadenas/nueva" options={{ headerShown: true, title: t('cadenas.tituloNueva') }} />
          <Stack.Screen name="cadenas/[id]" options={{ headerShown: true, title: '' }} />
          <Stack.Screen name="adopcion/index" options={{ headerShown: true, title: t('adopcion.tituloLista') }} />
          <Stack.Screen name="adopcion/nueva" options={{ headerShown: true, title: t('adopcion.tituloNueva') }} />
          <Stack.Screen name="adopcion/[id]" options={{ headerShown: true, title: '' }} />
          <Stack.Screen name="adopcion/[id]/postular" options={{ headerShown: true, title: t('adopcion.tituloPostular') }} />
          <Stack.Screen
            name="adopcion/[id]/postulaciones"
            options={{ headerShown: true, title: t('adopcion.verPostulaciones') }}
          />
          <Stack.Screen
            name="adopcion/mis-postulaciones"
            options={{ headerShown: true, title: t('adopcion.misPostulaciones') }}
          />
          <Stack.Screen name="adopcion/favoritos" options={{ headerShown: true, title: t('adopcion.misFavoritos') }} />
          <Stack.Screen name="campanias/index" options={{ headerShown: true, title: t('campanias.tituloLista') }} />
          <Stack.Screen name="campanias/nueva" options={{ headerShown: true, title: t('campanias.tituloNueva') }} />
          <Stack.Screen name="campanias/[id]" options={{ headerShown: true, title: '' }} />
          <Stack.Screen
            name="campanias/[id]/inscripciones"
            options={{ headerShown: true, title: t('campanias.verInscriptos') }}
          />
          <Stack.Screen
            name="campanias/mis-inscripciones"
            options={{ headerShown: true, title: t('campanias.misInscripciones') }}
          />
          <Stack.Screen name="perdidos/index" options={{ headerShown: true, title: t('perdidos.tituloLista') }} />
          <Stack.Screen name="perdidos/nueva" options={{ headerShown: true, title: t('perdidos.tituloNueva') }} />
          <Stack.Screen name="perdidos/[id]" options={{ headerShown: true, title: '' }} />
          <Stack.Screen name="transito/index" options={{ headerShown: true, title: t('transito.tituloLista') }} />
          <Stack.Screen name="transito/nueva" options={{ headerShown: true, title: t('transito.tituloNueva') }} />
          <Stack.Screen name="transito/[id]" options={{ headerShown: true, title: '' }} />
          <Stack.Screen name="donaciones/index" options={{ headerShown: true, title: t('donaciones.tituloLista') }} />
          <Stack.Screen name="donaciones/nueva" options={{ headerShown: true, title: t('donaciones.tituloNueva') }} />
          <Stack.Screen name="donaciones/[id]" options={{ headerShown: true, title: '' }} />
          <Stack.Screen name="veterinarias/index" options={{ headerShown: true, title: t('veterinarias.tituloLista') }} />
          <Stack.Screen name="veterinarias/nueva" options={{ headerShown: true, title: t('veterinarias.tituloNueva') }} />
          <Stack.Screen name="veterinarias/[id]" options={{ headerShown: true, title: '' }} />
          <Stack.Screen name="match/index" options={{ headerShown: true, title: t('match.tituloLista') }} />
          <Stack.Screen name="match/matches" options={{ headerShown: true, title: t('match.tituloMatches') }} />
          <Stack.Screen name="match/[matchId]" options={{ headerShown: true, title: '' }} />
          <Stack.Screen name="suscripcion/index" options={{ headerShown: true, title: t('suscripcion.tituloLista') }} />
          <Stack.Screen name="productos/index" options={{ headerShown: true, title: t('productos.tituloLista') }} />
          <Stack.Screen name="productos/nueva" options={{ headerShown: true, title: t('productos.tituloNueva') }} />
          <Stack.Screen name="productos/[id]" options={{ headerShown: true, title: '' }} />
          <Stack.Screen name="productos/favoritos" options={{ headerShown: true, title: t('productos.misFavoritos') }} />
          <Stack.Screen name="carrito/index" options={{ headerShown: true, title: t('carrito.tituloLista') }} />
          <Stack.Screen name="pedidos/mis-compras" options={{ headerShown: true, title: t('pedidos.misCompras') }} />
          <Stack.Screen name="pedidos/mis-ventas" options={{ headerShown: true, title: t('pedidos.misVentas') }} />
          <Stack.Screen name="pedidos/[id]" options={{ headerShown: true, title: t('pedidos.detalleTitulo') }} />
          <Stack.Screen name="juego/index" options={{ headerShown: true, title: t('juego.titulo') }} />
          <Stack.Screen name="juego/[mascotaId]" options={{ headerShown: true, title: t('juego.titulo') }} />
          <Stack.Screen name="admin/index" options={{ headerShown: true, title: t('admin.titulo') }} />
          <Stack.Screen
            name="admin/verificaciones"
            options={{ headerShown: true, title: t('admin.verificacionesTitulo') }}
          />
          <Stack.Screen name="admin/denuncias" options={{ headerShown: true, title: t('admin.denunciasTitulo') }} />
          <Stack.Screen name="admin/reportes" options={{ headerShown: true, title: t('admin.reportesTitulo') }} />
        </Stack>
      </View>
    </View>
  );
}
