import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { TableroScrabbleGrid } from '../../types/hueplay';
import { fonts } from '../../theme/typography';
import { useTheme } from '../../theme/ThemeProvider';
import { RH_SCRABBLE_COLOR_PREMIO, RH_SCRABBLE_LAYOUT, RH_SCRABBLE_VALORES } from './constantes';

/** Una ficha puesta este mismo turno, todavía sin confirmar (`Jugar`). */
export interface FichaPendiente {
  fila: number;
  col: number;
  letra: string;
  esComodin: boolean;
  /** Índice en el atril de donde salió — para poder devolverla si se destoca. */
  indiceAtril: number;
}

type Props = {
  tablero: TableroScrabbleGrid;
  pendientes: FichaPendiente[];
  /** Si hay una ficha del atril armada, lista para colocarse en el próximo toque. */
  hayFichaArmada: boolean;
  onTocarCasilla: (fila: number, col: number) => void;
  tamano: number;
};

/**
 * El tablero de HueScrabble: 15x15, celdas con color de premio (o vacías) y
 * las fichas ya confirmadas + las pendientes de este turno (con un borde
 * distinto para diferenciarlas) encima.
 */
export function TableroScrabble({ tablero, pendientes, hayFichaArmada, onTocarCasilla, tamano }: Props) {
  const { colors } = useTheme();
  const celda = tamano / 15;

  const pendienteEn = (f: number, c: number) => pendientes.find((p) => p.fila === f && p.col === c);

  return (
    <View style={[styles.tablero, { width: tamano, height: tamano }]}>
      {Array.from({ length: 15 }, (_, f) =>
        Array.from({ length: 15 }, (_, c) => {
          const confirmada = tablero[f][c];
          const pendiente = pendienteEn(f, c);
          const premio = RH_SCRABBLE_LAYOUT[f][c];
          const colorPremio = RH_SCRABBLE_COLOR_PREMIO[premio];
          const vacia = !confirmada && !pendiente;

          return (
            <Pressable
              key={`${f}-${c}`}
              onPress={() => onTocarCasilla(f, c)}
              disabled={!!confirmada}
              style={[
                styles.casilla,
                {
                  width: celda,
                  height: celda,
                  left: c * celda,
                  top: f * celda,
                  backgroundColor: vacia ? colorPremio.fondo : '#F4E4C9',
                  borderColor: vacia && hayFichaArmada ? colors.primary : 'rgba(0,0,0,0.12)',
                  borderWidth: vacia && hayFichaArmada ? 1.5 : 0.5,
                },
              ]}
            >
              {vacia && colorPremio.label ? (
                <Text style={[styles.labelPremio, { color: colorPremio.texto, fontSize: Math.max(7, celda * 0.28) }]}>
                  {colorPremio.label}
                </Text>
              ) : null}
              {confirmada ? (
                <>
                  <Text style={[styles.letra, { fontSize: celda * 0.55 }]}>{confirmada.letra}</Text>
                  {!confirmada.comodin ? (
                    <Text style={[styles.valor, { fontSize: Math.max(6, celda * 0.2) }]}>
                      {confirmada.valor}
                    </Text>
                  ) : null}
                </>
              ) : pendiente ? (
                <View style={[styles.pendienteFondo, { borderColor: colors.primary }]}>
                  <Text style={[styles.letra, { fontSize: celda * 0.55, color: colors.primary }]}>
                    {pendiente.letra}
                  </Text>
                  {!pendiente.esComodin ? (
                    <Text style={[styles.valor, { fontSize: Math.max(6, celda * 0.2), color: colors.primary }]}>
                      {RH_SCRABBLE_VALORES[pendiente.letra] ?? 0}
                    </Text>
                  ) : null}
                </View>
              ) : null}
            </Pressable>
          );
        })
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  tablero: { position: 'relative', backgroundColor: '#DCCFAE' },
  casilla: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  labelPremio: { fontFamily: fonts.bodySemi },
  letra: { fontFamily: fonts.displaySemi, color: '#3A2E1F' },
  valor: { position: 'absolute', bottom: 1, right: 2, fontFamily: fonts.bodySemi, color: '#6B5A3E' },
  pendienteFondo: {
    width: '100%',
    height: '100%',
    borderRadius: 4,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
