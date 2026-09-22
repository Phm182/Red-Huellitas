import { useNavigation } from 'expo-router';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { confirmar } from '../../utils/confirmModal';

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
  // Al confirmar, `navigation.dispatch(e.data.action)` vuelve a disparar
  // `beforeRemove` para esa MISMA acción (es la acción original, recién
  // dejada pasar) — sin esta bandera, este mismo listener la interceptaba
  // de nuevo, mostraba el cartel otra vez, y nunca se llegaba a salir
  // (confirmado en el celular: quedaba en loop). Patrón oficial de React
  // Navigation para "confirmar antes de salir": la segunda vuelta se deja
  // pasar sin preguntar.
  const saliendoRef = useRef(false);

  useEffect(() => {
    if (!activo) return;
    saliendoRef.current = false;

    const listener = (e: { preventDefault: () => void; data: { action: unknown } }) => {
      if (saliendoRef.current) return;
      e.preventDefault();
      confirmar({
        titulo: t('hueplay.pausa.tituloConfirmarSalida'),
        mensaje: t('hueplay.pausa.mensajeConfirmarSalida'),
        textoCancelar: t('hueplay.pausa.seguirJugando'),
        textoConfirmar: t('hueplay.pausa.pausarYSalir'),
      }).then(async (salir) => {
        if (!salir) return;
        saliendoRef.current = true;
        await onPausarYSalir();
        navigation.dispatch(e.data.action as never);
      });
    };

    return navigation.addListener('beforeRemove', listener);
  }, [activo, navigation, onPausarYSalir, t]);
}

/** "¿Continuar donde quedaste?" al volver a entrar a un juego con una
 * partida pausada guardada. */
export function preguntarContinuar(t: (key: string) => string): Promise<boolean> {
  return confirmar({
    titulo: t('hueplay.pausa.tituloContinuar'),
    mensaje: t('hueplay.pausa.mensajeContinuar'),
    textoCancelar: t('hueplay.pausa.empezarDeNuevo'),
    textoConfirmar: t('hueplay.pausa.continuar'),
  });
}
