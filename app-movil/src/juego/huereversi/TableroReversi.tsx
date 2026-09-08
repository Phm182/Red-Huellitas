import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { PiezaReversi } from './PiezaReversi';

/** Una ficha ya colocada. Sin `id`: la posición es la identidad — a
 *  diferencia de Damas, en Reversi una ficha nunca se mueve de casilla. */
export interface PiezaActivaReversi {
  fila: number;
  col: number;
  lado: 1 | 2;
}

type Props = {
  piezas: PiezaActivaReversi[];
  destinosLegales: { fila: number; col: number }[];
  onTocarCasilla: (fila: number, col: number) => void;
  tamano: number;
};

/**
 * El tablero de HueReversi: paño verde uniforme (no ajedrezado como Damas —
 * es el diseño real de un tablero de Othello), con las fichas encima.
 */
export function TableroReversi({ piezas, destinosLegales, onTocarCasilla, tamano }: Props) {
  const { colors } = useTheme();
  const celda = tamano / 8;

  const esDestino = (f: number, c: number) => destinosLegales.some((d) => d.fila === f && d.col === c);

  return (
    <View style={[styles.tablero, { width: tamano, height: tamano }]}>
      {Array.from({ length: 8 }, (_, f) =>
        Array.from({ length: 8 }, (_, c) => (
          <Pressable
            key={`${f}-${c}`}
            onPress={() => onTocarCasilla(f, c)}
            style={[styles.casilla, { width: celda, height: celda, left: c * celda, top: f * celda }]}
          >
            {esDestino(f, c) ? <View style={[styles.destino, { backgroundColor: colors.primary }]} /> : null}
          </Pressable>
        ))
      )}

      {piezas.map((p) => (
        <View
          key={`p-${p.fila}-${p.col}`}
          style={{ position: 'absolute', left: p.col * celda, top: p.fila * celda, width: celda, height: celda }}
        >
          <PiezaReversi lado={p.lado} tamano={celda} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  tablero: { position: 'relative', backgroundColor: '#2E7D46' },
  casilla: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.18)',
  },
  destino: { width: '30%', height: '30%', borderRadius: 999, opacity: 0.6 },
});
