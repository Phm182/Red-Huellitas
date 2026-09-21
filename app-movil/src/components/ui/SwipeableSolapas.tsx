import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS, useSharedValue } from 'react-native-reanimated';
import { SolapaTabs } from './FilterSelect';
import { hapticLeve } from '../../utils/haptics';

type TabDef<T extends string> = { key: T; label: string };

type Props<T extends string> = {
  tabs: TabDef<T>[];
  activa: T;
  onChange: (key: T) => void;
  children: React.ReactNode;
  /** false si la pantalla dibuja sus propias solapas y sólo quiere el gesto. */
  mostrarTabs?: boolean;
};

/**
 * Cuánto tiene que moverse el dedo hacia los costados para que el gesto
 * arranque, y cuánto puede desviarse en vertical antes de darlo por perdido.
 *
 * Antes eran 48 px de arranque y sólo 10 px de tolerancia vertical: un pulgar
 * que arrastra 48 px hacia un costado casi siempre se corre más de 10 px hacia
 * arriba o abajo, así que el gesto se cancelaba y el cambio de solapa iba "a
 * veces sí, a veces no". Ahora arranca antes y tolera el desvío natural.
 */
const ARRANQUE_X = 16;
const TOLERANCIA_Y = 30;
/** Recorrido (px) o velocidad (px/s) a partir de los cuales cuenta como cambio. */
const UMBRAL_PX = 40;
const UMBRAL_VEL = 500;

/**
 * Solapas + swipe horizontal para cambiar de pestaña (como Huelligram).
 * El contenido es uno solo: al soltar el gesto se llama `onChange`.
 */
export function SwipeableSolapas<T extends string>({
  tabs,
  activa,
  onChange,
  children,
  mostrarTabs = true,
}: Props<T>) {
  const indice = useSharedValue(Math.max(0, tabs.findIndex((t) => t.key === activa)));
  const total = useSharedValue(tabs.length);

  // Lo último que dijo el padre, en refs: el gesto se crea una sola vez y no se
  // puede quedar con un `activa`/`onChange` viejo capturado.
  const tabsRef = useRef(tabs);
  const activaRef = useRef(activa);
  const onChangeRef = useRef(onChange);
  tabsRef.current = tabs;
  activaRef.current = activa;
  onChangeRef.current = onChange;

  useEffect(() => {
    const i = tabs.findIndex((t) => t.key === activa);
    if (i >= 0) indice.value = i;
    total.value = tabs.length;
  }, [activa, tabs, indice, total]);

  const cambiar = useCallback((destino: number) => {
    const lista = tabsRef.current;
    const clamped = Math.max(0, Math.min(lista.length - 1, destino));
    if (lista[clamped]!.key !== activaRef.current) {
      hapticLeve();
      onChangeRef.current(lista[clamped]!.key);
    }
  }, []);

  // Un solo objeto de gesto para toda la vida del componente: recrearlo en cada
  // render hace que el detector vuelva a montar el handler nativo a mitad de un
  // gesto, que es otra causa de que a veces no responda.
  const gesto = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX([-ARRANQUE_X, ARRANQUE_X])
        .failOffsetY([-TOLERANCIA_Y, TOLERANCIA_Y])
        .onEnd((e) => {
          const i = indice.value;
          let destino = i;
          if (e.translationX < -UMBRAL_PX || e.velocityX < -UMBRAL_VEL) {
            destino = i + 1;
          } else if (e.translationX > UMBRAL_PX || e.velocityX > UMBRAL_VEL) {
            destino = i - 1;
          }
          if (destino !== i && destino >= 0 && destino < total.value) {
            runOnJS(cambiar)(destino);
          }
        }),
    [indice, total, cambiar]
  );

  return (
    <View style={styles.root}>
      {mostrarTabs ? <SolapaTabs tabs={tabs} activa={activa} onChange={onChange} /> : null}
      <GestureDetector gesture={gesto}>
        <View style={styles.cuerpo}>{children}</View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  cuerpo: { flex: 1 },
});
