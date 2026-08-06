import React, { useEffect, useRef } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Ficha } from './Ficha';
import { VACIO } from './motor';

type Props = {
  tipo: number;
  lado: number;
  /** Fila, para escalonar la caída: las de arriba entran un toque después. */
  fila: number;
  seleccionada: boolean;
};

/** Cuánto dura la desintegración y cuánto la caída. */
const T_ROMPER = 170;
const T_CAER = 220;

/**
 * Una ficha del tablero, con su vida animada.
 *
 * La gracia está en detectar la TRANSICIÓN, no el estado: el tablero pasa de
 * tener una ficha a `VACIO` cuando explota, y de `VACIO` a otra ficha cuando
 * cae la reposición. Comparando contra el tipo anterior se sabe cuál de las dos
 * cosas pasó, y se dispara la animación que corresponde.
 *
 * Sin esto las fichas aparecían y desaparecían de golpe entre dos renders, que
 * es lo que hacía que el juego se sintiera estático aunque el motor estuviera
 * encadenando cascadas.
 */
export function Celda({ tipo, lado, fila, seleccionada }: Props) {
  const anterior = useRef(tipo);

  const escala = useSharedValue(tipo === VACIO ? 0 : 1);
  const giro = useSharedValue(0);
  const caida = useSharedValue(0);

  useEffect(() => {
    const antes = anterior.current;
    anterior.current = tipo;

    // Se rompió: encoge girando y se apaga.
    if (antes !== VACIO && tipo === VACIO) {
      escala.value = withTiming(0, { duration: T_ROMPER });
      giro.value = withTiming(0.5, { duration: T_ROMPER });
      return;
    }

    // Cayó una nueva: entra desde arriba. El retraso por fila hace que la
    // columna caiga de a una en vez de aparecer todo el bloque junto.
    if (antes === VACIO && tipo !== VACIO) {
      giro.value = 0;
      caida.value = -1;
      escala.value = 1;
      caida.value = withDelay(fila * 26, withSpring(0, { damping: 13, stiffness: 190 }));
      return;
    }

    // Cambió de figura sin pasar por vacío (el intercambio del jugador): un
    // pulso corto, para que se note que algo se movió ahí.
    if (antes !== tipo && antes !== VACIO && tipo !== VACIO) {
      escala.value = withSequence(
        withTiming(1.16, { duration: 90 }),
        withTiming(1, { duration: 110 })
      );
    }
  }, [tipo, fila, escala, giro, caida]);

  const estilo = useAnimatedStyle(() => ({
    transform: [
      { translateY: caida.value * lado },
      { scale: escala.value * (seleccionada ? 1.12 : 1) },
      { rotate: `${giro.value * 180}deg` },
    ],
    opacity: escala.value,
  }));

  return (
    <Animated.View style={[styles.wrap, estilo]}>
      {tipo === VACIO ? null : <Ficha tipo={tipo} size={lado * 0.78} />}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
});
