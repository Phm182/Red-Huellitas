import React, { useEffect } from 'react';
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
};

/**
 * Solapas + swipe horizontal para cambiar de pestaña (como Huelligram).
 * El contenido es uno solo: al soltar el gesto se llama `onChange`.
 */
export function SwipeableSolapas<T extends string>({ tabs, activa, onChange, children }: Props<T>) {
  const indice = useSharedValue(Math.max(0, tabs.findIndex((t) => t.key === activa)));

  useEffect(() => {
    const i = tabs.findIndex((t) => t.key === activa);
    if (i >= 0) indice.value = i;
  }, [activa, tabs, indice]);

  const cambiar = (destino: number) => {
    const clamped = Math.max(0, Math.min(tabs.length - 1, destino));
    if (tabs[clamped].key !== activa) {
      hapticLeve();
      onChange(tabs[clamped].key);
    }
  };

  const gesto = Gesture.Pan()
    .activeOffsetX([-48, 48])
    .failOffsetY([-10, 10])
    .onEnd((e) => {
      const i = indice.value;
      let destino = i;
      if (e.translationX < -56 || e.velocityX < -650) {
        destino = i + 1;
      } else if (e.translationX > 56 || e.velocityX > 650) {
        destino = i - 1;
      }
      if (destino !== i) {
        runOnJS(cambiar)(destino);
      }
    });

  return (
    <View style={styles.root}>
      <SolapaTabs tabs={tabs} activa={activa} onChange={onChange} />
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
