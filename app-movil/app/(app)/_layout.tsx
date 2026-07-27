import { Stack } from 'expo-router';
import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '../../src/auth/AuthProvider';
import { AppChrome } from '../../src/components/navigation/AppChrome';
import { usePushNotifications } from '../../src/hooks/usePushNotifications';
import { useTheme } from '../../src/theme/ThemeProvider';

export default function AppLayout() {
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
    <AppChrome>
      <Stack
        screenOptions={{
          // Header y tabs los dibuja AppChrome (fijos en todas las pantallas).
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="configuracion" />
        <Stack.Screen name="rescate/index" />
        <Stack.Screen name="tienda/index" />
        <Stack.Screen name="salud/index" />
        <Stack.Screen name="notificaciones/index" />
        <Stack.Screen name="chat/index" />
        <Stack.Screen name="chat/[conversacionId]" />
        <Stack.Screen name="solicitudes/index" />
        <Stack.Screen name="ajustes/whatsapp" />
        <Stack.Screen name="ajustes/verificacion-estado" />
        <Stack.Screen name="buscar" />
        <Stack.Screen name="perfil" />
        <Stack.Screen name="usuario/[username]" />
        <Stack.Screen name="usuario/[username]/seguidores" />
        <Stack.Screen name="usuario/[username]/seguidos" />
        <Stack.Screen name="mascotas/index" />
        <Stack.Screen name="mascotas/nueva" />
        <Stack.Screen name="mascotas/[id]/editar" />
        <Stack.Screen name="mascota/[id]" />
        <Stack.Screen name="publicaciones/nueva" />
        <Stack.Screen name="publicaciones/[id]" />
        <Stack.Screen name="publicaciones/nueva_video" />
        <Stack.Screen name="historias/nueva" />
        <Stack.Screen name="historias/ver/[userId]" />
        <Stack.Screen name="historia-vistas/[historiaId]" />
        <Stack.Screen name="cadenas/index" />
        <Stack.Screen name="cadenas/nueva" />
        <Stack.Screen name="cadenas/[id]" />
        <Stack.Screen name="adopcion/index" />
        <Stack.Screen name="adopcion/nueva" />
        <Stack.Screen name="adopcion/[id]" />
        <Stack.Screen name="adopcion/[id]/postular" />
        <Stack.Screen name="adopcion/[id]/postulaciones" />
        <Stack.Screen name="adopcion/mis-postulaciones" />
        <Stack.Screen name="adopcion/favoritos" />
        <Stack.Screen name="campanias/index" />
        <Stack.Screen name="campanias/nueva" />
        <Stack.Screen name="campanias/[id]" />
        <Stack.Screen name="campanias/[id]/inscripciones" />
        <Stack.Screen name="campanias/mis-inscripciones" />
        <Stack.Screen name="perdidos/index" />
        <Stack.Screen name="perdidos/nueva" />
        <Stack.Screen name="perdidos/[id]" />
        <Stack.Screen name="transito/index" />
        <Stack.Screen name="transito/nueva" />
        <Stack.Screen name="transito/[id]" />
        <Stack.Screen name="donaciones/index" />
        <Stack.Screen name="donaciones/nueva" />
        <Stack.Screen name="donaciones/[id]" />
        <Stack.Screen name="veterinarias/index" />
        <Stack.Screen name="veterinarias/nueva" />
        <Stack.Screen name="veterinarias/[id]" />
        <Stack.Screen name="match/index" />
        <Stack.Screen name="match/matches" />
        <Stack.Screen name="match/[matchId]" />
        <Stack.Screen name="suscripcion/index" />
        <Stack.Screen name="productos/index" />
        <Stack.Screen name="productos/nueva" />
        <Stack.Screen name="productos/[id]" />
        <Stack.Screen name="productos/favoritos" />
        <Stack.Screen name="carrito/index" />
        <Stack.Screen name="pedidos/mis-compras" />
        <Stack.Screen name="pedidos/mis-ventas" />
        <Stack.Screen name="pedidos/[id]" />
        <Stack.Screen name="juego/index" />
        <Stack.Screen name="juego/[mascotaId]" />
        <Stack.Screen name="admin/index" />
        <Stack.Screen name="admin/verificaciones" />
        <Stack.Screen name="admin/denuncias" />
        <Stack.Screen name="admin/reportes" />
      </Stack>
    </AppChrome>
  );
}
