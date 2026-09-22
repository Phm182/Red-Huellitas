import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { Ficha } from './Ficha';
import { FILAS, VACIO } from './motor';

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
  /**
   * Mientras el dedo sostiene y arrastra ESTA ficha: el offset en píxeles
   * crudos (no en casillas), para que la siga 1 a 1 sin resorte de por medio
   * — el resorte es para cuando se suelta, no mientras se sostiene.
   */
  arrastreVivo?: { dx: number; dy: number } | null;
  /**
   * `true` mientras `huematch.tsx` está reproduciendo los pasos de una
   * cascada (`animar()`). Hace falta para distinguir DOS causas distintas de
   * "esta celda cambió de figura sin pasar por `VACIO`":
   *
   * 1. El propio intercambio del jugador (`desplaza` ya lo animó, acá no hay
   *    que hacer nada más) — pasa con `cascadaActiva=false`.
   * 2. Una ficha SUPERVIVIENTE que bajó de lugar en la cascada porque algo
   *    de abajo se limpió — `caerYRellenar()` reacomoda el array por
   *    POSICIÓN, no por identidad de cada ficha, así que la celda que
   *    queda arriba del hueco recibe directamente el valor de la ficha de
   *    más abajo sin pasar por `VACIO` en SU propia celda. Sin distinguir
   *    este caso del anterior, esa ficha cambiaba de golpe sin ninguna
   *    animación — es lo que se veía como "colapsa/parpadea" en cascadas de
   *    2 pasos o más.
   */
  cascadaActiva?: boolean;
};

/**
 * Cuánto dura la desintegración de una ficha que se rompe. Exportada: la
 * pantalla que orquesta la cascada (`huematch.tsx`) tiene que esperar AL
 * MENOS esto antes de tocar el tablero de nuevo, o la corta a mitad.
 */
export const T_ROMPER = 230;
/**
 * Cuánto hay que esperar, como mínimo, después de que caen fichas nuevas
 * (`VACIO` → ficha) para que el escalonado por fila y el resorte de cada una
 * terminen de asentarse. `(FILAS-1)*26` es el retraso de la fila más de
 * arriba (la última en arrancar); el resto es lo que tarda el resorte en
 * asentarse una vez que arranca.
 *
 * Antes `huematch.tsx` esperaba mucho menos que esto entre pasos de una
 * cascada — con matches encadenados, el paso siguiente pisaba esta animación
 * a mitad de camino y arriba le montaba la explosión del próximo match, así
 * que todo se leía como un solo parpadeo en vez de una cascada. Exportar la
 * cuenta acá evita que las dos pantallas vuelvan a desincronizarse adivinando
 * cada una un número distinto.
 */
export const T_CAE = (FILAS - 1) * 26 + 320;
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
export function Celda({ tipo, lado, fila, seleccionada, desplaza, arrastreVivo, cascadaActiva }: Props) {
  const anterior = useRef(tipo);

  const escala = useSharedValue(tipo === VACIO ? 0 : 1);
  const giro = useSharedValue(0);
  const caida = useSharedValue(0);
  const despX = useSharedValue(0);
  const despY = useSharedValue(0);

  /**
   * Qué dibujo mostrar. NO es lo mismo que `tipo`: al explotar, `tipo` pasa a
   * `VACIO` en el mismo render en que arranca la animación de desvanecido —
   * si el dibujo se sacara junto con eso, la ficha desaparecía de un salto
   * (sólo quedaba animando un `View` vacío) y recién al final se notaba el
   * "pop": eso era el "se borran raro" reportado. Achicando el dibujo hasta
   * VACIO en vez de sacarlo de un salto, la ficha se va desvaneciendo de
   * verdad. Se actualiza sólo cuando hay una figura real; se queda con la
   * última mientras esa celda no tenga ninguna (rota o vacía de fábrica).
   */
  const [dibujando, setDibujando] = useState(tipo);
  useEffect(() => {
    if (tipo !== VACIO) setDibujando(tipo);
  }, [tipo]);
  /** Blanco durante el primer tramo de la rotura, mismo lenguaje visual que HueColumns/HueTetris. */
  const [blanco, setBlanco] = useState(false);

  const dx = desplaza?.dx ?? 0;
  const dy = desplaza?.dy ?? 0;

  useEffect(() => {
    // Arrastre en curso: sigue al dedo directo, sin animación — la animación
    // (resorte) es para cuando se suelta, acá se quiere respuesta 1 a 1.
    if (arrastreVivo) {
      despX.value = arrastreVivo.dx;
      despY.value = arrastreVivo.dy;
      return;
    }
    // El mismo camino de ida y de vuelta: cuando el desplazamiento vuelve a
    // cero —porque la jugada no armaba línea— la ficha regresa sola, y eso es
    // exactamente el rebote que uno espera al equivocarse.
    despX.value = withTiming(dx * lado, { duration: T_MOVER });
    despY.value = withTiming(dy * lado, { duration: T_MOVER });
  }, [dx, dy, lado, despX, despY, arrastreVivo]);

  useEffect(() => {
    const antes = anterior.current;
    anterior.current = tipo;

    // Nada cambió PARA ESTA celda puntual: no animar nada. Hace falta este
    // guard explícito porque `cascadaActiva` es una de las dependencias de
    // abajo y es la MISMA prop para las 49 celdas del tablero — en cuanto
    // pasa a `true` (arranca una cascada), este efecto se re-ejecuta en
    // TODAS a la vez, no sólo en las que de verdad cambiaron de figura. Sin
    // este corte, el chequeo de más abajo (`tipo !== VACIO && cascadaActiva`)
    // se cumplía también para las celdas quietas y hacía que el tablero
    // ENTERO reprodujera la animación de caída de golpe en cada match — el
    // "se mueven TODAS las piezas" que se reportó.
    if (antes === tipo) return;

    // Se rompió: mismo lenguaje visual que HueColumns/HueTetris — flash
    // blanco creciendo un toque (primer 30% del tiempo) y después se apaga
    // encogiendo y desvaneciendo junto (`estilo` usa `escala.value` para
    // las dos). Antes achicaba directo a color propio y sin flash, que
    // junto con el bug de abajo (`dibujando`, no `tipo`, es lo que se
    // dibuja) se leía como un "borrado raro" en vez de una explosión.
    if (antes !== VACIO && tipo === VACIO) {
      giro.value = 0;
      setBlanco(true);
      const faseFlash = Math.round(T_ROMPER * 0.3);
      escala.value = withSequence(
        withTiming(1.18, { duration: faseFlash, easing: Easing.out(Easing.quad) }),
        withTiming(0, { duration: T_ROMPER - faseFlash, easing: Easing.out(Easing.quad) })
      );
      return;
    }

    // Cayó una nueva ficha (VACIO→figura), O una superviviente bajó de lugar
    // durante la cascada (figura→OTRA figura distinta, sin pasar por VACIO
    // en esta celda puntual — ver el comentario de `cascadaActiva` arriba):
    // las dos entran "desde arriba" con la misma animación. El retraso por
    // fila hace que la columna caiga de a una en vez de aparecer todo el
    // bloque junto. Sin rebote a propósito (pedido explícito): antes era un
    // resorte que pegaba un envión al asentarse; ahora cae y frena en su
    // lugar, sin pasarse ni volver.
    if (tipo !== VACIO && (antes === VACIO || cascadaActiva)) {
      giro.value = 0;
      setBlanco(false);
      caida.value = -1;
      escala.value = 1;
      caida.value = withDelay(fila * 26, withTiming(0, { duration: 220, easing: Easing.out(Easing.cubic) }));
      return;
    }

    // Cambió de figura sin pasar por vacío Y fuera de una cascada: es el
    // final de un intercambio, y el movimiento ya lo contó el deslizamiento.
    // No se anima nada más acá; un pulso encima se leería como un segundo
    // evento.
  }, [tipo, fila, escala, giro, caida, cascadaActiva]);

  const estilo = useAnimatedStyle(() => ({
    transform: [
      { translateX: despX.value },
      { translateY: caida.value * lado + despY.value },
      { scale: escala.value * (seleccionada ? 1.12 : 1) },
      { rotate: `${giro.value * 180}deg` },
    ],
    opacity: escala.value,
    // La ficha que viaja (o que arrastra el dedo) pasa por encima de sus
    // vecinas, si no se ve cortada al cruzar el borde de la casilla.
    zIndex: dx !== 0 || dy !== 0 || arrastreVivo ? 2 : 1,
  }));

  return (
    <Animated.View style={[styles.wrap, estilo]}>
      {dibujando === VACIO ? null : (
        <Ficha tipo={dibujando} size={lado * 0.78} colorOverride={blanco ? '#FFFFFF' : undefined} />
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
});
