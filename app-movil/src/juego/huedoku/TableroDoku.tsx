import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { radii } from '../../theme/elevation';
import { fonts } from '../../theme/typography';
import { useTheme } from '../../theme/ThemeProvider';
import { celdaTieneConflicto, Grilla, Puzzle } from './motor';

type Props = {
  puzzle: Puzzle;
  grilla: Grilla;
  seleccionada: { fila: number; col: number } | null;
  onSeleccionar: (fila: number, col: number) => void;
  lado: number;
};

/**
 * Grilla de HueDoku. A diferencia de HueZip (un solo gesto sobre toda la
 * grilla), acá cada celda es un `Pressable` — no hay arrastre, se toca la
 * celda y después un dígito del `TecladoDoku`.
 *
 * Las celdas que ya vienen con número desde `puzzle.pistas` no se pueden
 * tocar (son las pistas fijas); el resto se resalta en rojo apenas el
 * número puesto choca con fila/columna/caja — corregir un error no cuesta
 * nada más que volver a tocar la celda.
 */
export function TableroDoku({ puzzle, grilla, seleccionada, onSeleccionar, lado }: Props) {
  const { colors } = useTheme();
  const { n, cajaFilas, cajaCols } = puzzle;
  const celda = lado / n;

  return (
    <View style={[styles.grilla, { width: lado, height: lado, borderColor: colors.text }]}>
      {grilla.map((fila, f) =>
        fila.map((valor, c) => {
          const esPista = puzzle.pistas[f]![c] !== 0;
          const enConflicto = valor !== 0 && celdaTieneConflicto(puzzle, grilla, f, c);
          const activa = seleccionada?.fila === f && seleccionada?.col === c;
          return (
            <Pressable
              key={`${f}-${c}`}
              disabled={esPista}
              onPress={() => onSeleccionar(f, c)}
              style={[
                styles.celda,
                {
                  width: celda,
                  height: celda,
                  left: c * celda,
                  top: f * celda,
                  borderRightWidth: (c + 1) % cajaCols === 0 && c !== n - 1 ? 2.5 : StyleSheet.hairlineWidth,
                  borderBottomWidth: (f + 1) % cajaFilas === 0 && f !== n - 1 ? 2.5 : StyleSheet.hairlineWidth,
                  borderColor: colors.text,
                  backgroundColor: enConflicto
                    ? 'rgba(220,60,60,0.24)'
                    : activa
                      ? colors.primarySoft
                      : esPista
                        ? colors.border + '55'
                        : colors.surface,
                },
              ]}
            >
              {valor !== 0 ? (
                <Text
                  style={[
                    styles.numero,
                    {
                      color: enConflicto ? colors.danger : esPista ? colors.text : colors.primary,
                      fontFamily: esPista ? fonts.bodyBold : fonts.bodySemi,
                    },
                  ]}
                >
                  {valor}
                </Text>
              ) : null}
            </Pressable>
          );
        })
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  grilla: { position: 'relative', alignSelf: 'center', borderWidth: 2.5, borderRadius: radii.sm, overflow: 'hidden' },
  celda: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  numero: { fontSize: 18 },
});
