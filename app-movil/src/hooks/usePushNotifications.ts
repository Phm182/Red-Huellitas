import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { perfilApi } from '../api/perfilApi';

/**
 * Registra el dispositivo para recibir push (Campañas cercanas). No hace
 * nada en web (expo-notifications es solo Android/iOS) ni si el proyecto no
 * tiene un `projectId` de EAS configurado (este repo todavía no lo tiene —
 * `getExpoPushTokenAsync` tira si falta, por eso todo está en un try/catch:
 * la ausencia de push nunca debe romper el resto de la app).
 */
export function usePushNotifications(habilitado: boolean): void {
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
