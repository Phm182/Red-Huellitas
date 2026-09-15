import { useMemo } from 'react';
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

  // `useMemo`, no un `Gesture.Pan()` nuevo en cada render: esta pantalla
  // fuerza un re-render por cuadro (`setTick` en el loop de física, ~60/s)
  // mientras se juega. Sin memoizar, `GestureDetector` recibía un objeto de
  // gesto DISTINTO en cada uno de esos renders y volvía a montar el handler
  // nativo constantemente -- un arrastre (varios cuadros) sobrevivía porque
  // siempre había ALGÚN handler activo al final, pero un toque corto (un
  // solo evento down+up) podía caer justo entre dos remontajes y perder su
  // `onFinalize` sin ningún error visible (reportado real: el botón de
  // rotar sí giraba la pieza, el toque sobre el tablero no).
  return useMemo(
    () =>
      Gesture.Pan()
        .enabled(opts.activo)
        // Sin esto, un toque real (con casi cero movimiento) puede no llegar
        // NUNCA a activar el gesto -- `Gesture.Pan()` por default exige un
        // mínimo de arrastre antes de reconocerse, y si ese mínimo es mayor a
        // `UMBRAL_TAP_PX` el toque para rotar directamente no dispara `onEnd`
        // (reportado real: "no anda ni con tap ni con deslizar", confirmado que
        // mis pruebas por ADB usaban arrastres más largos que un dedo real).
        // Con `minDistance(0)` el gesto arranca apenas se apoya el dedo, así
        // `onStart`/`onUpdate`/`onEnd` siempre corren pase lo que pase.
        .minDistance(0)
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
        // `onFinalize` y no `onEnd`: leyendo el código de gesture-handler
        // (`eventReceiver.js`), `onEnd` sólo se llama si el gesto llegó a estar
        // ACTIVE antes de terminar -- un toque real, corto y casi sin
        // movimiento, puede quedar en BEGAN -> FAILED sin pasar nunca por
        // ACTIVE (no hay eventos de movimiento que evaluar), y con eso `onEnd`
        // NUNCA se llama pase lo que pase con `minDistance`. `onFinalize` sí se
        // llama siempre, haya activado el gesto o no -- es la única forma
        // confiable de detectar "fue un toque" en vez de un arrastre.
        .onFinalize((e) => {
          if (huboMovimiento.value) return;
          const dist = Math.hypot(e.translationX, e.translationY);
          if (dist < UMBRAL_TAP_PX) {
            runOnJS(opts.onRotar)();
          }
        }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [opts.activo, paso, opts.onIzquierda, opts.onDerecha, opts.onRotar, opts.onCaidaDura]
  );
}
