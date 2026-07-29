import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { LayoutChangeEvent, Platform, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { JuegoAnimo } from '../../../types';
import { AccionMascota } from '../../../components/MascotaAvatar';
import { buildAppearance } from '../appearance';
import { playPetVoice } from '../audio/PetVoice';
import { LOOK_LERP } from '../lookAt';
import { resolveHueGotchiState } from '../PetStateMachine';
import { PetAppearance } from '../types';
import { ClayPet } from './ClayPet';

type Props = {
  especie: string;
  animo: JuegoAnimo;
  accion?: AccionMascota;
  disparo?: number;
  tamano?: number;
  appearance?: Partial<PetAppearance>;
};

/**
 * HueGotchi interactivo: personaje clay SVG + squash/stretch + look-at + voz.
 * Sin GIF ni Rive (Rive rompía el bundle web).
 */
export function InteractivePet({
  especie,
  animo,
  accion = null,
  disparo = 0,
  tamano = 280,
  appearance: appearancePartial,
}: Props) {
  const appearance = useMemo(
    () => buildAppearance(especie, appearancePartial),
    [especie, appearancePartial]
  );

  const state = resolveHueGotchiState({ animo, accion });
  const stageRef = useRef<View>(null);
  const stageLayout = useRef({ x: 0, y: 0, w: tamano, h: tamano * 1.12 });

  const [look, setLook] = useState({ x: 0, y: 0 });
  const lookTarget = useRef({ x: 0, y: 0 });
  const lookCurrent = useRef({ x: 0, y: 0 });

  const dragX = useSharedValue(0);
  const dragY = useSharedValue(0);
  const scaleX = useSharedValue(1);
  const scaleY = useSharedValue(1);
  const breath = useSharedValue(1);
  const shadowScale = useSharedValue(1);
  const sleepDim = useSharedValue(0);
  const press = useSharedValue(1);

  const peso = appearance.peso;
  const longitud = appearance.longitud;
  const sizeMul = appearance.tamano;

  // Lerp look-at en JS (ojos del SVG).
  useEffect(() => {
    let raf = 0;
    let alive = true;
    const tick = () => {
      if (!alive) return;
      const c = lookCurrent.current;
      const t = lookTarget.current;
      c.x += (t.x - c.x) * LOOK_LERP;
      c.y += (t.y - c.y) * LOOK_LERP;
      setLook({ x: c.x, y: c.y });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
    };
  }, []);

  useEffect(() => {
    if (state === 'sleeping') {
      sleepDim.value = withTiming(0.35, { duration: 700 });
      breath.value = withTiming(0.98, { duration: 700 });
      return;
    }
    sleepDim.value = withTiming(0, { duration: 280 });
    const lento = animo === 'decaido';
    const amp = lento ? 0.012 : 0.028;
    const dur = lento ? 2200 : 1300;
    breath.value = withRepeat(
      withSequence(
        withTiming(1 + amp, { duration: dur, easing: Easing.inOut(Easing.sin) }),
        withTiming(1, { duration: dur, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      false
    );
  }, [state, animo, breath, sleepDim]);

  const setLookFromPage = (pageX: number, pageY: number) => {
    const s = stageLayout.current;
    const cx = s.x + s.w / 2;
    const cy = s.y + s.h / 2;
    lookTarget.current = {
      x: Math.max(-1, Math.min(1, (pageX - cx) / (s.w / 2 || 1))),
      y: Math.max(-1, Math.min(1, (pageY - cy) / (s.h / 2 || 1))),
    };
  };

  const resetLookSoon = () => {
    setTimeout(() => {
      lookTarget.current = { x: 0, y: 0 };
    }, 1600);
  };

  const onPokeVoice = () => {
    void playPetVoice({ especie: appearance.especie, animo, motivo: 'tap' });
  };

  useEffect(() => {
    if (accion) {
      void playPetVoice({ especie: appearance.especie, animo, motivo: 'accion' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accion]);

  useEffect(() => {
    if (disparo && disparo > 0) {
      scaleX.value = withSequence(withSpring(1.12, { damping: 8 }), withSpring(1));
      scaleY.value = withSequence(withSpring(0.9, { damping: 8 }), withSpring(1));
    }
  }, [disparo, scaleX, scaleY]);

  const pan = Gesture.Pan()
    .onBegin(() => {
      press.value = withSpring(0.97, { damping: 16, stiffness: 280 });
    })
    .onUpdate((e) => {
      dragX.value = e.translationX * 0.35;
      dragY.value = e.translationY * 0.25;
      const mag = Math.min(1, Math.hypot(e.translationX, e.translationY) / 120);
      const squash = 1 - mag * 0.12 * peso;
      const stretch = 1 + mag * 0.14 * peso;
      if (Math.abs(e.translationX) > Math.abs(e.translationY)) {
        scaleX.value = stretch;
        scaleY.value = squash;
      } else {
        scaleX.value = squash;
        scaleY.value = stretch;
      }
      shadowScale.value = 1 + mag * 0.25;
      runOnJS(setLookFromPage)(e.absoluteX, e.absoluteY);
    })
    .onEnd(() => {
      dragX.value = withSpring(0, { damping: 12, stiffness: 160 });
      dragY.value = withSpring(0, { damping: 12, stiffness: 160 });
      scaleX.value = withSequence(
        withSpring(1.08, { damping: 8, stiffness: 220 }),
        withSpring(1, { damping: 10, stiffness: 180 })
      );
      scaleY.value = withSequence(
        withSpring(0.92, { damping: 8, stiffness: 220 }),
        withSpring(1, { damping: 10, stiffness: 180 })
      );
      shadowScale.value = withSpring(1);
      press.value = withSpring(1);
      runOnJS(resetLookSoon)();
    });

  const tap = Gesture.Tap().onEnd((e) => {
    press.value = withSequence(
      withTiming(0.94, { duration: 70 }),
      withSpring(1.04, { damping: 8 }),
      withSpring(1)
    );
    scaleX.value = withSequence(
      withTiming(1.12, { duration: 90 }),
      withSpring(0.94, { damping: 9 }),
      withSpring(1)
    );
    scaleY.value = withSequence(
      withTiming(0.88, { duration: 90 }),
      withSpring(1.06, { damping: 9 }),
      withSpring(1)
    );
    runOnJS(setLookFromPage)(e.absoluteX, e.absoluteY);
    runOnJS(onPokeVoice)();
    runOnJS(resetLookSoon)();
  });

  const gesture = Gesture.Exclusive(pan, tap);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    const onMove = (ev: MouseEvent) => setLookFromPage(ev.clientX, ev.clientY);
    window.addEventListener('mousemove', onMove, { passive: true });
    return () => window.removeEventListener('mousemove', onMove);
  }, []);

  const petStyleSafe = useAnimatedStyle(() => ({
    transform: [
      { translateX: dragX.value },
      { translateY: dragY.value },
      { scale: press.value * breath.value * sizeMul },
      { scaleX: scaleX.value * longitud },
      { scaleY: scaleY.value },
    ],
  }));

  const shadowStyle = useAnimatedStyle(() => ({
    transform: [
      { scaleX: shadowScale.value * longitud },
      { scaleY: 0.55 },
      { translateX: dragX.value * 0.3 },
    ],
    opacity: 0.2,
  }));

  const sleepStyle = useAnimatedStyle(() => ({ opacity: sleepDim.value }));
  const zzzStyle = useAnimatedStyle(() => ({
    opacity: sleepDim.value > 0.05 ? 1 : 0,
    transform: [{ translateY: -sleepDim.value * 24 }],
  }));

  const onLayout = (_e: LayoutChangeEvent) => {
    stageRef.current?.measureInWindow((x, y, width, height) => {
      stageLayout.current = { x, y, w: width, h: height };
    });
  };

  const box = tamano;

  return (
    <View ref={stageRef} style={[styles.stage, { width: box, height: box * 1.12 }]} onLayout={onLayout}>
      <LinearGradient
        colors={['rgba(255,255,255,0)', 'rgba(120, 90, 60, 0.07)', 'rgba(80, 60, 40, 0.12)']}
        style={styles.floor}
        pointerEvents="none"
      />

      <Animated.View style={[styles.shadow, { width: box * 0.55, top: box * 0.9 }, shadowStyle]} />
      <Animated.Text style={[styles.zzz, zzzStyle]}>zzz</Animated.Text>

      <GestureDetector gesture={gesture}>
        <Animated.View style={[{ width: box, height: box }, petStyleSafe]}>
          <ClayPet
            size={box}
            especie={appearance.especie}
            state={state}
            coat={appearance.colorPiel}
            lookX={look.x}
            lookY={look.y}
          />
          <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.sleep, sleepStyle]} />
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  stage: {
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  floor: {
    ...StyleSheet.absoluteFillObject,
    top: '50%',
    borderRadius: 24,
  },
  shadow: {
    position: 'absolute',
    height: 26,
    borderRadius: 999,
    backgroundColor: '#1a120c',
    alignSelf: 'center',
  },
  sleep: { backgroundColor: '#0a1628', borderRadius: 24 },
  zzz: {
    position: 'absolute',
    top: 8,
    right: 28,
    zIndex: 4,
    fontSize: 20,
    fontWeight: '700',
    color: '#6B7280',
  },
});
