import { Gesture } from 'react-native-gesture-handler';
import { runOnJS, useSharedValue } from 'react-native-reanimated';

/**
 * El gesto único de HueTetris/HueColumns sobre el tablero mismo — pedido
 * explícito para reemplazar los botones de antes (el de "caída rápida" en
 * particular quedaba inconsistente: a veces aceleraba suave, a veces
 * bajaba 2-3 bloques de golpe, porque mezclaba el intervalo de nivel con
 * un `setInterval` de repetición aparte y los dos peleaban por el mismo
 * estado):
 *
 * - Toque corto (sin arrastre real) → rota la pieza / gira el orden de
 *   las gemas.
 * - Arrastre horizontal → mueve un casillero por cada `tileSize` px de
 *   arrastre acumulado, así se puede llevar la pieza varios casilleros
 *   sin soltar el dedo.
 * - Arrastre hacia abajo más de `UMBRAL_CAIDA_PX` → caída DURA (al piso
 *   de una vez), una sola vez por gesto.
 *
 * Un solo `Gesture.Pan()` para las tres cosas (no un `Tap()` + `Pan()`
 * separados): así no compiten por reconocer el mismo toque, y el criterio
 * de "fue toque o fue arrastre" queda en UNA sola decisión al soltar.
 *
 * Es un HOOK (no una función suelta) a propósito: los callbacks de un gesto
 * corren como "worklets" de Reanimated en el hilo de UI, y necesitan estado
 * mutable que sobreviva entre `.onStart`/`.onUpdate`/`.onEnd` de un mismo
 * gesto. La versión anterior usaba variables `let` normales capturadas por
 * cierre -- ANDABA MAL: crasheaba la app entera en Android apenas se tocaba
 * el tablero (`com.facebook.jni.CppException: invalid assignment
 * left-hand side`, confirmado con `adb logcat` en el celular). El babel
 * plugin de Reanimated reescribe cada lectura/escritura de una variable de
 * cierre dentro de un worklet como acceso a un objeto de clausura aparte, y
 * con `+=`/`-=` sobre esas variables generaba JS inválido al reconstruirlo
 * en el hilo de UI. `useSharedValue` es la forma soportada de tener estado
 * mutable compartido entre worklets — por eso el nombre del archivo/export
 * ya decía "use", aunque antes no lo era de verdad.
 */
export function useGestoCaida(opts: {
  tileSize: number;
  onIzquierda: () => void;
  onDerecha: () => void;
  onRotar: () => void;
  onCaidaDura: () => void;
  activo: boolean;
}) {
  const UMBRAL_TAP_PX = 10;
  const UMBRAL_CAIDA_PX = 34;
  const paso = Math.max(12, opts.tileSize);

  const ultimoPasoX = useSharedValue(0);
  const yaCayoDuro = useSharedValue(false);
  const huboMovimiento = useSharedValue(false);

  return Gesture.Pan()
    .enabled(opts.activo)
    .onStart(() => {
      ultimoPasoX.value = 0;
      yaCayoDuro.value = false;
      huboMovimiento.value = false;
    })
    .onUpdate((e) => {
      if (yaCayoDuro.value) return;

      if (e.translationY >= UMBRAL_CAIDA_PX && Math.abs(e.translationY) > Math.abs(e.translationX)) {
        yaCayoDuro.value = true;
        huboMovimiento.value = true;
        runOnJS(opts.onCaidaDura)();
        return;
      }

      while (e.translationX - ultimoPasoX.value >= paso) {
        ultimoPasoX.value = ultimoPasoX.value + paso;
        huboMovimiento.value = true;
        runOnJS(opts.onDerecha)();
      }
      while (e.translationX - ultimoPasoX.value <= -paso) {
        ultimoPasoX.value = ultimoPasoX.value - paso;
        huboMovimiento.value = true;
        runOnJS(opts.onIzquierda)();
      }
    })
    .onEnd((e) => {
      if (huboMovimiento.value) return;
      const dist = Math.hypot(e.translationX, e.translationY);
      if (dist < UMBRAL_TAP_PX) {
        runOnJS(opts.onRotar)();
      }
    });
}
