import { useRef } from 'react';
import { GestureResponderEvent, PanResponder, PanResponderGestureState, PanResponderInstance } from 'react-native';

const UMBRAL_TAP_PX = 10;
const UMBRAL_CAIDA_PX = 34;

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

  const panResponderRef = useRef<PanResponderInstance | null>(null);
  if (!panResponderRef.current) {
    panResponderRef.current = PanResponder.create({
      onStartShouldSetPanResponder: () => optsRef.current.activo,
      onMoveShouldSetPanResponder: () => optsRef.current.activo,
      onPanResponderGrant: () => {
        ultimoPasoX.current = 0;
        yaCayoDuro.current = false;
        huboMovimiento.current = false;
      },
      onPanResponderMove: (_evt: GestureResponderEvent, g: PanResponderGestureState) => {
        if (yaCayoDuro.current) return;
        const paso = pasoRef.current;

        if (g.dy >= UMBRAL_CAIDA_PX && Math.abs(g.dy) > Math.abs(g.dx)) {
          yaCayoDuro.current = true;
          huboMovimiento.current = true;
          optsRef.current.onCaidaDura();
          return;
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
        if (huboMovimiento.current) return;
        if (Math.hypot(g.dx, g.dy) < UMBRAL_TAP_PX) {
          optsRef.current.onRotar();
        }
      },
    });
  }

  return panResponderRef.current;
}
