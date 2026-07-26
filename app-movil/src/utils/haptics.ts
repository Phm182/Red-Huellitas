import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

/**
 * Vibración táctil para confirmar acciones.
 *
 * En web no existe el motor háptico y las funciones de expo-haptics rechazan
 * la promesa (`UnavailabilityError`); como casi nunca se las espera con await,
 * eso terminaría en un unhandled rejection en consola. Por eso acá se corta
 * antes en web y se traga cualquier error en nativo: un háptico que no salió
 * jamás debería romper la acción que lo disparó.
 */
const disponible = Platform.OS === 'ios' || Platform.OS === 'android';

function ejecutar(fn: () => Promise<void>): void {
  if (!disponible) {
    return;
  }
  fn().catch(() => {});
}

/** Toque leve: cambiar de filtro, abrir algo, seleccionar una opción. */
export function hapticLeve(): void {
  ejecutar(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
}

/** Toque medio: reaccionar a una publicación, agregar al carrito. */
export function hapticMedio(): void {
  ejecutar(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium));
}

/** Algo salió bien: se creó la publicación, se aprobó la verificación. */
export function hapticExito(): void {
  ejecutar(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
}

/** Algo falló: validación de formulario, error de red. */
export function hapticError(): void {
  ejecutar(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error));
}

/** Momento importante: hubo match nuevo, subió de nivel la mascota. */
export function hapticCelebracion(): void {
  ejecutar(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning));
}
