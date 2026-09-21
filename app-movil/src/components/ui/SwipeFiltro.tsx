import React, { useCallback, useMemo, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import { hapticLeve } from '../../utils/haptics';

type Props<T> = {
  /** Valores en el orden en que se muestran los chips. */
  valores: T[];
  seleccionado: T;
  onSelect: (valor: T) => void;
  children: React.ReactNode;
};

const ARRANQUE_X = 16;
const TOLERANCIA_Y = 30;
const UMBRAL_PX = 40;
const UMBRAL_VEL = 500;

/**
 * Deslizar de costado sobre el contenido pasa al chip siguiente/anterior de una
 * fila de filtros, igual que las solapas de Tránsito o Donaciones. El gesto se
 * crea una sola vez y lee lo último por refs (recrearlo rompe toques cortos).
 */
export function SwipeFiltro<T>({ valores, seleccionado, onSelect, children }: Props<T>) {
  const valoresRef = useRef(valores);
  const selRef = useRef(seleccionado);
  const onSelectRef = useRef(onSelect);
  valoresRef.current = valores;
  selRef.current = seleccionado;
  onSelectRef.current = onSelect;

  const mover = useCallback((delta: number) => {
    const lista = valoresRef.current;
    const i = lista.indexOf(selRef.current) + delta;
    if (i < 0 || i >= lista.length) return;
    hapticLeve();
    onSelectRef.current(lista[i]!);
  }, []);

  const gesto = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX([-ARRANQUE_X, ARRANQUE_X])
        .failOffsetY([-TOLERANCIA_Y, TOLERANCIA_Y])
        .onEnd((e) => {
          if (e.translationX < -UMBRAL_PX || e.velocityX < -UMBRAL_VEL) runOnJS(mover)(1);
          else if (e.translationX > UMBRAL_PX || e.velocityX > UMBRAL_VEL) runOnJS(mover)(-1);
        }),
    [mover]
  );

  return (
    <GestureDetector gesture={gesto}>
      <View style={styles.cuerpo}>{children}</View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({ cuerpo: { flex: 1 } });
