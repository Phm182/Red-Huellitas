import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import Svg, { Ellipse, G } from 'react-native-svg';

function Huellita({ size, color }: { size: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <G>
        <Ellipse cx="50" cy="62" rx="26" ry="21" fill={color} />
        <Ellipse cx="26" cy="34" rx="9" ry="12" fill={color} />
        <Ellipse cx="44" cy="25" rx="9" ry="13" fill={color} />
        <Ellipse cx="62" cy="26" rx="9" ry="12" fill={color} />
        <Ellipse cx="78" cy="41" rx="8" ry="11" fill={color} />
      </G>
    </Svg>
  );
}

const COLORES = ['#E8577E', '#4CC3A5', '#F2B84B', '#5B9AD6', '#B36FE0'];

function Particula({ semilla, angulo, distancia, color }: { semilla: number; angulo: number; distancia: number; color: string }) {
  const progreso = useSharedValue(0);

  useEffect(() => {
    progreso.value = 0;
    progreso.value = withDelay(
      (semilla % 5) * 30,
      withTiming(1, { duration: 700, easing: Easing.out(Easing.cubic) })
    );
    // Se dispara una sola vez, cuando la celebración se monta.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const estilo = useAnimatedStyle(() => {
    const rad = (angulo * Math.PI) / 180;
    return {
      opacity: 1 - progreso.value,
      transform: [
        { translateX: Math.cos(rad) * distancia * progreso.value },
        { translateY: Math.sin(rad) * distancia * progreso.value - 40 * progreso.value },
        { rotate: `${angulo}deg` },
        { scale: 0.6 + 0.5 * progreso.value },
      ],
    };
  });

  return (
    <Animated.View style={[styles.particula, estilo]}>
      <Huellita size={26} color={color} />
    </Animated.View>
  );
}

/**
 * Huellitas que explotan hacia afuera al ganar — el evento visual propio de
 * "ganaste" que HueConecta no tiene (ahí sólo hay texto + haptic). Se monta
 * una sola vez por victoria: el caller la renderiza condicionalmente.
 *
 * Vive en `juego/comun/` porque no tiene nada específico de un juego —
 * la usan tanto Damas como Ajedrez.
 */
export function CelebracionPatitas() {
  const particulas = Array.from({ length: 10 }, (_, i) => ({
    angulo: (360 / 10) * i,
    distancia: 90 + (i % 3) * 20,
    color: COLORES[i % COLORES.length],
  }));

  return (
    <View pointerEvents="none" style={styles.wrap}>
      {particulas.map((p, i) => (
        <Particula key={i} semilla={i} angulo={p.angulo} distancia={p.distancia} color={p.color} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 0,
    height: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  particula: { position: 'absolute', width: 26, height: 26, marginLeft: -13, marginTop: -13 },
});
