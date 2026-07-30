/**
 * Overlay de entrenamiento sobre el escenario:
 * - gestos del patrón animados arriba del animal
 * - flash ✓ / ✕ / ⭐ según el resultado
 */

import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { GestureToken, iconoGesto } from '../systems/training';

type Props = {
  patron: GestureToken[] | null;
  pasos: number;
  flash: 'ok' | 'fail' | 'win' | null;
  primary: string;
  surface: string;
  border: string;
};

export function TrickCoachOverlay({ patron, pasos, flash, primary, surface, border }: Props) {
  const pulse = useRef(new Animated.Value(1)).current;
  const flashOp = useRef(new Animated.Value(0)).current;
  const flashScale = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    if (!patron) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.18, duration: 450, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 450, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [patron, pasos, pulse]);

  useEffect(() => {
    if (!flash) {
      flashOp.setValue(0);
      return;
    }
    flashOp.setValue(0);
    flashScale.setValue(0.55);
    Animated.parallel([
      Animated.sequence([
        Animated.timing(flashOp, { toValue: 1, duration: 120, useNativeDriver: true }),
        Animated.timing(flashOp, { toValue: 1, duration: flash === 'win' ? 900 : 400, useNativeDriver: true }),
        Animated.timing(flashOp, { toValue: 0, duration: 280, useNativeDriver: true }),
      ]),
      Animated.spring(flashScale, { toValue: 1, friction: 5, useNativeDriver: true }),
    ]).start();
  }, [flash, flashOp, flashScale]);

  if (!patron && !flash) return null;

  const flashLabel = flash === 'win' ? '⭐' : flash === 'ok' ? '✓' : flash === 'fail' ? '✕' : '';
  const flashColor = flash === 'fail' ? '#D64545' : flash === 'ok' ? '#2E9E5B' : '#E8B84A';

  return (
    <View style={styles.wrap} pointerEvents="none">
      {patron ? (
        <View style={styles.row}>
          {patron.map((g, i) => {
            const hecho = i < pasos;
            const ahora = i === pasos;
            const bubble = (
              <View
                style={[
                  styles.bubble,
                  {
                    borderColor: ahora ? primary : border,
                    backgroundColor: hecho ? primary : surface,
                    borderWidth: ahora ? 2.5 : 1,
                    opacity: hecho ? 0.95 : ahora ? 1 : 0.55,
                  },
                ]}
              >
                <Text style={{ color: hecho ? '#fff' : '#222', fontSize: ahora ? 22 : 18 }}>
                  {iconoGesto(g)}
                </Text>
              </View>
            );
            return ahora ? (
              <Animated.View key={i} style={{ transform: [{ scale: pulse }] }}>
                {bubble}
              </Animated.View>
            ) : (
              <View key={i}>{bubble}</View>
            );
          })}
        </View>
      ) : null}

      {flash ? (
        <Animated.View
          style={[
            styles.flash,
            {
              opacity: flashOp,
              transform: [{ scale: flashScale }],
              backgroundColor: flashColor,
            },
          ]}
        >
          <Text style={styles.flashTxt}>{flashLabel}</Text>
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    paddingTop: 10,
    zIndex: 5,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.82)',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 20,
  },
  bubble: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flash: {
    position: 'absolute',
    top: '38%',
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flashTxt: { color: '#fff', fontSize: 34, fontWeight: '800' },
});
