import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { CasillaDamas } from '../../types/hueplay';
import { useTheme } from '../../theme/ThemeProvider';
import { PiezaComida } from './PiezaComida';
import { PiezaDamas } from './PiezaDamas';

/** Una pieza con identidad estable (`id`), para que animar "mover" no la reemplace. */
export interface PiezaActivaDamas {
  id: string;
  fila: number;
  col: number;
  lado: 1 | 2;
  esDama: boolean;
}

export interface PiezaComiendoseDamas extends PiezaActivaDamas {
  onTerminada: () => void;
}

type Props = {
  piezas: PiezaActivaDamas[];
  piezasComiendose: PiezaComiendoseDamas[];
  seleccion: CasillaDamas | null;
  destinosLegales: CasillaDamas[];
  onTocarCasilla: (fila: number, col: number) => void;
  tamano: number;
};

/**
 * El tablero en sí: 64 casillas tocables de fondo + las piezas encima,
 * animadas por separado (`PiezaDamas` se anima solo cuando cambia su
 * fila/col, así que este componente sólo necesita decir DÓNDE está cada una
 * ahora — el deslizamiento sale gratis).
 */
export function TableroDamas({
  piezas,
  piezasComiendose,
  seleccion,
  destinosLegales,
  onTocarCasilla,
  tamano,
}: Props) {
  const { colors } = useTheme();
  const celda = tamano / 8;

  const esDestino = (f: number, c: number) => destinosLegales.some((d) => d.fila === f && d.col === c);
  const esSeleccion = (f: number, c: number) => seleccion?.fila === f && seleccion?.col === c;

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
                  backgroundColor: oscura ? '#8C5A3C' : '#F4E4C9',
                },
                esSeleccion(f, c) && { borderWidth: 3, borderColor: colors.primary },
              ]}
            >
              {esDestino(f, c) ? <View style={[styles.destino, { backgroundColor: colors.primary }]} /> : null}
            </Pressable>
          );
        })
      )}

      {piezas.map((p) => (
        <PiezaDamas
          key={p.id}
          fila={p.fila}
          col={p.col}
          lado={p.lado}
          esDama={p.esDama}
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
