import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Casilla } from '../../types/hueplay';
import { useTheme } from '../../theme/ThemeProvider';
import { PiezaAjedrez, TipoPieza } from './PiezaAjedrez';
import { PiezaComida } from './PiezaComida';

/** Una pieza con identidad estable (`id`), para que animar "mover" no la reemplace. */
export interface PiezaActivaAjedrez {
  id: string;
  fila: number;
  col: number;
  lado: 1 | 2;
  tipo: TipoPieza;
}

export interface PiezaComiendoseAjedrez extends PiezaActivaAjedrez {
  onTerminada: () => void;
}

type Props = {
  piezas: PiezaActivaAjedrez[];
  piezasComiendose: PiezaComiendoseAjedrez[];
  seleccion: Casilla | null;
  destinosLegales: Casilla[];
  enJaque: Casilla | null;
  onTocarCasilla: (fila: number, col: number) => void;
  tamano: number;
};

/**
 * El tablero en sí: 64 casillas tocables de fondo + las piezas encima,
 * animadas por separado — mismo patrón que `TableroDamas`.
 */
export function TableroAjedrez({
  piezas,
  piezasComiendose,
  seleccion,
  destinosLegales,
  enJaque,
  onTocarCasilla,
  tamano,
}: Props) {
  const { colors } = useTheme();
  const celda = tamano / 8;

  const esDestino = (f: number, c: number) => destinosLegales.some((d) => d.fila === f && d.col === c);
  const esSeleccion = (f: number, c: number) => seleccion?.fila === f && seleccion?.col === c;
  const esJaque = (f: number, c: number) => enJaque?.fila === f && enJaque?.col === c;

  return (
    <View style={[styles.tablero, { width: tamano, height: tamano }]}>
      {Array.from({ length: 8 }, (_, f) =>
        Array.from({ length: 8 }, (_, c) => {
          const oscura = (f + c) % 2 === 1;
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
                  backgroundColor: oscura ? '#7B9463' : '#EDEED4',
                },
                esSeleccion(f, c) && { borderWidth: 3, borderColor: colors.primary },
                esJaque(f, c) && { borderWidth: 3, borderColor: colors.danger },
              ]}
            >
              {esDestino(f, c) ? <View style={[styles.destino, { backgroundColor: colors.primary }]} /> : null}
            </Pressable>
          );
        })
      )}

      {piezas.map((p) => (
        <PiezaAjedrez
          key={p.id}
          fila={p.fila}
          col={p.col}
          lado={p.lado}
          tipo={p.tipo}
          tamano={celda}
          resaltada={esSeleccion(p.fila, p.col)}
        />
      ))}
      {piezasComiendose.map((p) => (
        <PiezaComida
          key={p.id}
          fila={p.fila}
          col={p.col}
          lado={p.lado}
          tipo={p.tipo}
          tamano={celda}
          onTerminada={p.onTerminada}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  tablero: { position: 'relative' },
  casilla: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  destino: { width: '30%', height: '30%', borderRadius: 999, opacity: 0.85 },
});
