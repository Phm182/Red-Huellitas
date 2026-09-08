import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { fonts } from '../../theme/typography';

export interface CasillaTaTeTi {
  fila: number;
  col: number;
}

export interface PiezaActivaTaTeTi extends CasillaTaTeTi {
  lado: 1 | 2;
}

type Props = {
  piezas: PiezaActivaTaTeTi[];
  destinosLegales: CasillaTaTeTi[];
  lineaGanadora: CasillaTaTeTi[];
  onTocarCasilla: (fila: number, col: number) => void;
  tamano: number;
};

/** X para el retador, O para el retado — mismos colores en los dos juegos que comparten tablero de 3x3. */
export const COLOR_FICHA_TATETI: Record<1 | 2, string> = {
  1: '#E8577E',
  2: '#5B9AD6',
};

/** El tablero de HueTaTeTi: grilla 3x3 simple, sin ajedrezado (es una sola cuadrícula de líneas). */
export function TableroTaTeTi({ piezas, destinosLegales, lineaGanadora, onTocarCasilla, tamano }: Props) {
  const { colors } = useTheme();
  const celda = tamano / 3;

  const piezaEn = (f: number, c: number) => piezas.find((p) => p.fila === f && p.col === c);
  const esDestino = (f: number, c: number) => destinosLegales.some((d) => d.fila === f && d.col === c);
  const enLineaGanadora = (f: number, c: number) => lineaGanadora.some((d) => d.fila === f && d.col === c);

  return (
    <View style={[styles.tablero, { width: tamano, height: tamano, backgroundColor: colors.surface }]}>
      {Array.from({ length: 3 }, (_, f) =>
        Array.from({ length: 3 }, (_, c) => {
          const pieza = piezaEn(f, c);
          const ganadora = enLineaGanadora(f, c);
          return (
            <Pressable
              key={`${f}-${c}`}
              onPress={() => onTocarCasilla(f, c)}
              style={[
                styles.casilla,
                {
                  width: celda,
                  height: celda,
                  left: c * celda,
                  top: f * celda,
                  borderRightWidth: c < 2 ? 2 : 0,
                  borderBottomWidth: f < 2 ? 2 : 0,
                  borderColor: colors.border,
                  backgroundColor: ganadora ? colors.primarySoft : 'transparent',
                },
              ]}
            >
              {pieza ? (
                <Text
                  style={[
                    styles.ficha,
                    { fontSize: celda * 0.55, color: COLOR_FICHA_TATETI[pieza.lado] },
                  ]}
                >
                  {pieza.lado === 1 ? '✕' : '○'}
                </Text>
              ) : esDestino(f, c) ? (
                <View style={[styles.destino, { backgroundColor: colors.textMuted }]} />
              ) : null}
            </Pressable>
          );
        })
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  tablero: { position: 'relative', borderRadius: 12, overflow: 'hidden' },
  casilla: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  ficha: { fontFamily: fonts.displaySemi },
  destino: { width: '18%', height: '18%', borderRadius: 999, opacity: 0.35 },
});
