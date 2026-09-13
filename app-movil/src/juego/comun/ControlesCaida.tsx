import { Ionicons } from '@expo/vector-icons';
import React, { useRef } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

/** Cada cuánto se repite un movimiento mientras se mantiene apretado (ms). */
const REPETICION_MS = 110;
const DEMORA_INICIAL_MS = 220;

/**
 * Control compartido de HueTetris/HueColumns: izquierda/derecha (con
 * auto-repetición mientras se mantiene apretado), rotar (un solo toque) y
 * caída rápida (mientras se mantiene apretado, sube la velocidad de caída;
 * al soltar vuelve a la normal del nivel) + caída dura opcional (un toque,
 * cae de golpe). Mismo criterio de control para los dos juegos — pedido
 * explícito del usuario ("con el mismo sistema").
 */
export function ControlesCaida({
  onIzquierda,
  onDerecha,
  onRotar,
  onCaidaRapida,
  onCaidaDura,
  color,
  colorFondo,
}: {
  onIzquierda: () => void;
  onDerecha: () => void;
  onRotar: () => void;
  onCaidaRapida: (activa: boolean) => void;
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
      {boton('chevron-forward', () => iniciarRepeticion(onDerecha), limpiarRepeticion, 'der')}
      {boton('sync', onRotar, undefined, 'rot')}
      {boton('chevron-down', () => onCaidaRapida(true), () => onCaidaRapida(false), 'suave')}
      {boton('chevron-down-circle', onCaidaDura, undefined, 'dura')}
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
