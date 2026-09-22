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
 * 5 botones: izquierda/derecha con auto-repetición, rotar, acelerar
 * (mantener apretado: baja rápido sin fijarse, se puede seguir moviendo a
 * los costados) y caída dura (un toque, cae al piso y se fija). El botón de
 * acelerar es sólo `onPressIn`/`onPressOut` — nada de `setInterval` propio,
 * el intervalo real lo maneja `motor.ts::actualizar()` con su acumulador de
 * siempre (mismo mecanismo que `useGestoCaida.ts`; ver su comentario sobre
 * el bug viejo que esto evita).
 */
export function ControlesCaida({
  onIzquierda,
  onDerecha,
  onRotar,
  onAcelerarInicio,
  onAcelerarFin,
  onCaidaDura,
  color,
  colorFondo,
}: {
  onIzquierda: () => void;
  onDerecha: () => void;
  onRotar: () => void;
  onAcelerarInicio: () => void;
  onAcelerarFin: () => void;
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
    key?: string,
    size = 26
  ) => (
    <Pressable
      key={key}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      hitSlop={6}
      style={[styles.boton, { backgroundColor: colorFondo, borderColor: color }]}
    >
      <Ionicons name={icono} size={size} color={color} />
    </Pressable>
  );

  return (
    <View style={styles.fila}>
      {boton('chevron-back', () => iniciarRepeticion(onIzquierda), limpiarRepeticion, 'izq')}
      {boton('sync', onRotar, undefined, 'rot')}
      {boton('arrow-down-circle-outline', onAcelerarInicio, onAcelerarFin, 'acel')}
      {boton('chevron-down-circle', onCaidaDura, undefined, 'dura')}
      {boton('chevron-forward', () => iniciarRepeticion(onDerecha), limpiarRepeticion, 'der')}
    </View>
  );
}

const styles = StyleSheet.create({
  fila: { flexDirection: 'row', gap: 8, justifyContent: 'center' },
  boton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
