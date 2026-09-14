import { Gesture } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';

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
 */
export function crearGestoCaida(opts: {
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

  // Estos "refs" son variables de módulo capturadas por cierre del gesto,
  // no de React — v2 de gesture-handler permite mutar variables normales
  // dentro de los callbacks del gesto sin problema (no son `SharedValue`,
  // pero tampoco hace falta: sólo los lee el propio gesto).
  let ultimoPasoX = 0;
  let yaCayoDuro = false;
  let huboMovimiento = false;

  return Gesture.Pan()
    .enabled(opts.activo)
    .onStart(() => {
      ultimoPasoX = 0;
      yaCayoDuro = false;
      huboMovimiento = false;
    })
    .onUpdate((e) => {
      if (yaCayoDuro) return;

      if (e.translationY - 0 >= UMBRAL_CAIDA_PX && Math.abs(e.translationY) > Math.abs(e.translationX)) {
        yaCayoDuro = true;
        huboMovimiento = true;
        runOnJS(opts.onCaidaDura)();
        return;
      }

      while (e.translationX - ultimoPasoX >= paso) {
        ultimoPasoX += paso;
        huboMovimiento = true;
        runOnJS(opts.onDerecha)();
      }
      while (e.translationX - ultimoPasoX <= -paso) {
        ultimoPasoX -= paso;
        huboMovimiento = true;
        runOnJS(opts.onIzquierda)();
      }
    })
    .onEnd((e) => {
      if (huboMovimiento) return;
      const dist = Math.hypot(e.translationX, e.translationY);
      if (dist < UMBRAL_TAP_PX) {
        runOnJS(opts.onRotar)();
      }
    });
}
