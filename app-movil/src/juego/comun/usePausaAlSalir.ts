import { useNavigation } from 'expo-router';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert } from 'react-native';

/**
 * Intercepta CUALQUIER intento de salir de la pantalla (botón atrás de
 * Android, gesto de swipe-back en iOS, o la flecha del header) mientras
 * `activo` es true, y pregunta si querés pausar antes de salir — pedido
 * explícito: "al tocar hacia atrás preguntar si desea pausar". `beforeRemove`
 * es el único evento de React Navigation que cubre los tres casos a la vez;
 * `BackHandler` sólo cubriría el botón físico de Android.
 *
 * `onPausarYSalir` debe frenar el loop del juego y guardar el estado — recién
 * cuando termina, se deja continuar la navegación original (`e.data.action`).
 */
export function usePausaAlSalir(activo: boolean, onPausarYSalir: () => void | Promise<void>): void {
  const navigation = useNavigation();
  const { t } = useTranslation();

  useEffect(() => {
    if (!activo) return;

    const listener = (e: { preventDefault: () => void; data: { action: unknown } }) => {
      e.preventDefault();
      Alert.alert(t('hueplay.pausa.tituloConfirmarSalida'), t('hueplay.pausa.mensajeConfirmarSalida'), [
        { text: t('hueplay.pausa.seguirJugando'), style: 'cancel' },
        {
          text: t('hueplay.pausa.pausarYSalir'),
          onPress: async () => {
            await onPausarYSalir();
            navigation.dispatch(e.data.action as never);
          },
        },
      ]);
    };

    return navigation.addListener('beforeRemove', listener);
  }, [activo, navigation, onPausarYSalir, t]);
}

/** "¿Continuar donde quedaste?" al volver a entrar a un juego con una
 * partida pausada guardada. Envuelto en Promise para poder `await`earlo
 * inline en el efecto de arranque de cada pantalla. */
export function preguntarContinuar(t: (key: string) => string): Promise<boolean> {
  return new Promise((resolve) => {
    Alert.alert(
      t('hueplay.pausa.tituloContinuar'),
      t('hueplay.pausa.mensajeContinuar'),
      [
        { text: t('hueplay.pausa.empezarDeNuevo'), style: 'cancel', onPress: () => resolve(false) },
        { text: t('hueplay.pausa.continuar'), onPress: () => resolve(true) },
      ],
      { cancelable: false }
    );
  });
}
