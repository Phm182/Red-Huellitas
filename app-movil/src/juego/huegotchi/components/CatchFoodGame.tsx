import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../../theme/ThemeProvider';
import { radii } from '../../../theme/elevation';

type FoodItem = {
  id: number;
  x: number;
  emoji: string;
  anim: Animated.Value;
  caught: boolean;
};

const FOOD_EMOJI = ['🍎', '🍗', '🐟', '🥕', '🍪'];
const TOTAL_ITEMS = 12;
const BOX_W = 240;
const BOX_H = 170;
const FALL_MS = 2100;

type Props = {
  onFinish: (caught: number, total: number) => void;
};

/** Minijuego "atrapar comida" para el rasgo glotón: tocar antes de que toque el piso. */
export function CatchFoodGame({ onFinish }: Props) {
  const { colors } = useTheme();
  const [items, setItems] = useState<FoodItem[]>([]);
  const [spawned, setSpawned] = useState(0);
  const [caught, setCaught] = useState(0);
  const nextId = useRef(0);
  const finishedRef = useRef(false);

  const finishIfDone = useCallback(
    (resolvedCount: number) => {
      if (resolvedCount >= TOTAL_ITEMS && !finishedRef.current) {
        finishedRef.current = true;
        setTimeout(() => onFinish(caughtRef.current, TOTAL_ITEMS), 250);
      }
    },
    [onFinish]
  );

  const caughtRef = useRef(0);
  const resolvedRef = useRef(0);

  useEffect(() => {
    if (spawned >= TOTAL_ITEMS) return;
    const t = setTimeout(() => {
      const id = nextId.current++;
      const item: FoodItem = {
        id,
        x: 8 + Math.random() * (BOX_W - 40),
        emoji: FOOD_EMOJI[Math.floor(Math.random() * FOOD_EMOJI.length)]!,
        anim: new Animated.Value(0),
        caught: false,
      };
      setItems((prev) => [...prev, item]);
      setSpawned((n) => n + 1);
      Animated.timing(item.anim, {
        toValue: 1,
        duration: FALL_MS,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) {
          setItems((prev) => prev.filter((it) => it.id !== id));
          resolvedRef.current += 1;
          finishIfDone(resolvedRef.current);
        }
      });
    }, 650);
    return () => clearTimeout(t);
  }, [spawned, finishIfDone]);

  const catchItem = useCallback(
    (id: number) => {
      setItems((prev) => prev.filter((it) => it.id !== id));
      caughtRef.current += 1;
      resolvedRef.current += 1;
      setCaught((n) => n + 1);
      finishIfDone(resolvedRef.current);
    },
    [finishIfDone]
  );

  return (
    <View style={[styles.box, { width: BOX_W, height: BOX_H, backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text style={[styles.score, { color: colors.textMuted }]}>
        {caught} / {TOTAL_ITEMS}
      </Text>
      {items.map((item) => (
        <Animated.View
          key={item.id}
          style={{
            position: 'absolute',
            left: item.x,
            top: 0,
            transform: [
              {
                translateY: item.anim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, BOX_H - 32],
                }),
              },
            ],
          }}
        >
          <Pressable hitSlop={10} onPress={() => catchItem(item.id)} style={styles.foodHit}>
            <Text style={styles.foodEmoji}>{item.emoji}</Text>
          </Pressable>
        </Animated.View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    borderWidth: 1,
    borderRadius: radii.lg,
    overflow: 'hidden',
    marginTop: 10,
  },
  score: { position: 'absolute', top: 6, right: 10, fontSize: 12, zIndex: 2 },
  foodHit: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  foodEmoji: { fontSize: 22 },
});
