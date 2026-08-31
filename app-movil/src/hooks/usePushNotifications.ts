import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { perfilApi } from '../api/perfilApi';

// Sin esto, expo-notifications no muestra nada (ni banner ni sonido) cuando
// la notificación llega con la app abierta en primer plano — por default la
// silencia. Se define una sola vez a nivel de módulo, no por instancia del
// hook, porque el SDK lo toma como configuración global.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/**
 * Registra el dispositivo para recibir push (Campañas cercanas, HuePlay,
 * etc.) y engancha el toque de la notificación para navegar a `data.ruta`.
 * No hace nada en web (expo-notifications es solo Android/iOS) ni si el
 * proyecto no tiene un `projectId` de EAS configurado (`getExpoPushTokenAsync`
 * tira si falta, por eso todo está en un try/catch: la ausencia de push
 * nunca debe romper el resto de la app).
 */
export function usePushNotifications(habilitado: boolean): void {
  const router = useRouter();

  // El listener de toque se engancha siempre (no depende de `habilitado`
  // ni de si el registro del token tuvo éxito): si el sistema operativo ya
  // entregó la notificación, tocarla tiene que navegar sin importar en qué
  // orden se montaron los hooks.
  useEffect(() => {
    if (Platform.OS === 'web') {
      return;
    }

    const sub = Notifications.addNotificationResponseReceivedListener((respuesta) => {
      const ruta = respuesta.notification.request.content.data?.ruta;
      if (typeof ruta === 'string' && ruta.length > 0) {
        router.push(ruta as never);
      }
    });

    return () => sub.remove();
  }, [router]);

  useEffect(() => {
    if (!habilitado || Platform.OS === 'web') {
      return;
    }

    (async () => {
      try {
        if (Platform.OS === 'android') {
          await Notifications.setNotificationChannelAsync('default', {
            name: 'Default',
            importance: Notifications.AndroidImportance.MAX,
          });
        }

        const { status } = await Notifications.requestPermissionsAsync();
        if (status !== 'granted') {
          return;
        }

        const projectId = Constants.expoConfig?.extra?.eas?.projectId;
        if (!projectId) {
          return;
        }

        const token = await Notifications.getExpoPushTokenAsync({ projectId });
        await perfilApi.guardarPushToken(token.data);
      } catch (e) {
        // Silencioso a propósito: el registro de push es best-effort.
      }
    })();
  }, [habilitado]);
}
