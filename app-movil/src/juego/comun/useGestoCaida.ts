import { useRef } from 'react';
import { GestureResponderEvent, PanResponder, PanResponderGestureState, PanResponderInstance } from 'react-native';

const UMBRAL_TAP_PX = 10;
const UMBRAL_CAIDA_PX = 34;
/** Cuánto hay que mantener quieto el dedo (sin superar `UMBRAL_TAP_PX`) para que arranque la caída acelerada. */
const DEMORA_ACELERAR_MS = 150;

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
 * - Mantener el dedo apoyado sin moverlo (`DEMORA_ACELERAR_MS`) → caída
 *   ACELERADA (no dura): mientras se sostiene, la pieza baja rápido pero
 *   se puede seguir moviendo a los costados para acomodarla, y al soltar
 *   se frena donde esté — a diferencia de la caída dura, no la fija. Es lo
 *   que pidió el usuario para no tener que esperar a que baje sola en los
 *   primeros niveles. El intervalo real lo aplica `motor.ts::actualizar()`
 *   con su propio acumulador (mismo mecanismo de siempre, sólo con un
 *   intervalo más corto) — por eso no repite el bug viejo del
 *   `setInterval` peleando con el acumulador.
 * - Arrastre hacia abajo más de `UMBRAL_CAIDA_PX` → caída DURA (al piso
 *   de una vez), una sola vez por gesto. Cancela la aceleración si ya
 *   había arrancado.
 *
 * `PanResponder` (API nativa de React Native), NO `react-native-gesture-
 * handler`, a propósito -- probado a fondo con `Gesture.Pan()` +
 * `GestureDetector` y el gesto NUNCA recibía un solo toque, ni con el dedo
 * real ni por ADB: se instrumentó `onBegin` (el callback más temprano
 * posible, antes de cualquier criterio de activación) con un contador
 * visible en pantalla y se quedó SIEMPRE en cero, tocando directo sobre el
 * tablero. Mientras tanto los botones de `ControlesCaida.tsx` (`Pressable`
 * normal, sistema de touch clásico de RN, sin gesture-handler) andaban
 * perfecto. Eso aisló el problema a la vinculación nativa de
 * `react-native-gesture-handler` en este build específico, no al código del
 * gesto en sí (se probaron y descartaron, en orden: `minDistance(0)`,
 * `onEnd` vs `onFinalize`, memoizar con `useMemo`, agregar `forwardRef` a
 * `TableroTetris`/`TableroColumns` -- ninguno cambió nada porque ningún
 * evento llegaba nunca). `PanResponder` usa el mismo sistema de respuesta a
 * toques que ya se sabía andando (el de `Pressable`), corre en el hilo de
 * JS sin necesitar que nada se compile como "worklet", y no depende de
 * gesture-handler en absoluto.
 */
export function useGestoCaida(opts: {
  tileSize: number;
  onIzquierda: () => void;
  onDerecha: () => void;
  onRotar: () => void;
  onCaidaDura: () => void;
  /** Arranca/frena la caída acelerada mientras se mantiene el dedo quieto. */
  onAcelerarInicio?: () => void;
  onAcelerarFin?: () => void;
  activo: boolean;
}): PanResponderInstance {
  // Ref a las opciones (no closures capturadas al crear el PanResponder,
  // que se crea UNA sola vez): así los callbacks siempre ven la versión
  // más nueva de `activo`/`onIzquierda`/etc. sin tener que recrear nada.
  const optsRef = useRef(opts);
  optsRef.current = opts;

  const pasoRef = useRef(Math.max(12, opts.tileSize));
  pasoRef.current = Math.max(12, opts.tileSize);

  const ultimoPasoX = useRef(0);
  const yaCayoDuro = useRef(false);
  const huboMovimiento = useRef(false);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const acelerando = useRef(false);

  const cancelarHold = () => {
    if (holdTimer.current) {
      clearTimeout(holdTimer.current);
      holdTimer.current = null;
    }
  };
  const frenarAcelerado = () => {
    if (acelerando.current) {
      acelerando.current = false;
      optsRef.current.onAcelerarFin?.();
    }
  };

  const panResponderRef = useRef<PanResponderInstance | null>(null);
  if (!panResponderRef.current) {
    panResponderRef.current = PanResponder.create({
      onStartShouldSetPanResponder: () => optsRef.current.activo,
      onMoveShouldSetPanResponder: () => optsRef.current.activo,
      onPanResponderGrant: () => {
        ultimoPasoX.current = 0;
        yaCayoDuro.current = false;
        huboMovimiento.current = false;
        acelerando.current = false;
        cancelarHold();
        holdTimer.current = setTimeout(() => {
          holdTimer.current = null;
          if (yaCayoDuro.current) return;
          acelerando.current = true;
          optsRef.current.onAcelerarInicio?.();
        }, DEMORA_ACELERAR_MS);
      },
      onPanResponderMove: (_evt: GestureResponderEvent, g: PanResponderGestureState) => {
        if (yaCayoDuro.current) return;
        const paso = pasoRef.current;

        if (g.dy >= UMBRAL_CAIDA_PX && Math.abs(g.dy) > Math.abs(g.dx)) {
          cancelarHold();
          frenarAcelerado();
          yaCayoDuro.current = true;
          huboMovimiento.current = true;
          optsRef.current.onCaidaDura();
          return;
        }

        // Un arrastre real (más que el jitter de sostener el dedo) cancela
        // la espera para acelerar: si se está moviendo, no está "quieto".
        if (holdTimer.current && Math.hypot(g.dx, g.dy) >= UMBRAL_TAP_PX) {
          cancelarHold();
        }

        while (g.dx - ultimoPasoX.current >= paso) {
          ultimoPasoX.current += paso;
          huboMovimiento.current = true;
          optsRef.current.onDerecha();
        }
        while (g.dx - ultimoPasoX.current <= -paso) {
          ultimoPasoX.current -= paso;
          huboMovimiento.current = true;
          optsRef.current.onIzquierda();
        }
      },
      onPanResponderRelease: (_evt: GestureResponderEvent, g: PanResponderGestureState) => {
        cancelarHold();
        if (acelerando.current) {
          frenarAcelerado();
          return;
        }
        if (huboMovimiento.current) return;
        if (Math.hypot(g.dx, g.dy) < UMBRAL_TAP_PX) {
          optsRef.current.onRotar();
        }
      },
      onPanResponderTerminate: () => {
        cancelarHold();
        frenarAcelerado();
      },
    });
  }

  return panResponderRef.current;
}
