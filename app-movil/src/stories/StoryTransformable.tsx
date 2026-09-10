import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LayoutChangeEvent, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS, SharedValue, useSharedValue } from 'react-native-reanimated';
import { PinchRotateTarget } from './storyEditorTypes';

type Patch = { x?: number; y?: number; scale?: number; rotation?: number };

type Props = {
  x: number;
  y: number;
  scale: number;
  rotation: number;
  canvasW: number;
  canvasH: number;
  selected: boolean;
  editable: boolean;
  /** 'text' | 'sticker' — para escribir `targetInfo` con el tipo correcto
   * al seleccionar. */
  kind: 'text' | 'sticker';
  id: string;
  /** Shared value de `StoryEditor` (`gestoFoto`) — a qué le pega el
   * pellizco/giro de 2 dedos que vive AHÍ, no acá. Se escribe DIRECTO
   * (hilo de UI, sin pasar por React state) al arrancar el arrastre/toque
   * de este ítem: si sólo pasara por `onSelect` → `setSelectedTextId` →
   * re-render → efecto, un segundo dedo que llega casi a la vez que el
   * primero (un pellizco real arranca así) podía encontrar el blanco
   * todavía desactualizado — se sentía como "el segundo dedo agarra 1 de
   * cada 20 veces". Escribiéndolo acá mismo, en el mismo worklet que ya
   * atiende al primer dedo, el segundo lo encuentra listo de inmediato.
   */
  targetInfo: SharedValue<PinchRotateTarget>;
  onSelect: () => void;
  /** Tocar el mismo ítem YA seleccionado, de nuevo — así se puede volver a
   * tocar la foto de fondo (que se apaga mientras algo está seleccionado,
   * ver `StoryEditor`) sin agregar un botón nuevo. */
  onDeselect: () => void;
  onChange: (patch: Patch) => void;
  children: React.ReactNode;
};

// `'worklet'` explícito: se llama desde `.onUpdate` (hilo de UI), y sin la
// directiva revienta en tiempo de ejecución con "Tried to synchronously
// call a Remote Function" apenas se arrastra de verdad (no al tocar los
// botones +/-/rotar, que corren en JS — por eso no se veía antes).
const clampPos = (v: number) => {
  'worklet';
  return Math.min(0.95, Math.max(0.05, v));
};

/**
 * Ítem manipulable de Historias (texto o sticker): arrastrar con un dedo —
 * como en Instagram. El pellizco (escalar) y el giro (rotar) con DOS dedos
 * NO están acá: viven en `StoryEditor` (`gestoFoto`), en un
 * `GestureDetector` que cubre TODO el canvas, no el recuadro chico de este
 * ítem — react-native-gesture-handler hace su propio hit-test por CADA dedo
 * nuevo contra la vista de la que cuelga cada gesto, así que un
 * `Gesture.Pinch()` acá nunca ve un segundo dedo que cae afuera de este
 * recuadro (aunque tenga `hitSlop`), y en Instagram el segundo dedo de un
 * pellizco puede ir a cualquier lado de la pantalla. Ver el comentario en
 * `StoryEditor.tsx` (`gestoFoto`) para el porqué completo.
 *
 * Mismo criterio que ya usa el pellizco de la foto y el carrusel de
 * HuePlay para el arrastre: el gesto CONGELA el valor base al arrancar
 * (`onStart`) y calcula todo como delta contra eso en `onUpdate` — `Pan` de
 * `react-native-gesture-handler` ya viene como "acumulado desde que arrancó
 * el gesto", no incremento cuadro a cuadro, así que sumar directo contra la
 * base es correcto.
 */
export function StoryTransformable({
  x,
  y,
  scale,
  rotation,
  canvasW,
  canvasH,
  selected,
  editable,
  kind,
  id,
  targetInfo,
  onSelect,
  onDeselect,
  onChange,
  children,
}: Props) {
  const [size, setSize] = useState({ w: 0, h: 0 });
  // Valor MÁS RECIENTE de las props, leíble desde el hilo de UI: los
  // callbacks de gesto son worklets, así que un `useRef` común no sirve acá
  // — Reanimated avisa ("Tried to modify key `current` of an object which
  // has been already passed to a worklet") en cuanto ese ref ya fue
  // capturado por un gesto y se lo vuelve a mutar desde JS en el próximo
  // render. `useSharedValue` es justo el mecanismo pensado para esto.
  const actual = useSharedValue({ x, y, scale, rotation, canvasW, canvasH, selected });
  useEffect(() => {
    actual.value = { x, y, scale, rotation, canvasW, canvasH, selected };
  }, [actual, x, y, scale, rotation, canvasW, canvasH, selected]);
  // Igual que `actual`, pero de escritura EXCLUSIVA del propio gesto (nunca
  // del render): también tiene que ser `useSharedValue`, no `useRef`. Con
  // `useRef`, `onSelect`/`onChange` (llamados vía `runOnJS` dentro de
  // `onStart`) disparan un re-render de `StoryEditor` ANTES de que termine
  // el gesto; eso recrea `pan` de nuevo (es un objeto `Gesture...` normal,
  // no memoizado) y ese "reinstalar" el gesto a mitad de camino hace que el
  // `useRef` deje de estar sincronizado con el hilo de UI — se veía como
  // "arrastrar tira el ítem a la esquina": `onStart` anotaba bien la base
  // (0.5) pero el PRIMER `onUpdate` la volvía a leer en 0. Memoizar el
  // gesto (abajo) es la otra mitad del arreglo: sin eso, cada re-render
  // sigue reinstalando el detector aunque la base ahora sobreviva.
  const base = useSharedValue({ x: 0, y: 0 });

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (width !== size.w || height !== size.h) setSize({ w: width, h: height });
  };

  // `onSelect`/`onChange` llegan como closures NUEVAS en cada render (el que
  // los pasa — `StoryDraggableText`/`StoryDraggableSticker` — arma un arrow
  // function distinto cada vez). Si el `useMemo` de abajo las tuviera como
  // dependencia, se volvería a recrear el gesto en cada render igual que sin
  // memoizar. Esta indirección (ref + trampolín ESTABLE) deja que
  // `onSelect`/`onChange` cambien sin recrear el gesto: el trampolín corre
  // en el hilo de JS (es lo que hace `runOnJS`), así que leer `.current` ahí
  // es una lectura de ref común, no la mutación-tras-worklet que revienta en
  // un `useRef` leído DESDE el worklet.
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;
  const onDeselectRef = useRef(onDeselect);
  onDeselectRef.current = onDeselect;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const callSelect = useCallback(() => onSelectRef.current(), []);
  const callDeselect = useCallback(() => onDeselectRef.current(), []);
  const callChange = useCallback((patch: Patch) => onChangeRef.current(patch), []);

  const gesto = useMemo(() => {
    // Margen invisible alrededor del recuadro real: un texto o emoji chico
    // (56px el emoji) es más chico que un dedo — sin esto cuesta agarrarlo
    // la primera vez.
    const pan = Gesture.Pan()
      .enabled(editable)
      .hitSlop(24)
      // Un solo dedo: con 2 dedos abajo, mover el ítem lo resuelve el
      // pellizco de `StoryEditor` (`canvasPinch`, con el punto focal entre
      // los dos dedos) — si este `pan` también seguyera activo sin este
      // límite, los dos calcularían una posición "absoluta" cada uno por su
      // cuenta y se pisarían entre sí en cada cuadro (aunque el merge de
      // `updateText`/`updateSticker` sea correcto, cada llamada trae un
      // x/y ya resuelto, no un parche progresivo).
      .minPointers(1)
      .maxPointers(1)
      .onStart(() => {
        // Directo, ANTES del `runOnJS` (que cruza al hilo de JS y tarda):
        // así un segundo dedo que llega casi a la vez ya encuentra el
        // pellizco/giro de `StoryEditor` apuntando acá.
        targetInfo.value = {
          kind,
          id,
          scale: actual.value.scale,
          rotation: actual.value.rotation,
          x: actual.value.x,
          y: actual.value.y,
        };
        runOnJS(callSelect)();
        base.value = { x: actual.value.x, y: actual.value.y };
      })
      .onUpdate((e) => {
        const { canvasW: w, canvasH: h } = actual.value;
        if (w <= 0 || h <= 0) return;
        runOnJS(callChange)({
          x: clampPos(base.value.x + e.translationX / w),
          y: clampPos(base.value.y + e.translationY / h),
        });
      });

    const tap = Gesture.Tap()
      .enabled(editable)
      .hitSlop(24)
      .onStart(() => {
        // Tocar el mismo ítem ya seleccionado, de nuevo, lo deselecciona
        // — es la forma de volver a habilitar el pellizco/arrastre de la
        // foto de fondo (apagado mientras algo está seleccionado, ver
        // `StoryEditor`) sin agregar un botón nuevo.
        if (actual.value.selected) {
          // 'none' temporal: si no, un pellizco que arranca justo después
          // de deseleccionar (antes de que `StoryEditor` recalcule su
          // propio destino) seguiría apuntando a ESTE ítem, ya
          // deseleccionado.
          targetInfo.value = { kind: 'none', id: null, scale: 1, rotation: 0, x: 0, y: 0 };
          runOnJS(callDeselect)();
        } else {
          targetInfo.value = {
            kind,
            id,
            scale: actual.value.scale,
            rotation: actual.value.rotation,
            x: actual.value.x,
            y: actual.value.y,
          };
          runOnJS(callSelect)();
        }
      });

    return Gesture.Simultaneous(pan, tap);
    // `editable` SÍ recrea el gesto (cambia poco — al cambiar de
    // herramienta, no en cada pixel arrastrado). Todo lo demás
    // (`onSelect`/`onChange`) pasa por el trampolín estable de arriba para
    // NO estar acá.
  }, [actual, base, editable, kind, id, targetInfo, callSelect, callDeselect, callChange]);

  return (
    <GestureDetector gesture={gesto}>
      <View
        onLayout={onLayout}
        style={[
          styles.wrap,
          selected && editable && styles.selected,
          {
            left: x * canvasW - size.w / 2,
            top: y * canvasH - size.h / 2,
            transform: [{ rotate: `${rotation}deg` }, { scale: scale || 1 }],
          },
        ]}
      >
        {children}
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  selected: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.7)',
    borderStyle: 'dashed',
    borderRadius: 8,
  },
});
