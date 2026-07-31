/**
 * Overlay de entrenamiento:
 * - leyenda de gestos posibles (sin revelar la secuencia)
 * - progreso por puntos
 * - flash ✓ / ✕ / ⭐
 */

import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { ALL_GESTURES, GestureToken, iconoGesto } from '../systems/training';

type Props = {
  activo: boolean;
  /** Gestos que puede usar este truco (subconjunto). */
  gesturePool: GestureToken[] | null;
  totalPasos: number;
  pasos: number;
  flash: 'ok' | 'fail' | 'win' | null;
  primary: string;
  surface: string;
  border: string;
  textColor: string;
  mutedColor: string;
  titulo?: string | null;
  xpHint?: number | null;
  hintText: string;
  progressLabel: string;
};

export function TrickCoachOverlay({
  activo,
  gesturePool,
  totalPasos,
  pasos,
  flash,
  primary,
  surface,
  border,
  textColor,
  mutedColor,
  titulo,
  xpHint,
  hintText,
  progressLabel,
}: Props) {
  const pulse = useRef(new Animated.Value(1)).current;
  const flashOp = useRef(new Animated.Value(0)).current;
  const flashScale = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    if (!activo || totalPasos <= 0) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1.12,
          duration: 450,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 450,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [activo, pasos, totalPasos, pulse]);

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
        Animated.timing(flashOp, {
          toValue: 1,
          duration: flash === 'win' ? 900 : 400,
          useNativeDriver: true,
        }),
        Animated.timing(flashOp, { toValue: 0, duration: 280, useNativeDriver: true }),
      ]),
      Animated.spring(flashScale, { toValue: 1, friction: 5, useNativeDriver: true }),
    ]).start();
  }, [flash, flashOp, flashScale]);

  if (!activo && !flash) return null;

  const pool = gesturePool && gesturePool.length > 0 ? gesturePool : ALL_GESTURES;
  const flashLabel = flash === 'win' ? '⭐' : flash === 'ok' ? '✓' : flash === 'fail' ? '✕' : '';
  const flashColor = flash === 'fail' ? '#D64545' : flash === 'ok' ? '#2E9E5B' : '#E8B84A';

  return (
    <View style={styles.wrap} pointerEvents="none">
      {activo ? (
        <View style={[styles.card, { backgroundColor: 'rgba(255,255,255,0.9)', borderColor: border }]}>
          {titulo ? (
            <Text style={[styles.title, { color: textColor }]} numberOfLines={1}>
              {titulo}
              {xpHint != null ? ` · +${xpHint} XP` : ''}
            </Text>
          ) : null}
          <Text style={[styles.hint, { color: mutedColor }]}>{hintText}</Text>
          <View style={styles.legend}>
            {pool.map((g) => (
              <View
                key={g}
                style={[styles.legendChip, { borderColor: border, backgroundColor: surface }]}
              >
                <Text style={{ color: textColor, fontSize: 16 }}>{iconoGesto(g)}</Text>
              </View>
            ))}
          </View>
          <Text style={[styles.progressTxt, { color: mutedColor }]}>{progressLabel}</Text>
          <View style={styles.dots}>
            {Array.from({ length: totalPasos }).map((_, i) => {
              const hecho = i < pasos;
              const ahora = i === pasos;
              const dot = (
                <View
                  style={[
                    styles.dot,
                    {
                      borderColor: ahora ? primary : border,
                      backgroundColor: hecho ? primary : surface,
                      borderWidth: ahora ? 2.5 : 1,
                    },
                  ]}
                >
                  {hecho ? (
                    <Text style={{ color: '#fff', fontSize: 11 }}>✓</Text>
                  ) : ahora ? (
                    <Text style={{ color: primary, fontSize: 14 }}>?</Text>
                  ) : null}
                </View>
              );
              return ahora ? (
                <Animated.View key={i} style={{ transform: [{ scale: pulse }] }}>
                  {dot}
                </Animated.View>
              ) : (
                <View key={i}>{dot}</View>
              );
            })}
          </View>
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
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    paddingTop: 8,
    zIndex: 5,
  },
  card: {
    maxWidth: '94%',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: 'center',
  },
  title: { fontSize: 13, fontWeight: '700', marginBottom: 2 },
  hint: { fontSize: 11, textAlign: 'center', marginBottom: 6 },
  legend: { flexDirection: 'row', gap: 6, marginBottom: 6, flexWrap: 'wrap', justifyContent: 'center' },
  legendChip: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressTxt: { fontSize: 11, marginBottom: 4 },
  dots: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  dot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flash: {
    position: 'absolute',
    top: '40%',
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flashTxt: { color: '#fff', fontSize: 34, fontWeight: '800' },
});
