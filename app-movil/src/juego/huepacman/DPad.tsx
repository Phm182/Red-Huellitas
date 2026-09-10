import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Direccion } from './motor';
import { hapticLeve } from '../../utils/haptics';

type Props = {
  onDireccion: (dir: Direccion) => void;
  color: string;
  colorFondo: string;
};

/**
 * Control en pantalla: complemento/fallback del swipe (ver el gesto en
 * `huepacman.tsx`) — mismo `onDireccion` de destino para los dos, así que
 * usar uno u otro (o combinarlos) da exactamente el mismo resultado.
 * Necesario además para accesibilidad: no todo el mundo puede o quiere
 * deslizar sobre el tablero para jugar.
 */
export function DPad({ onDireccion, color, colorFondo }: Props) {
  const boton = (dir: Direccion, icono: keyof typeof Ionicons.glyphMap, estilo: object) => (
    <Pressable
      onPress={() => {
        hapticLeve();
        onDireccion(dir);
      }}
      style={[styles.boton, estilo, { backgroundColor: colorFondo }]}
      hitSlop={6}
    >
      <Ionicons name={icono} size={20} color={color} />
    </Pressable>
  );

  return (
    <View style={styles.contenedor}>
      {boton('arriba', 'caret-up', styles.arriba)}
      {boton('izquierda', 'caret-back', styles.izquierda)}
      {boton('derecha', 'caret-forward', styles.derecha)}
      {boton('abajo', 'caret-down', styles.abajo)}
    </View>
  );
}

// Achicado de 168/54 a esto — reportado en vivo en el celular: con el
// tamaño grande el botón "abajo" quedaba cortado por la barra de tabs de la
// app (overlay fijo abajo de toda pantalla, ver el comentario en
// `huepacman.tsx` donde se lo corre a la izquierda además de achicarlo acá).
const LADO = 128;
const BOTON = 42;

const styles = StyleSheet.create({
  contenedor: { width: LADO, height: LADO, alignSelf: 'center' },
  boton: { position: 'absolute', width: BOTON, height: BOTON, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  arriba: { left: (LADO - BOTON) / 2, top: 0 },
  abajo: { left: (LADO - BOTON) / 2, bottom: 0 },
  izquierda: { left: 0, top: (LADO - BOTON) / 2 },
  derecha: { right: 0, top: (LADO - BOTON) / 2 },
});
