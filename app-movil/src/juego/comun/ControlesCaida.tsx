import { Ionicons } from '@expo/vector-icons';
import React, { useRef } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

/** Cada cuánto se repite un movimiento mientras se mantiene apretado (ms). */
const REPETICION_MS = 110;
const DEMORA_INICIAL_MS = 220;

/**
 * Control por botones de HueTetris/HueColumns, ADEMÁS del gesto sobre el
 * tablero (`useGestoCaida.ts`) -- pedido explícito: dejar las dos formas de
 * jugar disponibles al mismo tiempo, no una en reemplazo de la otra.
 *
 * Sólo 4 botones (izquierda/derecha con auto-repetición, rotar, caída dura)
 * -- a propósito NO incluye el botón de "caída suave" (mantener apretado
 * para acelerar) que tenía la versión vieja: ESE era el que se reportó con
 * bug real (a veces aceleraba suave, a veces saltaba 2-3 bloques de golpe),
 * porque mezclaba su propio `setInterval` de repetición con el acumulador
 * de caída por tiempo del motor y los dos peleaban por el mismo estado. La
 * caída dura (un solo toque, cae al piso de una) nunca tuvo ese problema, y
 * es la misma acción que ya dispara el deslizar hacia abajo del gesto.
 */
export function ControlesCaida({
  onIzquierda,
  onDerecha,
  onRotar,
  onCaidaDura,
  color,
  colorFondo,
}: {
  onIzquierda: () => void;
  onDerecha: () => void;
  onRotar: () => void;
  onCaidaDura: () => void;
  color: string;
  colorFondo: string;
}) {
  const intervaloRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const demoraRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const limpiarRepeticion = () => {
    if (intervaloRef.current) clearInterval(intervaloRef.current);
    if (demoraRef.current) clearTimeout(demoraRef.current);
    intervaloRef.current = null;
    demoraRef.current = null;
  };

  const iniciarRepeticion = (accion: () => void) => {
    limpiarRepeticion();
    accion();
    demoraRef.current = setTimeout(() => {
      intervaloRef.current = setInterval(accion, REPETICION_MS);
    }, DEMORA_INICIAL_MS);
  };

  const boton = (
    icono: keyof typeof Ionicons.glyphMap,
    onPressIn: () => void,
    onPressOut?: () => void,
    key?: string
  ) => (
    <Pressable
      key={key}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      hitSlop={6}
      style={[styles.boton, { backgroundColor: colorFondo, borderColor: color }]}
    >
      <Ionicons name={icono} size={26} color={color} />
    </Pressable>
  );

  return (
    <View style={styles.fila}>
      {boton('chevron-back', () => iniciarRepeticion(onIzquierda), limpiarRepeticion, 'izq')}
      {boton('sync', onRotar, undefined, 'rot')}
      {boton('chevron-down-circle', onCaidaDura, undefined, 'dura')}
      {boton('chevron-forward', () => iniciarRepeticion(onDerecha), limpiarRepeticion, 'der')}
    </View>
  );
}

const styles = StyleSheet.create({
  fila: { flexDirection: 'row', gap: 10, justifyContent: 'center' },
  boton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
