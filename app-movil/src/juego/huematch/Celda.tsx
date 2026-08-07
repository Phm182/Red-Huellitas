import React, { useEffect, useRef } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
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
  /**
   * Hacia dónde tiene que correrse esta ficha, en casillas.
   *
   * Es lo que hace visible el intercambio: mientras dura, la ficha viaja hasta
   * el lugar de su vecina. Si la jugada no servía, el valor vuelve a cero y la
   * ficha se devuelve sola por el mismo camino.
   */
  desplaza?: { dx: number; dy: number } | null;
};

/** Cuánto dura la desintegración y cuánto la caída. */
const T_ROMPER = 170;
const T_CAER = 220;
/** Lo que tarda una ficha en llegar al lugar de su vecina, y en volver. */
export const T_MOVER = 150;

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
export function Celda({ tipo, lado, fila, seleccionada, desplaza }: Props) {
  const anterior = useRef(tipo);

  const escala = useSharedValue(tipo === VACIO ? 0 : 1);
  const giro = useSharedValue(0);
  const caida = useSharedValue(0);
  const despX = useSharedValue(0);
  const despY = useSharedValue(0);

  const dx = desplaza?.dx ?? 0;
  const dy = desplaza?.dy ?? 0;

  useEffect(() => {
    // El mismo camino de ida y de vuelta: cuando el desplazamiento vuelve a
    // cero —porque la jugada no armaba línea— la ficha regresa sola, y eso es
    // exactamente el rebote que uno espera al equivocarse.
    despX.value = withTiming(dx * lado, { duration: T_MOVER });
    despY.value = withTiming(dy * lado, { duration: T_MOVER });
  }, [dx, dy, lado, despX, despY]);

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

    // Cambió de figura sin pasar por vacío: es el final de un intercambio, y
    // el movimiento ya lo contó el deslizamiento. No se anima nada más acá; un
    // pulso encima se leería como un segundo evento.
  }, [tipo, fila, escala, giro, caida]);

  const estilo = useAnimatedStyle(() => ({
    transform: [
      { translateX: despX.value },
      { translateY: caida.value * lado + despY.value },
      { scale: escala.value * (seleccionada ? 1.12 : 1) },
      { rotate: `${giro.value * 180}deg` },
    ],
    opacity: escala.value,
    // La ficha que viaja pasa por encima de sus vecinas, si no se ve cortada
    // al cruzar el borde de la casilla.
    zIndex: dx !== 0 || dy !== 0 ? 2 : 1,
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
